import { randomBytes } from "node:crypto";

import { removeUpload, storeUpload } from "@/lib/blobStore";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { readImageSize } from "@/lib/authPanel";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
/** Tighter than the product uploaders: this picture renders 64px at most. */
const MAX_BYTES = 4 * 1024 * 1024;
const MIN_SIDE = 64;
const MAX_SIDE = 4096;

/**
 * What actually gets stored, whatever arrives: a 512px square. Plenty for a
 * 64px avatar on any screen density, and downsampling here with a proper
 * filter is what keeps a phone screenshot from turning to mush at 64px —
 * next/image then only ever shrinks a clean square.
 */
const AVATAR_SIZE = 512;

/**
 * Takes the signed-in visitor's new avatar, writes it, and points their row
 * at it in one request — unlike the admin uploaders there is no separate
 * save step for a member to forget.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chưa chọn ảnh" }, { status: 400 });
  }

  if (!TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Chỉ nhận ảnh PNG, JPG hoặc WebP" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Ảnh tối đa ${MAX_BYTES / 1024 / 1024}MB. File này ${(
          file.size /
          1024 /
          1024
        ).toFixed(1)}MB.`,
      },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // The header is read, not the Content-Type trusted: a browser labels
  // anything image/png on request, and this is the only check on the bytes.
  const size = readImageSize(bytes);
  if (!size) {
    return NextResponse.json(
      { error: "Không đọc được ảnh — file có thể bị hỏng" },
      { status: 400 },
    );
  }
  if (size.width < MIN_SIDE || size.height < MIN_SIDE) {
    return NextResponse.json(
      { error: `Ảnh tối thiểu ${MIN_SIDE}×${MIN_SIDE}px. Ảnh này ${size.width}×${size.height}px.` },
      { status: 400 },
    );
  }
  if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
    return NextResponse.json(
      { error: `Ảnh tối đa ${MAX_SIDE}px mỗi chiều.` },
      { status: 400 },
    );
  }

  // EXIF-rotate (phone photos arrive sideways), crop square from the centre,
  // downsample with a real filter, and re-encode — so what lands on disk is
  // always a clean 512px WebP with the metadata stripped. Small originals
  // stay their size instead of being blown up blurry.
  const processed = await sharp(bytes, {
    limitInputPixels: MAX_SIDE * MAX_SIDE,
  })
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 92 })
    .toBuffer()
    .catch(() => null);
  if (!processed) {
    return NextResponse.json(
      { error: "Không đọc được ảnh — file có thể bị hỏng" },
      { status: 400 },
    );
  }

  // Never the client's filename — it can carry path separators. The uid
  // prefix keeps the folder browsable; the random tail busts every cache.
  const name = `${user.uid}-${randomBytes(8).toString("hex")}.webp`;
  const storedUrl = await storeUpload("avatars", name, processed, file.type);

  const avatarUrl = storedUrl;
  await db.user.update({ where: { id: user.id }, data: { avatarUrl } });

  // The replaced file goes with the replacement. removeUpload only touches an
  // address this module wrote, so a doctored avatarUrl cannot aim it
  // elsewhere, and it never throws — the row is already correct.
  if (user.avatarUrl && user.avatarUrl !== avatarUrl) {
    await removeUpload(user.avatarUrl);
  }

  return NextResponse.json({ avatarUrl });
}
