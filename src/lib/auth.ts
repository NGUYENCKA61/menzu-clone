import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
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

/** Constant-time verification. Returns false for any malformed stored value. */
export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

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

/** Minimum viable validation, mirroring what the live form accepts. */
export function validateCredentials(
  username: string,
  password: string,
): string | null {
  if (username.trim().length < 3) {
    return "Tên đăng nhập phải có ít nhất 3 ký tự";
  }
  if (password.length < 6) {
    return "Mật khẩu phải có ít nhất 6 ký tự";
  }
  return null;
}
