import "server-only";

import { randomBytes } from "node:crypto";

import sharp from "sharp";

import { readImageSize } from "@/lib/authPanel";
import { storeUpload } from "@/lib/blobStore";

/** Same discipline as the refund uploader: bytes checked, EXIF stripped,
 *  re-encoded — never the client's file or its filename. */
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 64;
const MAX_SIDE = 8192;
const MAX_STORED_WIDTH = 1400;

export type StoredImage = { ok: true; url: string | null } | { ok: false; error: string };

/**
 * A screenshot a buyer attached to a warranty report or to a message on one:
 * checked, re-encoded to WebP and stored. Nothing attached is fine — the url
 * is null.
 */
export async function storeWarrantyImage(
  file: FormDataEntryValue | null,
  uid: number,
): Promise<StoredImage> {
  if (!(file instanceof File) || file.size === 0) return { ok: true, url: null };

  if (!TYPES.has(file.type)) {
    return { ok: false, error: "Ảnh chỉ nhận PNG, JPG hoặc WebP" };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Ảnh tối đa 5MB. File này ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
    };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const size = readImageSize(bytes);
  if (!size || size.width < MIN_SIDE || size.height < MIN_SIDE) {
    return { ok: false, error: "Không đọc được ảnh, file có thể bị hỏng" };
  }
  if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
    return { ok: false, error: `Ảnh tối đa ${MAX_SIDE}px mỗi chiều.` };
  }

  const processed = await sharp(bytes, { limitInputPixels: MAX_SIDE * MAX_SIDE })
    .rotate()
    .resize(MAX_STORED_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
    .catch(() => null);
  if (!processed) {
    return { ok: false, error: "Không đọc được ảnh, file có thể bị hỏng" };
  }

  const filename = `${uid}-${randomBytes(8).toString("hex")}.webp`;
  return { ok: true, url: await storeUpload("warranty", filename, processed, "image/webp") };
}
