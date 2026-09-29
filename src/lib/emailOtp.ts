import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The email check on Bảo mật, as menzu has it: "Gửi mã OTP" mails a six-digit
 * code, and typing it back proves the address. Shared by the send and verify
 * routes.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** How long a mailed code works. */
export const OTP_TTL_MINUTES = 10;

/** Between two sends to one account, so a finger on the button is not a flood. */
export const SEND_COOLDOWN_SECONDS = 60;

/** Sends per account per hour: enough for typos, too few to mail-bomb anyone. */
export const SENDS_PER_HOUR = 5;

/** Wrong codes (or wrong passwords on a change) one code survives. */
export const MAX_ATTEMPTS = 5;

/**
 * What is stored for a code: bound to the account and the address, so a code
 * mailed to one address can never confirm another, and a database read shows
 * no code at all.
 */
export function hashCode(userId: string, email: string, code: string): string {
  return createHash("sha256").update(`${userId}:${email.toLowerCase()}:${code}`).digest("hex");
}

/** Constant-time compare of two hex digests of equal length. */
export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
