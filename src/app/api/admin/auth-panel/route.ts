import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import {
  checkAuthImageFile,
  checkAuthImageSize,
  extensionFor,
  readImageSize,
} from "@/lib/authPanel";

/**
 * Where the sign-in artwork lands.
 *
 * The local disk under /public, matching the trade-screenshot uploader already
 * on this site. That works for a self-hosted shop and not on a read-only
 * serverless filesystem; moving to object storage means changing this function
 * and nothing else.
 */
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "auth");

/**
 * Accepts a new panel image and returns the path the settings should store.
 *
 * It does not write the setting. Uploading and saving are separate on purpose:
 * the admin sees the new picture in the preview first and can still abandon it
 * by leaving the page, exactly as the other fields on that screen behave.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chưa chọn ảnh" }, { status: 400 });
  }

  const byMeta = checkAuthImageFile({ type: file.type, size: file.size });
  if (!byMeta.ok) return NextResponse.json({ error: byMeta.error }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());

  // The header is read rather than the Content-Type trusted. A browser will
  // happily label anything image/png, and this is the only check that looks at
  // what the file actually is.
  const size = readImageSize(bytes);
  const byPixels = checkAuthImageSize(size);
  if (!byPixels.ok) return NextResponse.json({ error: byPixels.error }, { status: 400 });

  // The client's filename is never used: it can carry path separators, and a
  // name like "../../x" would escape the upload directory.
  const name = `${randomBytes(12).toString("hex")}${extensionFor(file.type)}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), bytes);

  return NextResponse.json({
    url: `/uploads/auth/${name}`,
    width: size!.width,
    height: size!.height,
  });
}
