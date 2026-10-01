import { randomBytes } from "node:crypto";

import { storeUpload } from "@/lib/blobStore";
import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { extensionFor, readImageSize } from "@/lib/authPanel";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Floors, not targets. The tile draws the picture at about 266×190 and the
 * detail pages larger, so anything under this is visibly soft — but the
 * sign-in panel's 600×600 minimum would reject perfectly usable cover art.
 */
const MIN_WIDTH = 320;
const MIN_HEIGHT = 180;
const MAX_SIDE = 8000;
/** A logo is drawn small and square, so a small square file is enough. */
const LOGO_MIN_SIDE = 64;

/**
 * Takes a cover image and answers with the path to store.
 *
 * It does not write the category. Uploading and saving are separate so the
 * admin sees the picture in the preview first and can still walk away from it,
 * which is how every other field on that screen behaves.
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

  // The header is read rather than the Content-Type trusted. A browser will
  // label anything image/png on request, and this is the only check that looks
  // at what the bytes actually are.
  const size = readImageSize(bytes);
  if (!size) {
    return NextResponse.json(
      { error: "Không đọc được ảnh — file có thể bị hỏng" },
      { status: 400 },
    );
  }
  // The "Logo game" slot sends slot=logo and takes a small square file; the
  // cover and the banner keep the cover's floor.
  const logo = form?.get("slot") === "logo";
  const minWidth = logo ? LOGO_MIN_SIDE : MIN_WIDTH;
  const minHeight = logo ? LOGO_MIN_SIDE : MIN_HEIGHT;
  if (size.width < minWidth || size.height < minHeight) {
    return NextResponse.json(
      {
        error: `Ảnh tối thiểu ${minWidth}×${minHeight}px. Ảnh này ${size.width}×${size.height}px.`,
      },
      { status: 400 },
    );
  }
  if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
    return NextResponse.json(
      { error: `Ảnh tối đa ${MAX_SIDE}px mỗi chiều.` },
      { status: 400 },
    );
  }

  // The client's filename is never used: it can carry path separators, and a
  // name like "../../x" would escape the upload directory.
  const name = `${randomBytes(12).toString("hex")}${extensionFor(file.type)}`;

  const storedUrl = await storeUpload("categories", name, bytes, file.type);

  return NextResponse.json({
    url: storedUrl,
    width: size.width,
    height: size.height,
  });
}
