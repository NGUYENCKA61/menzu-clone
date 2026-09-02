import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { readImageSize } from "@/lib/authPanel";
import { storeUpload } from "@/lib/blobStore";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
/** A floor, not a target — under this it is visibly soft even at wedge size. */
const MIN_SIDE = 64;
const MAX_SIDE = 8000;
/**
 * What it is stored at.
 *
 * The wedge draws it 12 units wide in a 100-unit box, so on a 520px wheel the
 * picture lands at about 62px — 256 is generous for a retina screen and still
 * a file that loads with the page rather than after it.
 */
const STORED = 256;

/**
 * Takes the picture for one wedge and answers with the path to store on the
 * prize.
 *
 * Re-encoded to WebP with the alpha kept: prize art is a mousepad or a coin on
 * nothing, and flattening it would put a white card in the middle of a dark
 * wedge. Squared by fitting rather than cropping — a wedge is not square and
 * a crop would decide which half of the mousepad the shop meant.
 *
 * It does not write the prize. The editor PATCHes the returned URL, keeping
 * upload and save separate as everywhere else here.
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
        error: `Ảnh tối đa 5MB. File này ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
      },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // The header is read, not the Content-Type trusted: a browser labels
  // anything image/png on request, and this is the only check on what the
  // bytes actually are.
  const size = readImageSize(bytes);
  if (!size) {
    return NextResponse.json(
      { error: "Không đọc được ảnh — file có thể bị hỏng" },
      { status: 400 },
    );
  }
  if (size.width < MIN_SIDE || size.height < MIN_SIDE) {
    return NextResponse.json(
      { error: `Ảnh tối thiểu ${MIN_SIDE}×${MIN_SIDE}px.` },
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
    .resize(STORED, STORED, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer()
    .catch(() => null);
  if (!processed) {
    return NextResponse.json(
      { error: "Không đọc được ảnh — file có thể bị hỏng" },
      { status: 400 },
    );
  }

  // Never the client's filename — it can carry path separators.
  const name = `${randomBytes(12).toString("hex")}.webp`;
  const url = await storeUpload("prizes", name, processed, "image/webp");

  return NextResponse.json({ url });
}
