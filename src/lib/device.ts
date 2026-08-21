import "server-only";

import { db } from "@/lib/db";

/**
 * What the "Quản lý thiết bị" list knows about a login: a name a person
 * recognises, parsed from the User-Agent, and a town, resolved from the IP.
 */

/** "Chrome trên Windows 10/11" out of a raw User-Agent header. */
export function describeUserAgent(ua: string | null): string {
  if (!ua) return "Thiết bị không xác định";

  // Order matters: Edge and Opera both carry "Chrome/", and everything
  // WebKit carries "Safari/".
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Trình duyệt";

  // Windows 11 reports the same "NT 10.0" as Windows 10 on purpose (UA
  // freezing), so the label owns the ambiguity instead of guessing.
  const os = /Windows NT 10/.test(ua)
    ? "Windows 10/11"
    : /Windows NT 6\.3/.test(ua)
      ? "Windows 8.1"
      : /Windows NT 6\.1/.test(ua)
        ? "Windows 7"
        : /Windows/.test(ua)
          ? "Windows"
          : /iPhone|iPad/.test(ua)
            ? "iOS"
            : /Android/.test(ua)
              ? "Android"
              : /Mac OS X/.test(ua)
                ? "macOS"
                : /Linux/.test(ua)
                  ? "Linux"
                  : "thiết bị lạ";

  return `${browser} trên ${os}`;
}

/** Loopback and RFC1918 ranges — nothing a geo service could say about them. */
function isPrivateIp(ip: string): boolean {
  return (
    ip === "" ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/**
 * Fills in the session's "Thốt Nốt, Vietnam" — deliberately not awaited by
 * callers: signing in must never wait on a third-party lookup, and a failed
 * lookup just leaves the column null. ip-api.com, no key, 45 req/min free —
 * plenty for a shop's login rate.
 */
export async function resolveSessionLocation(
  sessionId: string,
  ip: string,
): Promise<void> {
  if (isPrivateIp(ip)) return;
  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,country`,
      { signal: AbortSignal.timeout(4000) },
    );
    const data = (await response.json()) as {
      status?: string;
      city?: string;
      country?: string;
    };
    if (data.status !== "success") return;
    const location = [data.city, data.country].filter(Boolean).join(", ");
    if (!location) return;
    await db.session.update({ where: { id: sessionId }, data: { location } });
  } catch {
    // Location is decoration; the session works without it.
  }
}
