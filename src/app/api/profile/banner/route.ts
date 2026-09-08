import { randomBytes } from "node:crypto";

import { removeUpload, storeUpload } from "@/lib/blobStore";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { readImageSize } from "@/lib/authPanel";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
/** A cover is a bigger picture than a face, and people pick wallpapers. */
const MAX_BYTES = 8 * 1024 * 1024;
const MIN_WIDTH = 640;
const MIN_HEIGHT = 240;
const MAX_SIDE = 6000;

/**
 * What gets stored, whatever arrives: a 1600×600 landscape crop.
 *
 * The card draws it at most 960px wide on a 2× screen, so this is the widest
 * it can ever be asked for, and cropping here means a portrait phone photo
 * lands as a banner instead of being squashed into one by the browser.
 */
const BANNER_WIDTH = 1600;
const BANNER_HEIGHT = 600;

/**
 * Takes the signed-in visitor's own cover picture for the overview page.
 *
 * The same one-request shape as the avatar route: the file is written and the
 * row points at it before the response returns, so a member never has a
 * separate save step to forget. DELETE puts the page back to the shop's own
 * banner rather than leaving a hole.
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
    return NextResponse.json({ error: "Chỉ nhận ảnh PNG, JPG hoặc WebP" }, { status: 400 });
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

  // The header, not the Content-Type: a browser labels anything image/png on
  // request, and this is the only check on the bytes themselves.
  const size = readImageSize(bytes);
  if (!size) {
    return NextResponse.json(
      { error: "Không đọc được ảnh — file có thể bị hỏng" },
      { status: 400 },
    );
  }
  if (size.width < MIN_WIDTH || size.height < MIN_HEIGHT) {
    return NextResponse.json(
      {
        error: `Ảnh bìa tối thiểu ${MIN_WIDTH}×${MIN_HEIGHT}px. Ảnh này ${size.width}×${size.height}px.`,
      },
      { status: 400 },
    );
  }
  if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
    return NextResponse.json({ error: `Ảnh tối đa ${MAX_SIDE}px mỗi chiều.` }, { status: 400 });
  }

  // EXIF-rotate (phone photos arrive sideways), crop to the banner's shape
  // from the centre, downsample with a real filter, strip the metadata.
  const processed = await sharp(bytes, { limitInputPixels: MAX_SIDE * MAX_SIDE })
    .rotate()
    .resize(BANNER_WIDTH, BANNER_HEIGHT, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 86 })
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
  const bannerUrl = await storeUpload("banners", name, processed, file.type);

  const previous = (
    await db.user.findUnique({ where: { id: user.id }, select: { bannerUrl: true } })
  )?.bannerUrl;
  await db.user.update({ where: { id: user.id }, data: { bannerUrl } });

  // The replaced file goes with the replacement. removeUpload only touches an
  // address this module wrote, and never throws — the row is already correct.
  if (previous && previous !== bannerUrl) await removeUpload(previous);

  return NextResponse.json({ bannerUrl });
}

/** Back to the shop's banner. The member's own file goes with the row. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const previous = (
    await db.user.findUnique({ where: { id: user.id }, select: { bannerUrl: true } })
  )?.bannerUrl;
  if (!previous) return NextResponse.json({ bannerUrl: null });

  await db.user.update({ where: { id: user.id }, data: { bannerUrl: null } });
  await removeUpload(previous);
  return NextResponse.json({ bannerUrl: null });
}
