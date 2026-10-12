/**
 * The shop's paid shortlink service, used to hand a free tool's key out
 * behind one of its links (the owner, 12/10/2026: "lấy key bằng cách vượt
 * link rút gọn", "link rút gọn có tiền").
 *
 * The services (link4m, yeumoney and the like) all offer the same thing: an
 * HTTP GET carrying the member's API key and the long URL, answered with JSON
 * that names the short URL. The exact address sits behind each member area,
 * so the admin pastes it into Cấu hình with {api} and {url} where the key and
 * the long URL go, and this fills them in. No shortlink service is spoken to
 * by name here, so switching services is a paste, not a release.
 */

export const SHORTLINK_TIMEOUT_MS = 10_000;

export type ShortlinkSettings = {
  shortlinkApiTemplate: string;
  shortlinkApiKey: string;
};

/** Set up enough to use: a {url} slot, and a key when the template asks for one. */
export function shortlinkConfigured(settings: ShortlinkSettings): boolean {
  const template = settings.shortlinkApiTemplate.trim();
  if (!template.includes("{url}")) return false;
  return (
    !template.includes("{api}") || settings.shortlinkApiKey.trim().length > 0
  );
}

export function fillShortlinkTemplate(
  template: string,
  apiKey: string,
  longUrl: string,
): string {
  return template
    .trim()
    .replace(/\{api\}/g, encodeURIComponent(apiKey.trim()))
    .replace(/\{url\}/g, encodeURIComponent(longUrl));
}

const URL_SHAPE = /^https?:\/\/\S+$/i;
const URL_KEYS = [
  "shortenedUrl",
  "shortened_url",
  "shortUrl",
  "short_url",
  "shortlink",
  "short",
  "url",
  "link",
];

function findUrl(value: unknown, depth: number): string | null {
  if (depth > 3 || !value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of URL_KEYS) {
    const v = record[key];
    if (typeof v === "string" && URL_SHAPE.test(v.trim())) return v.trim();
  }
  for (const v of Object.values(record)) {
    const inner = findUrl(v, depth + 1);
    if (inner) return inner;
  }
  return null;
}

/**
 * The short URL inside a service's answer: a bare URL, or JSON holding one
 * under one of the usual names (shortenedUrl, short_url, url, …), looked for
 * a few levels down since some wrap it in a data object.
 */
export function readShortlinkResponse(body: string): string | null {
  const text = body.trim();
  if (!text) return null;
  if (URL_SHAPE.test(text)) return text;
  try {
    return findUrl(JSON.parse(text) as unknown, 0);
  } catch {
    return null;
  }
}

export type ShortenResult =
  { ok: true; url: string } | { ok: false; error: string };

/** Ask the service for a short link to `longUrl`; never throws. */
export async function shortenUrl(
  longUrl: string,
  settings: ShortlinkSettings,
): Promise<ShortenResult> {
  if (!shortlinkConfigured(settings))
    return { ok: false, error: "NOT_CONFIGURED" };
  const target = fillShortlinkTemplate(
    settings.shortlinkApiTemplate,
    settings.shortlinkApiKey,
    longUrl,
  );
  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(SHORTLINK_TIMEOUT_MS),
      headers: { accept: "application/json, text/plain;q=0.9, */*;q=0.5" },
      cache: "no-store",
      // A redirect is a refusal, not a link: link4m answers a localhost
      // address by bouncing to it, which would otherwise be followed.
      redirect: "manual",
    });
    const body = await res.text();
    const url = readShortlinkResponse(body);
    // The service's own words ride along, for the log: "Invalid API key",
    // a refused address, a quota, each reads differently.
    if (!res.ok || !url) {
      return {
        ok: false,
        error: `BAD_RESPONSE:${res.status}:${body.replace(/\s+/g, " ").slice(0, 160)}`,
      };
    }
    // An error answer that echoes the address it was given is not a link.
    if (url === longUrl) return { ok: false, error: "UNSHORTENED" };
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error: `FETCH:${(error as Error).message ?? "unknown"}`,
    };
  }
}
