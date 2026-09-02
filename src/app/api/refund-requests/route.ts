import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { announceToAdmins } from "@/lib/announcementStore";
import { readImageSize } from "@/lib/authPanel";
import { storeUpload } from "@/lib/blobStore";
import { db } from "@/lib/db";
import { readReason, refundBlockedReason } from "@/lib/refundRequests";
import { getCurrentUser } from "@/lib/session";

/** Same discipline as the review uploader: bytes checked, EXIF stripped,
 *  re-encoded — never the client's file or its filename. */
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 64;
const MAX_SIDE = 8192;
/** A ban screenshot reads fine at this width and the page never draws one
 *  wider. */
const MAX_STORED_WIDTH = 1400;

/**
 * A signed-in buyer asks for one of their own orders back.
 *
 * Multipart rather than JSON because the evidence rides along with the words:
 * a screenshot of the ban message is most of what makes a request answerable,
 * and asking for it in a second request would lose it whenever the first
 * succeeded and the second did not.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const code = String(form.get("code") ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Thiếu mã đơn" }, { status: 400 });
  }

  const said = readReason(form.get("reason"));
  if (!said.ok) {
    return NextResponse.json({ error: said.error }, { status: 400 });
  }

  // Scoped to this buyer, so a guessed order code belonging to somebody else
  // answers 404 rather than confirming it exists.
  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    select: {
      id: true,
      status: true,
      createdAt: true,
      product: { select: { name: true, code: true } },
      refundRequests: {
        where: { status: "PENDING" },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }

  // Checked here and not only in the form: the window is the shop's promise,
  // and a promise enforced by a disabled button is not enforced.
  const blocked = refundBlockedReason({
    orderStatus: order.status,
    openRequest: order.refundRequests.length > 0,
    purchasedAt: order.createdAt,
    now: new Date(),
  });
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 400 });
  }

  let imageUrl: string | null = null;
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (!TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Ảnh chỉ nhận PNG, JPG hoặc WebP" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `Ảnh tối đa 5MB. File này ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
        },
        { status: 400 },
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const size = readImageSize(bytes);
    if (!size || size.width < MIN_SIDE || size.height < MIN_SIDE) {
      return NextResponse.json(
        { error: "Không đọc được ảnh — file có thể bị hỏng" },
        { status: 400 },
      );
    }
    if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
      return NextResponse.json(
        { error: `Ảnh tối đa ${MAX_SIDE}px mỗi chiều.` },
        { status: 400 },
      );
    }

    const processed = await sharp(bytes, { limitInputPixels: MAX_SIDE * MAX_SIDE })
      .rotate()
      .resize(MAX_STORED_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
      .catch(() => null);
    if (!processed) {
      return NextResponse.json(
        { error: "Không đọc được ảnh — file có thể bị hỏng" },
        { status: 400 },
      );
    }

    const filename = `${user.uid}-${randomBytes(8).toString("hex")}.webp`;
    imageUrl = await storeUpload("refunds", filename, processed, "image/webp");
  }

  const created = await db.refundRequest.create({
    data: {
      orderId: order.id,
      userId: user.id,
      reason: said.reason,
      imageUrl,
    },
    select: { id: true },
  });

  // The desk hears about it on the bell. Awaited so a failure to write the
  // notice cannot land after the response — but it swallows its own errors,
  // so the buyer's request never fails over a notification.
  await announceToAdmins({
    title: "Yêu cầu hoàn trả mới",
    body:
      `${user.username} vừa gửi yêu cầu hoàn trả cho đơn ${code} — ` +
      `${order.product.name ?? order.product.code}.\n` +
      `Bấm "Xem ngay" để đọc lý do và trả lời.`,
    // Somebody is waiting on their money; this belongs above the week's
    // maintenance notice on the bell.
    priority: "HIGH",
    // Straight to the request. Telling the desk where to navigate and then
    // making it navigate there by hand is half a notification.
    cta: { label: "Xem ngay", href: `/admin/refunds/${created.id}` },
  });

  return NextResponse.json({ ok: true });
}
