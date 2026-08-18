import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { extensionFor, readImageSize } from "@/lib/authPanel";

/**
 * Local disk under /public, like every other uploader here. Self-hosted only;
 * a read-only serverless filesystem would need object storage instead — that
 * change lives in this one function.
 */
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "accounts");

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Floors, not targets. The card draws this picture a few hundred pixels wide
 * and the detail gallery at half the viewport, so anything under this is
 * visibly soft — but an inventory screenshot straight off a phone passes.
 */
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const MAX_SIDE = 8000;

/**
 * Takes an account picture and answers with the path to store in
 * Product.imageUrl. It does not write the product — the admin screen PATCHes
 * the returned URL, keeping upload and save separate as everywhere else.
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

  // The header is read, not the Content-Type trusted: a browser labels anything
  // image/png on request, and this is the only check on what the bytes are.
  const size = readImageSize(bytes);
  if (!size) {
    return NextResponse.json({ error: "Không đọc được ảnh — file có thể bị hỏng" }, { status: 400 });
  }
  if (size.width < MIN_WIDTH || size.height < MIN_HEIGHT) {
    return NextResponse.json(
      { error: `Ảnh tối thiểu ${MIN_WIDTH}×${MIN_HEIGHT}px. Ảnh này ${size.width}×${size.height}px.` },
      { status: 400 },
    );
  }
  if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
    return NextResponse.json({ error: `Ảnh tối đa ${MAX_SIDE}px mỗi chiều.` }, { status: 400 });
  }

  // Never the client's filename — it can carry path separators.
  const name = `${randomBytes(12).toString("hex")}${extensionFor(file.type)}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), bytes);

  return NextResponse.json({ url: `/uploads/accounts/${name}`, width: size.width, height: size.height });
}
