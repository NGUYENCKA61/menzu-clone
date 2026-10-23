import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A browser that answered an admin sign-in code is trusted for a while: it
 * signs in with the password alone until the cookie set at /verify runs out
 * (the owner, 23/10/2026: "bỏ cái xác minh admin đi mệt quá", after a code on
 * every sign-in). The cookie is signed, not stored: user id, expiry and a
 * digest over both plus the password hash, so a changed password or an
 * expired date ends the trust, and nothing in the cookie can be forged
 * without the server's secret.
 */
export const ADMIN_TRUST_COOKIE = `${process.env.SESSION_COOKIE_NAME || "menzu_session"}_admin_trust`;
export const ADMIN_TRUST_DAYS = 30;

function secretOf(given?: string): string {
  return given ?? process.env.DATABASE_URL ?? "admin-trust";
}

function sign(userId: string, exp: number, passwordHash: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`admin-trust-v1:${userId}:${exp}:${passwordHash}`)
    .digest("hex");
}

export function issueAdminTrust(input: {
  userId: string;
  passwordHash: string;
  secret?: string;
  now?: number;
}): { value: string; expires: Date } {
  const exp = (input.now ?? Date.now()) + ADMIN_TRUST_DAYS * 24 * 60 * 60 * 1000;
  const mac = sign(input.userId, exp, input.passwordHash, secretOf(input.secret));
  return { value: `${input.userId}.${exp}.${mac}`, expires: new Date(exp) };
}

export function adminTrusted(input: {
  cookie: string | null | undefined;
  userId: string;
  passwordHash: string;
  secret?: string;
  now?: number;
}): boolean {
  if (!input.cookie) return false;
  const [userId, expText, mac] = input.cookie.split(".");
  if (!userId || !expText || !mac || userId !== input.userId) return false;
  const exp = Number(expText);
  if (!Number.isInteger(exp) || exp <= (input.now ?? Date.now())) return false;
  const want = sign(userId, exp, input.passwordHash, secretOf(input.secret));
  const a = Buffer.from(mac);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** One cookie out of a request's Cookie header, or null. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}
