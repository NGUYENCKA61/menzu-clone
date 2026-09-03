import { randomBytes } from "node:crypto";

import { storeUpload } from "@/lib/blobStore";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { readImageSize } from "@/lib/authPanel";
import { announceToAdmins } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";

/** Backs the homepage reviews carousel. Approved rows only — a submission
 *  is invisible everywhere until an admin lets it through. */
export async function GET() {
  const items = await db.feedback.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    items: items.map((f) => ({
      name: f.anonymous ? "Khách hàng ẩn danh" : f.name,
      body: f.body,
      avatarUrl: f.anonymous ? null : f.avatarUrl,
      amount: Number(f.amount),
      verified: f.verified,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}

/** The chip on the card is one of these, nothing free-form. */
const SERVICES = new Set(["MUA KEY", "MUA ACC", "NẠP TIỀN", "KHÁC"]);

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
/** The form says "max 5MB" — bill screenshots run bigger than avatars. */
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 64;
const MAX_SIDE = 8192;
/** Stored width cap. A transfer bill reads fine at this size and the page
 *  never renders one wider. */
const MAX_STORED_WIDTH = 1400;

/**
 * A signed-in customer submits a review. It lands with approved=false and
 * waits for the admin's Duyệt on /admin/operations — the submit page says so.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để gửi đánh giá" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim().slice(0, 50);
  const service = String(form.get("service") ?? "");
  const rating = Number(form.get("rating"));
  const amountRaw = String(form.get("amount") ?? "0").replace(/[^\d]/g, "");
  const body = String(form.get("body") ?? "").trim().slice(0, 1000);
  const anonymous = form.get("anonymous") === "1";

  if (!name) {
    return NextResponse.json({ error: "Nhập tên hiển thị" }, { status: 400 });
  }
  if (!SERVICES.has(service)) {
    return NextResponse.json({ error: "Chọn dịch vụ bạn đã dùng" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Chọn số sao từ 1 đến 5" }, { status: 400 });
  }
  const amount = BigInt(amountRaw || "0");
  if (amount > 1_000_000_000n) {
    return NextResponse.json({ error: "Trị giá giao dịch không hợp lệ" }, { status: 400 });
  }

  // One review in the queue per account. Stops a held-down submit button —
  // and a spammer — from flooding the moderation list.
  const waiting = await db.feedback.count({
    where: { userId: user.id, approved: false },
  });
  if (waiting > 0) {
    return NextResponse.json(
      { error: "Bạn đã có đánh giá đang chờ duyệt. Chờ admin duyệt xong nhé." },
      { status: 429 },
    );
  }

  // Optional attachment. Same discipline as the avatar uploader: bytes are
  // checked, EXIF stripped, re-encoded — never the client's file or filename.
  let imageUrl: string | null = null;
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (!TYPES.has(file.type)) {
      return NextResponse.json({ error: "Ảnh chỉ nhận PNG, JPG hoặc WebP" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Ảnh tối đa 5MB. File này ${(file.size / 1024 / 1024).toFixed(1)}MB.` },
        { status: 400 },
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const size = readImageSize(bytes);
    if (!size || size.width < MIN_SIDE || size.height < MIN_SIDE) {
      return NextResponse.json({ error: "Không đọc được ảnh — file có thể bị hỏng" }, { status: 400 });
    }
    if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
      return NextResponse.json({ error: `Ảnh tối đa ${MAX_SIDE}px mỗi chiều.` }, { status: 400 });
    }

    const processed = await sharp(bytes, { limitInputPixels: MAX_SIDE * MAX_SIDE })
      .rotate()
      .resize(MAX_STORED_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
      .catch(() => null);
    if (!processed) {
      return NextResponse.json({ error: "Không đọc được ảnh — file có thể bị hỏng" }, { status: 400 });
    }

    const filename = `${user.uid}-${randomBytes(8).toString("hex")}.webp`;
    imageUrl = await storeUpload("feedback", filename, processed, "image/webp");
  }

  await db.feedback.create({
    data: {
      name,
      // Real avatar stored even for anonymous rows — getFeedback masks on the
      // way out, the admin still sees who is behind the mask.
      avatarUrl: user.avatarUrl,
      body,
      amount,
      rating,
      service,
      imageUrl,
      anonymous,
      approved: false,
      verified: false,
      userId: user.id,
    },
  });

  // The desk hears about it twice — on the admin bell, and in each channel
  // admin's own Telegram chat — because a review waits for a person, and a
  // person who is not told does not come. Neither can fail the submission:
  // the review is saved above, and both helpers swallow their own errors.
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const excerpt = body.length > 140 ? `${body.slice(0, 140)}…` : body;
  await announceToAdmins({
    title: "Đánh giá mới cần duyệt",
    body:
      `${name} — ${stars}\n"${excerpt}"\n` +
      `Chưa hiện ngoài shop. Bấm "Duyệt ngay" để duyệt hoặc ẩn.`,
    priority: "HIGH",
    days: 14,
    cta: { label: "Duyệt ngay", href: "/admin/operations" },
  });
  await notifyTelegramAdmins(
    [
      "📝 <b>Đánh giá mới cần duyệt</b>",
      `${escapeTelegramHtml(name)} — ${stars}`,
      `"${escapeTelegramHtml(excerpt)}"`,
      `🔗 ${absoluteUrl("/admin/operations")}`,
    ].join("\n"),
  );

  return NextResponse.json({ ok: true });
}
