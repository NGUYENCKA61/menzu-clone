import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { announceToAdmins } from "@/lib/announcementStore";
import { readImageSize } from "@/lib/authPanel";
import { storeUpload } from "@/lib/blobStore";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";
import { getCurrentUser } from "@/lib/session";
import {
  readDescription,
  readIssue,
  WARRANTY_ISSUE,
  warrantyBlockedReason,
} from "@/lib/warrantyRequests";

/** Same discipline as the refund uploader: bytes checked, EXIF stripped,
 *  re-encoded — never the client's file or its filename. */
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 64;
const MAX_SIDE = 8192;
const MAX_STORED_WIDTH = 1400;

/**
 * A signed-in buyer reports that one of their own orders is not working.
 *
 * Multipart, like the refund request, because the screenshot of the error is
 * most of what makes the report answerable and should travel with the words.
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

  const picked = readIssue(form.get("issue"));
  if (!picked.ok) {
    return NextResponse.json({ error: picked.error }, { status: 400 });
  }
  const said = readDescription(form.get("description"));
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
      product: { select: { name: true, code: true } },
      warrantyRequests: {
        where: { status: { not: "RESOLVED" } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }

  // Checked here and not only in the form: a rule enforced by a disabled
  // button is not enforced.
  const blocked = warrantyBlockedReason({
    orderStatus: order.status,
    openRequest: order.warrantyRequests.length > 0,
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
    imageUrl = await storeUpload("warranty", filename, processed, "image/webp");
  }

  await db.warrantyRequest.create({
    data: {
      orderId: order.id,
      userId: user.id,
      issue: picked.issue,
      description: said.description,
      imageUrl,
    },
    select: { id: true },
  });

  // The desk hears about it on the bell. Awaited so a failure to write the
  // notice cannot land after the response — but it swallows its own errors,
  // so the buyer's report never fails over a notification.
  await announceToAdmins({
    title: "Yêu cầu bảo hành mới",
    body:
      `${user.username} vừa báo lỗi đơn ${code} — ` +
      `${order.product.name ?? order.product.code}: ${WARRANTY_ISSUE[picked.issue].label}.\n` +
      `Bấm "Xem ngay" để đọc mô tả và xử lý.`,
    // Somebody paid and cannot use what they bought; this belongs above the
    // week's maintenance notice on the bell.
    priority: "HIGH",
    cta: { label: "Xem ngay", href: "/admin/warranty" },
  });
  await notifyTelegramAdmins(
    [
      "🛠 <b>Yêu cầu bảo hành mới</b>",
      `${escapeTelegramHtml(user.username)} · đơn ${escapeTelegramHtml(code)}`,
      escapeTelegramHtml(
        `${order.product.name ?? order.product.code} — ${WARRANTY_ISSUE[picked.issue].label}`,
      ),
      `🔗 ${absoluteUrl("/admin/warranty")}`,
    ].join("\n"),
  );

  return NextResponse.json({ ok: true });
}
