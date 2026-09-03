import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Serves /uploads/* from disk on every request.
 *
 * A production Next server lists public/ once, when it starts, and never
 * looks again — so a picture the admin uploads after that answers 404 from
 * Next itself. On the VPS Caddy serves the folder straight from disk for
 * visitors, but next/image fetches its source through Next's own server on
 * localhost, and there the snapshot still ruled: every image uploaded after
 * the container started came back 400 from the optimiser. This handler is
 * what Next falls through to when the file is not in its snapshot, and it
 * reads the disk as it is now.
 */

const ROOT = path.join(process.cwd(), "public", "uploads");

/** Only what the uploaders write; anything else on the disk is not served. */
const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  // Each segment must be a plain file or folder name: no traversal, no
  // absolute paths, nothing the join could turn into a step outside ROOT.
  if (parts.length === 0 || parts.some((part) => !/^[\w.-]+$/.test(part) || part.startsWith("."))) {
    return new Response(null, { status: 404 });
  }
  const file = path.join(ROOT, ...parts);
  if (!file.startsWith(ROOT + path.sep)) return new Response(null, { status: 404 });

  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new Response(null, { status: 404 });

  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return new Response(null, { status: 404 });

  return new Response(Readable.toWeb(createReadStream(file)) as unknown as ReadableStream, {
    headers: {
      "content-type": type,
      "content-length": String(info.size),
      // Every uploader names its file with random bytes and never overwrites.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
