import "server-only";

import { db } from "@/lib/db";

/**
 * Rate limiting for the credential endpoints.
 *
 * Sign-in uses two independent windows, both of which must pass:
 *
 *  - per identifier — the real protection. An attacker guessing one account's
 *    password cannot dodge this by rotating addresses.
 *  - per IP — defence in depth against spraying many accounts from one host.
 *    Deliberately looser, because a school, office or café shares one address
 *    and a tight limit would lock out honest users.
 *
 * Neither is a substitute for a strong password; both exist to make online
 * guessing impractically slow.
 */

const WINDOW_MS = 5 * 60 * 1000;
const MAX_LOGIN_PER_IDENTIFIER = 8;
const MAX_LOGIN_PER_IP = 30;

/**
 * Failures before sign-in starts demanding the CAPTCHA (when the shop has
 * configured one). Below this the widget never appears: an honest customer
 * mistyping once should not be made to click pictures, and a bot gets at
 * most this many free guesses per window before the wall goes up.
 */
export const CAPTCHA_AFTER_FAILURES = 3;

/**
 * Accounts created from one address before sign-up starts demanding the
 * CAPTCHA. A household making its first account or two never sees it; a
 * device farming accounts meets it on the third within the hour window.
 */
export const CAPTCHA_AFTER_REGISTRATIONS = 2;

/** Sign-ups are capped per address only — there is no prior identity to key on. */
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTER_PER_IP = 5;

/**
 * Reset links are capped tighter than sign-ups: each one lands in somebody's
 * inbox, so an attacker replaying the form is spending the shop's sending
 * reputation and filling a victim's mailbox at the same time.
 */
const RESET_WINDOW_MS = 60 * 60 * 1000;
const MAX_RESET_PER_IDENTIFIER = 3;
const MAX_RESET_PER_IP = 10;

/** How long a caller is told to wait once a window is full. */
export const RETRY_AFTER_SECONDS = Math.ceil(WINDOW_MS / 1000);
export const REGISTER_RETRY_AFTER_SECONDS = Math.ceil(REGISTER_WINDOW_MS / 1000);

export interface RateLimitResult {
  blocked: boolean;
  /** Attempts left on the tighter of the two windows, for the response body. */
  remaining: number;
  /** Failed tries in this identifier's window, for the CAPTCHA threshold. */
  failures: number;
}

export async function checkLoginRate(
  identifier: string,
  ip: string,
): Promise<RateLimitResult> {
  const createdAt = { gte: new Date(Date.now() - WINDOW_MS) };
  const key = identifier.toLowerCase();

  const [byIdentifier, byIp] = await Promise.all([
    db.authAttempt.count({ where: { kind: "LOGIN", identifier: key, createdAt } }),
    db.authAttempt.count({ where: { kind: "LOGIN", ip, createdAt } }),
  ]);

  return {
    blocked:
      byIdentifier >= MAX_LOGIN_PER_IDENTIFIER || byIp >= MAX_LOGIN_PER_IP,
    remaining: Math.max(0, MAX_LOGIN_PER_IDENTIFIER - byIdentifier),
    failures: byIdentifier,
  };
}

export async function checkRegisterRate(ip: string): Promise<RateLimitResult> {
  const count = await db.authAttempt.count({
    where: {
      kind: "REGISTER",
      ip,
      createdAt: { gte: new Date(Date.now() - REGISTER_WINDOW_MS) },
    },
  });

  return {
    blocked: count >= MAX_REGISTER_PER_IP,
    remaining: Math.max(0, MAX_REGISTER_PER_IP - count),
    failures: count,
  };
}

export async function checkResetRate(

  identifier: string,
  ip: string,
): Promise<RateLimitResult> {
  const createdAt = { gte: new Date(Date.now() - RESET_WINDOW_MS) };
  const key = identifier.toLowerCase();

  const [byIdentifier, byIp] = await Promise.all([
    db.authAttempt.count({ where: { kind: "RESET", identifier: key, createdAt } }),
    db.authAttempt.count({ where: { kind: "RESET", ip, createdAt } }),
  ]);

  return {
    blocked: byIdentifier >= MAX_RESET_PER_IDENTIFIER || byIp >= MAX_RESET_PER_IP,
    remaining: Math.max(0, MAX_RESET_PER_IDENTIFIER - byIdentifier),
    failures: byIdentifier,
  };
}

/**
 * Records one attempt and opportunistically prunes expired rows.
 *
 * Pruning here rather than on a schedule keeps the table bounded without a
 * cron job. A failed pruning must never fail the request, so it is swallowed.
 */
export async function recordAttempt(
  kind: "LOGIN" | "REGISTER" | "RESET",
  identifier: string,
  ip: string,
): Promise<void> {
  await db.authAttempt.create({
    data: { kind, identifier: identifier.toLowerCase(), ip },
  });

  try {
    await db.authAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - REGISTER_WINDOW_MS) } },
    });
  } catch {
    // Pruning is housekeeping; the caller's outcome does not depend on it.
  }
}

/** Clears an identifier's failure history after a successful sign-in. */
export async function clearLoginAttempts(identifier: string): Promise<void> {
  await db.authAttempt.deleteMany({
    where: { kind: "LOGIN", identifier: identifier.toLowerCase() },
  });
}
