import { describe, expect, it } from "vitest";

import {
  AUTH_IMAGE_MAX_BYTES,
  checkAuthImageFile,
  checkAuthImageSize,
  extensionFor,
  readImageSize,
} from "@/lib/authPanel";

/** A PNG header: signature, IHDR length and tag, then width and height. */
function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(b.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return b;
}

/** A JPEG with one filler segment before the frame, so the scan has to walk. */
function jpeg(width: number, height: number): Uint8Array {
  const b = new Uint8Array(40);
  b.set([0xff, 0xd8]);
  // APP0, length 8 — skipped over.
  b.set([0xff, 0xe0, 0x00, 0x08, 0, 0, 0, 0, 0, 0], 2);
  // SOF0: length, precision, height, width.
  b.set([0xff, 0xc0, 0x00, 0x11, 0x08], 12);
  const view = new DataView(b.buffer);
  view.setUint16(17, height);
  view.setUint16(19, width);
  return b;
}

function webpVp8x(width: number, height: number): Uint8Array {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46]); // RIFF
  b.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  b.set([0x56, 0x50, 0x38, 0x58], 12); // VP8X
  const w = width - 1;
  const h = height - 1;
  b.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24);
  b.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27);
  return b;
}

describe("readImageSize", () => {
  it("reads a PNG", () => {
    expect(readImageSize(png(1200, 1600))).toEqual({ width: 1200, height: 1600 });
  });

  it("reads a JPEG past its other segments", () => {
    // The frame is not the first thing in the file, so a reader that only
    // looks at a fixed offset gets whatever happened to be there.
    expect(readImageSize(jpeg(800, 1200))).toEqual({ width: 800, height: 1200 });
  });

  it("reads an extended WebP", () => {
    // Its dimensions are stored minus one, which is the easy thing to get
    // wrong by a pixel in each direction.
    expect(readImageSize(webpVp8x(1080, 1920))).toEqual({ width: 1080, height: 1920 });
  });

  it("returns nothing for anything else", () => {
    expect(readImageSize(new Uint8Array(0))).toBeNull();
    expect(readImageSize(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    // A PDF that arrived labelled image/png.
    expect(readImageSize(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBeNull();
    // Truncated PNG: the signature matches but the header is not all there.
    expect(readImageSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });
});

describe("checkAuthImageFile", () => {
  it("takes the three formats", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      expect(checkAuthImageFile({ type, size: 1000 }).ok).toBe(true);
    }
  });

  it("refuses anything else", () => {
    expect(checkAuthImageFile({ type: "image/gif", size: 1000 }).ok).toBe(false);
    expect(checkAuthImageFile({ type: "application/pdf", size: 1000 }).ok).toBe(false);
    expect(checkAuthImageFile({ type: "", size: 1000 }).ok).toBe(false);
  });

  it("refuses an empty or oversized file", () => {
    expect(checkAuthImageFile({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(
      checkAuthImageFile({ type: "image/png", size: AUTH_IMAGE_MAX_BYTES + 1 }).ok,
    ).toBe(false);
    expect(checkAuthImageFile({ type: "image/png", size: AUTH_IMAGE_MAX_BYTES }).ok).toBe(true);
  });
});

describe("checkAuthImageSize", () => {
  it("takes a picture big enough to fill the panel", () => {
    expect(checkAuthImageSize({ width: 600, height: 600 }).ok).toBe(true);
    expect(checkAuthImageSize({ width: 1080, height: 1920 }).ok).toBe(true);
  });

  it("refuses one that cover would have to enlarge", () => {
    expect(checkAuthImageSize({ width: 599, height: 900 }).ok).toBe(false);
    expect(checkAuthImageSize({ width: 900, height: 599 }).ok).toBe(false);
  });

  it("refuses an absurd one", () => {
    expect(checkAuthImageSize({ width: 20000, height: 900 }).ok).toBe(false);
  });

  it("refuses a file whose header would not read", () => {
    // Not an image, whatever its Content-Type claimed.
    expect(checkAuthImageSize(null).ok).toBe(false);
  });
});

describe("extensionFor", () => {
  it("comes from the type, never the filename", () => {
    // The client's name can be "x.php" or "../../y"; only the type decides.
    expect(extensionFor("image/png")).toBe(".png");
    expect(extensionFor("image/webp")).toBe(".webp");
    expect(extensionFor("image/jpeg")).toBe(".jpg");
  });
});
