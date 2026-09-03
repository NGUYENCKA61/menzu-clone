import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { readImageSize } from "@/lib/authPanel";
import { storeUpload } from "@/lib/blobStore";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 32;
const MAX_SIDE = 8192;
/** The notice sheet is ~560px wide, the /thong-bao column ~720; 1600 covers dense screens. */
const MAX_STORED_WIDTH = 1600;

/**
 * Takes the illustration for a notice and returns the public URL the form
 * saves as `imageUrl`. Same checks and re-encoding as every other picture
 * the desk uploads — the bytes are never stored as they arrived.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chưa chọn ảnh" }, { status: 400 });
  }

  if (!TYPES.has(file.type)) {
    return NextResponse.json({ error: "Chỉ nhận ảnh PNG, JPG hoặc WebP" }, { status: 400 });
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
    return NextResponse.json(
      { error: "Không đọc được ảnh — file có thể bị hỏng" },
      { status: 400 },
    );
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
    return NextResponse.json(
      { error: "Không đọc được ảnh — file có thể bị hỏng" },
      { status: 400 },
    );
  }

  const name = `notice-${randomBytes(8).toString("hex")}.webp`;
  const url = await storeUpload("announcements", name, processed, "image/webp");

  return NextResponse.json({ url });
}
