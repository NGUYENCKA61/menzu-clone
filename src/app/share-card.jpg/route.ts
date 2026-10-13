import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { absoluteUrl } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";
import {
  publicFilePath,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
} from "@/lib/shareCardImage";

/**
 * The default share picture: the current hero banner, cropped to 1200x630
 * and re-encoded as a JPEG of a couple of hundred kilobytes (the owner's SEO
 * review, 13/10/2026). Every page with no picture of its own points its
 * og:image here (lib/shareCard.ts), with ?v= naming the banner so a new one
 * reaches the chat apps' caches; the query is not read here, the banner in
 * Cấu hình is.
 *
 * Read per request, so an admin change to the banner flows through, and
 * cropped once per banner: the result is kept in memory under the banner's
 * address until the address changes.
 */

export const runtime = "nodejs";
// The settings live in the database, which the Docker build cannot reach.
export const dynamic = "force-dynamic";

/** The banner is a picture the shop uploaded; anything bigger is not one. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

let cropped: { source: string; body: Promise<Buffer> } | null = null;

async function readSource(source: string): Promise<Buffer> {
  // A site path (/uploads/..., /sites/...) is read from public/ on disk.
  const file = publicFilePath(source, path.join(process.cwd(), "public"));
  if (file) {
    try {
      return await readFile(file);
    } catch {
      // Not on this disk (a file Caddy serves from elsewhere): fetch it.
    }
  }
  const url = absoluteUrl(source);
  if (!/^https?:\/\//i.test(url)) throw new Error("banner is not an address");
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`banner answered ${res.status}`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_SOURCE_BYTES) {
    throw new Error("banner too large");
  }
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_SOURCE_BYTES) throw new Error("banner too large");
  return body;
}

async function crop(source: string): Promise<Buffer> {
  const input = await readSource(source);
  return sharp(input)
    .rotate()
    // "attention" keeps the busiest part of the picture in frame, which for
    // a banner is the artwork and its words rather than the sky above them.
    .resize(SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

export async function GET() {
  const { heroBanner } = await getShopSettings();
  const source = heroBanner.trim();
  if (!source) return new Response(null, { status: 404 });

  let entry = cropped;
  if (!entry || entry.source !== source) {
    entry = { source, body: crop(source) };
    cropped = entry;
  }

  try {
    const body = await entry.body;
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(body.length),
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    // Forget the failure so the next request tries again, and send this one
    // to the banner as it is: a heavy card picture beats none at all.
    if (cropped === entry) cropped = null;
    console.error("[share-card] could not crop the hero banner:", error);
    return new Response(null, {
      status: 307,
      headers: { location: absoluteUrl(source), "cache-control": "no-store" },
    });
  }
}
