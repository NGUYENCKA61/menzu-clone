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
      // Not followed. The allowlist above is checked against the address that
      // was typed, and a redirect is the allowed host telling this server to
      // go and fetch some other address instead — which is the allowlist
      // handing its own key away, and the shape a request-forgery attack
      // takes. A genuine CDN answers the image directly.
      redirect: "manual",
    });
  } catch {
    return { ok: false, error: "Không tải được ảnh — quá thời gian chờ hoặc bị chặn" };
  }

  if (res.status >= 300 && res.status < 400) {
    return {
      ok: false,
      error: "Link này chuyển hướng sang nơi khác — dùng link ảnh trực tiếp.",
    };
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

  // A source that declares no length still must not be able to stream an
  // unbounded body into this process's memory, so the read is capped as it
  // happens rather than measured after it finishes.
  const reader = res.body?.getReader();
  if (!reader) return { ok: false, error: "Nguồn không trả về dữ liệu ảnh" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      return {
        ok: false,
        error: `Ảnh tối đa ${MAX_BYTES / 1024 / 1024}MB — ảnh này lớn hơn.`,
      };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return inspectImage(bytes, type);
}
