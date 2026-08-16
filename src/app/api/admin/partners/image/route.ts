import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { extensionFor, readImageSize } from "@/lib/authPanel";

/**
 * Local disk under /public, like every other uploader on this site. Works
 * self-hosted; moving to object storage means changing this one function.
 */
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "partners");

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Looser floors than the cover uploaders: a partner mark is drawn 36px tall
 * in the strip, and plenty of real logo files are small and wide. The ceiling
 * still keeps a stray wallpaper out.
 */
const MIN_WIDTH = 48;
const MIN_HEIGHT = 24;
const MAX_SIDE = 4000;

/** Takes a logo and answers with the path to store on the partner. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chưa chọn ảnh" }, { status: 400 });
  }

  if (!TYPES.has(file.type)) {
    return NextResponse.json({ error: "Chỉ nhận PNG, JPG hoặc WebP" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Logo tối đa ${MAX_BYTES / 1024 / 1024}MB` },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // The header is read rather than the Content-Type trusted — the only check
  // that looks at what the bytes actually are.
  const size = readImageSize(bytes);
  if (!size) {
    return NextResponse.json({ error: "Không đọc được ảnh" }, { status: 400 });
  }
  if (size.width < MIN_WIDTH || size.height < MIN_HEIGHT) {
    return NextResponse.json(
      { error: `Logo tối thiểu ${MIN_WIDTH}×${MIN_HEIGHT}px` },
      { status: 400 },
    );
  }
  if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
    return NextResponse.json(
      { error: `Logo tối đa ${MAX_SIDE}px mỗi chiều` },
      { status: 400 },
    );
  }

  // Never the client's filename — it can carry path separators.
  const name = `${randomBytes(12).toString("hex")}${extensionFor(file.type)}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), bytes);

  return NextResponse.json({ url: `/uploads/partners/${name}` });
}
