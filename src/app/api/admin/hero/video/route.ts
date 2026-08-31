import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { blobStoreIsRemote, storeUpload } from "@/lib/blobStore";
import { prepareHeroVideo } from "@/lib/heroVideo";

/** Where the transcode does its work before the file is stored for real. */
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "hero");

/** mp4 and webm — the two containers every current browser plays muted. */
const EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

/**
 * Generous but bounded: the hero is the first thing every visitor downloads,
 * so a video past this size is a page-speed problem before it is a storage
 * one — the error says so instead of just refusing.
 */
const MAX_BYTES = 200 * 1024 * 1024;

/**
 * What the bytes actually are, ignoring the label the browser put on them.
 * MP4-family files carry "ftyp" at offset 4; webm opens with the EBML magic.
 */
function looksLikeVideo(bytes: Uint8Array): boolean {
  const ftyp =
    bytes.length > 11 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70;
  const ebml =
    bytes.length > 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3;
  return ftyp || ebml;
}

/**
 * Takes a hero video, compresses it server-side, and answers with the path
 * to store in settings plus what happened to the file (see prepareHeroVideo
 * for the three outcomes). Heavy inputs hold this request open for however
 * long the encode takes — minutes, not seconds — which is fine self-hosted
 * and spares the admin from ever shipping a 100MB hero by accident.
 *
 * It does not write the setting — uploading and saving stay separate, like
 * every picker on the settings screen, so the admin can still walk away
 * before pressing Lưu.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chưa chọn video" }, { status: 400 });
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Chỉ nhận video MP4 hoặc WebM" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Video tối đa ${MAX_BYTES / 1024 / 1024}MB — file này ${(
          file.size /
          1024 /
          1024
        ).toFixed(0)}MB. Hero là thứ khách tải đầu tiên, hãy nén video trước.`,
      },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikeVideo(bytes)) {
    return NextResponse.json(
      { error: "File không phải video MP4/WebM hợp lệ" },
      { status: 400 },
    );
  }

  // The stored name comes out of prepareHeroVideo as random hex — never the
  // client's filename, which can carry path separators.
  //
  // This one still goes through the disk on its way out, because the
  // transcode itself needs real files to hand to ffmpeg. When a bucket is
  // configured the finished file is copied up and the local copy is left
  // behind as a build artefact; the URL the shop stores is the bucket's.
  const prepared = await prepareHeroVideo(bytes, extension, UPLOAD_DIR);
  const localPath = join(UPLOAD_DIR, prepared.fileName);
  const url = blobStoreIsRemote()
    ? await storeUpload(
        "hero",
        prepared.fileName,
        new Uint8Array(await readFile(localPath)),
        prepared.fileName.endsWith(".webm") ? "video/webm" : "video/mp4",
      )
    : `/uploads/hero/${prepared.fileName}`;

  return NextResponse.json({
    url,
    mode: prepared.mode,
    inBytes: file.size,
    outBytes: prepared.outBytes,
  });
}
