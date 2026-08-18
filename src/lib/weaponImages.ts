import "server-only";

import { readImageSize } from "@/lib/authPanel";

/**
 * The library's lookup key for a weapon name.
 *
 * Lowercased with runs of whitespace collapsed, because both sides of the join
 * are typed by hand: the skin list on an account and the name on the picture.
 * Without this, "M200  Dominator" and "m200 dominator" are two different
 * weapons and the shop is left wondering why the image did not appear.
 */
export function weaponKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Hosts a picture may be fetched from.
 *
 * An allowlist rather than "any URL", because this hands an address to the
 * server and asks it to open it: without one, a pasted `http://localhost:5432`
 * or a cloud metadata address would be fetched from inside the network, where
 * nothing is meant to be reachable from outside. These two are where the
 * pictures actually live — the game wikis' image CDN and the Valorant asset
 * host the account data was scraped from.
 *
 * Anything else is refused with the list named, and the upload-from-disk path
 * covers a picture found somewhere not on it.
 */
const ALLOWED_HOSTS = ["static.wikia.nocookie.net", "media.valorant-api.com"];

/** Host suffixes, so any wiki's image subdomain resolves without listing each. */
const ALLOWED_SUFFIXES = [".wikia.nocookie.net"];

export const ALLOWED_HOSTS_LABEL = ALLOWED_HOSTS.join(" · ");

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Weapon pictures are thumbnails — the wiki's M200 is 9KB at 256×128. The cap
 * is far above anything real so it never gets in the way, and low enough that a
 * mistyped URL pointing at a video cannot be pulled into the library.
 */
const MAX_BYTES = 4 * 1024 * 1024;
const MIN_SIDE = 32;
const MAX_SIDE = 4000;

const TIMEOUT_MS = 10_000;

export interface FetchedImage {
  bytes: Uint8Array;
  type: string;
  width: number;
  height: number;
}

export type FetchResult =
  | { ok: true; image: FetchedImage }
  | { ok: false; error: string };

/**
 * Validate an image's bytes and read its dimensions.
 *
 * Shared by both ways in, because a file off a disk deserves the same checks as
 * one off a CDN: the declared type is never trusted, only the header is read.
 */
export function inspectImage(bytes: Uint8Array, type: string): FetchResult {
  if (!TYPES.has(type)) {
    return { ok: false, error: "Chỉ nhận ảnh PNG, JPG hoặc WebP" };
  }
  if (bytes.byteLength > MAX_BYTES) {
    return {
      ok: false,
      error: `Ảnh tối đa ${MAX_BYTES / 1024 / 1024}MB. Ảnh này ${(
        bytes.byteLength / 1024 / 1024
      ).toFixed(1)}MB.`,
    };
  }

  const size = readImageSize(bytes);
  if (!size) {
    return { ok: false, error: "Không đọc được ảnh — file có thể bị hỏng" };
  }
  if (size.width < MIN_SIDE || size.height < MIN_SIDE) {
    return {
      ok: false,
      error: `Ảnh quá nhỏ (tối thiểu ${MIN_SIDE}px). Ảnh này ${size.width}×${size.height}px.`,
    };
  }
  if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
    return { ok: false, error: `Ảnh tối đa ${MAX_SIDE}px mỗi chiều.` };
  }

  return { ok: true, image: { bytes, type, width: size.width, height: size.height } };
}

/**
 * Download a weapon picture from an allowed host.
 *
 * The wiki pages themselves sit behind Cloudflare and refuse a server outright,
 * which is why this takes the address of an image rather than the name of a
 * weapon: the image CDN serves anyone, so once the URL is in hand there is
 * nothing left to get past.
 */
export async function fetchWeaponImage(rawUrl: string): Promise<FetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Link không hợp lệ" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Chỉ nhận link https" };
  }

  const host = url.hostname.toLowerCase();
  const allowed =
    ALLOWED_HOSTS.includes(host) || ALLOWED_SUFFIXES.some((s) => host.endsWith(s));
  if (!allowed) {
    return {
      ok: false,
      error: `Chỉ tải ảnh từ: ${ALLOWED_HOSTS_LABEL}. Ảnh ở nơi khác thì lưu về máy rồi dùng "Chọn từ máy".`,
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      // Some CDNs answer a bare programmatic request differently from a browser
      // one; this is the same request Chrome would make for an <img>.
      headers: { accept: "image/*", "user-agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
  } catch {
    return { ok: false, error: "Không tải được ảnh — quá thời gian chờ hoặc bị chặn" };
  }

  if (!res.ok) {
    return { ok: false, error: `Nguồn trả về lỗi ${res.status} — kiểm tra lại link ảnh` };
  }

  // Declared length first, so an oversized body is refused before it is read
  // into memory rather than after.
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    return {
      ok: false,
      error: `Ảnh tối đa ${MAX_BYTES / 1024 / 1024}MB. Ảnh này ${(
        declared / 1024 / 1024
      ).toFixed(1)}MB.`,
    };
  }

  const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  const bytes = new Uint8Array(await res.arrayBuffer());
  return inspectImage(bytes, type);
}
