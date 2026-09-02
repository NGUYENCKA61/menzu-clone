import "server-only";

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;
const SALT_LEN = 16;

/**
 * Password hashing with Node's built-in scrypt — no native dependency, and
 * scrypt is memory-hard so it resists GPU cracking far better than a plain
 * hash. Format: `scrypt$<saltHex>$<keyHex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/**
 * The old site's hash for a password, or null when the shape is not one.
 *
 * The imported accounts carry `sha1md5$<40 hex>`: the old PHP site stored
 * `sha1(md5(password))`, established by finding the recipe that reproduced the
 * hashes of hundreds of common passwords in the exported table. Double-hashing
 * an unsalted digest is the hashing of about 2010 and is not defensible in
 * 2026, so it is accepted here only for as long as it takes each of those
 * people to sign in once — the alternative was telling 8,477 customers to reset
 * a password they still know. There is no pepper: the recipe above verified
 * without one.
 */
function legacyHash(password: string, algorithm: string): Buffer | null {
  if (algorithm !== "sha1md5") return null;
  const md5 = createHash("md5").update(password, "utf8").digest("hex");
  return createHash("sha1").update(md5, "utf8").digest();
}

/** True when this hash is one of the old site's and wants replacing. */
export function isLegacyHash(stored: string | null): boolean {
  return Boolean(stored) && !stored!.startsWith("scrypt$");
}

/** Constant-time verification. Returns false for any malformed stored value. */
export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) {
    // Two parts is an imported hash: `<algorithm>$<hex>`.
    if (parts.length !== 2) return false;
    const expected = Buffer.from(parts[1], "hex");
    const actual = legacyHash(password, parts[0]);
    if (!actual || actual.length !== expected.length || expected.length === 0) return false;
    return timingSafeEqual(actual, expected);
  }
  if (parts[0] !== "scrypt") return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return false;

  const actual = await scryptAsync(password, salt, KEY_LEN);
  return timingSafeEqual(actual, expected);
}

/** Opaque 256-bit session token. */
export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export const SESSION_COOKIE = "menzu_session";
export const SESSION_TTL_DAYS = 30;

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** The longest a name may be — a ceiling, so one row cannot be a paragraph. */
const USERNAME_MAX = 32;

/**
 * Minimum viable validation, mirroring what the live form accepts.
 *
 * The one rule that is not about length: a username may not look like an
 * email address. Sign-in and "Quên mật khẩu" both accept either, and match on
 * whichever row turns up first, so a name registered as somebody else's
 * address made that person's own sign-in a coin toss between two accounts.
 * Refusing the shape at the door is what keeps the two namespaces apart.
 */
export function validateCredentials(
  username: string,
  password: string,
): string | null {
  const name = username.trim();
  if (name.length < 3) {
    return "Tên đăng nhập phải có ít nhất 3 ký tự";
  }
  if (name.length > USERNAME_MAX) {
    return `Tên đăng nhập tối đa ${USERNAME_MAX} ký tự`;
  }
  if (name.includes("@")) {
    return "Tên đăng nhập không được chứa ký tự @";
  }
  if (password.length < 6) {
    return "Mật khẩu phải có ít nhất 6 ký tự";
  }
  return null;
}
