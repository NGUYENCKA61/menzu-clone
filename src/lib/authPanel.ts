/**
 * Checking the picture behind the sign-in card.
 *
 * Pure: an upload endpoint decides whether a file is allowed onto the shop's
 * disk, and that decision deserves to be tested without a disk.
 */

/** What the panel accepts. Matches the trade-screenshot uploader already here. */
export const AUTH_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Twelve megabytes — higher than the five the screenshot uploader allows.
 *
 * The file is stored byte for byte: nothing here resizes or re-encodes it, so
 * whatever is uploaded is what Next optimises from, and a sharper source is a
 * sharper panel. Five megabytes is enough for a screenshot and not for a
 * full-resolution photograph, and a cap that forces the shop to compress
 * before uploading defeats the point of asking for quality.
 */
export const AUTH_IMAGE_MAX_BYTES = 12 * 1024 * 1024;

/**
 * The panel is half a card and roughly twice as tall as it is wide, drawn with
 * object-cover. A small picture is not rejected for being small in principle —
 * it is rejected because cover will enlarge it to fill that space and the
 * result is visibly soft.
 */
export const AUTH_IMAGE_MIN_WIDTH = 600;
export const AUTH_IMAGE_MIN_HEIGHT = 600;
/** A ceiling as well, so a 20000px panorama cannot be handed to the browser. */
export const AUTH_IMAGE_MAX_SIDE = 8000;

export type ImageCheck = { ok: true } | { ok: false; error: string };

/** Type and size, which are known before the bytes are read. */
export function checkAuthImageFile(file: { type: string; size: number }): ImageCheck {
  if (!AUTH_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: "Chỉ nhận ảnh JPG, PNG hoặc WebP." };
  }
  if (file.size <= 0) return { ok: false, error: "File rỗng." };
  if (file.size > AUTH_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Ảnh tối đa ${AUTH_IMAGE_MAX_BYTES / 1024 / 1024}MB. File này ${(
        file.size /
        1024 /
        1024
      ).toFixed(1)}MB.`,
    };
  }
  return { ok: true };
}

/** Dimensions, once the header has been read. */
export function checkAuthImageSize(size: { width: number; height: number } | null): ImageCheck {
  if (!size) {
    // Refused rather than waved through: a file whose header cannot be read is
    // not the image it claims to be, whatever its Content-Type said.
    return { ok: false, error: "Không đọc được kích thước ảnh. File có thể đã hỏng." };
  }
  if (size.width < AUTH_IMAGE_MIN_WIDTH || size.height < AUTH_IMAGE_MIN_HEIGHT) {
    return {
      ok: false,
      error: `Ảnh tối thiểu ${AUTH_IMAGE_MIN_WIDTH}×${AUTH_IMAGE_MIN_HEIGHT}px. Ảnh này ${size.width}×${size.height}px.`,
    };
  }
  if (size.width > AUTH_IMAGE_MAX_SIDE || size.height > AUTH_IMAGE_MAX_SIDE) {
    return {
      ok: false,
      error: `Ảnh tối đa ${AUTH_IMAGE_MAX_SIDE}px mỗi chiều. Ảnh này ${size.width}×${size.height}px.`,
    };
  }
  return { ok: true };
}

/**
 * Width and height straight out of the file header.
 *
 * Hand-rolled rather than pulled from a library: three formats, a few dozen
 * bytes each, against a dependency that would ship a decoder for forty. It
 * reads only the header — the pixels are never decoded, so a malicious file
 * cannot get anywhere by being enormous.
 *
 * Returns null for anything it does not recognise, which the caller treats as
 * a refusal.
 */
export function readImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  return readPng(bytes) ?? readJpeg(bytes) ?? readWebp(bytes);
}

function u32be(b: Uint8Array, at: number): number {
  return ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0;
}

function u16be(b: Uint8Array, at: number): number {
  return (b[at]! << 8) | b[at + 1]!;
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readPng(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 24) return null;
  if (!PNG_MAGIC.every((byte, i) => b[i] === byte)) return null;
  // IHDR is always the first chunk, and its width and height sit at 16 and 20.
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

function readJpeg(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  let at = 2;
  while (at + 9 < b.length) {
    if (b[at] !== 0xff) {
      at += 1;
      continue;
    }
    const marker = b[at + 1]!;
    // Padding and standalone markers carry no length field.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      at += 2;
      continue;
    }
    const length = u16be(b, at + 2);
    // Every start-of-frame marker puts height then width right after the
    // length and the precision byte. The excluded ones in these ranges are
    // DHT, JPG and DAC, which are not frames.
    const isFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isFrame) {
      return { height: u16be(b, at + 5), width: u16be(b, at + 7) };
    }
    if (length < 2) return null;
    at += 2 + length;
  }
  return null;
}

function ascii(b: Uint8Array, at: number, len: number): string {
  return String.fromCharCode(...b.slice(at, at + len));
}

function readWebp(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 30) return null;
  if (ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;

  const chunk = ascii(b, 12, 4);

  // Extended form, which is what an image with alpha or animation carries.
  if (chunk === "VP8X") {
    return {
      width: 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16)),
      height: 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16)),
    };
  }

  // Lossy: a three-byte start code, then 14 bits of each dimension.
  if (chunk === "VP8 ") {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return {
      width: (b[26]! | (b[27]! << 8)) & 0x3fff,
      height: (b[28]! | (b[29]! << 8)) & 0x3fff,
    };
  }

  // Lossless: 14 bits each, packed across bytes 21 to 24 after a signature.
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }

  return null;
}

/** The extension a stored file gets, chosen from the type and never the name. */
export function extensionFor(type: string): string {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  return ".jpg";
}
