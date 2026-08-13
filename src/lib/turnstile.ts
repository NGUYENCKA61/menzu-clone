/**
 * Cloudflare Turnstile, the parts worth checking without a network.
 *
 * The interesting decisions here are all about failing in the right
 * direction, and none of them need Cloudflare to be reachable to be tested.
 */

/** Where a token is checked. Cloudflare's documented endpoint. */
export const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The script the widget comes from. */
export const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Whether the shop has configured Turnstile at all.
 *
 * Both halves or neither. With only the site key the browser would draw a
 * widget whose token nothing can check; with only the secret there is no
 * widget to produce one, and the login form would refuse everybody. A shop
 * that has filled in one field and gone to lunch gets the behaviour it had
 * yesterday rather than a locked front door.
 */
export function turnstileEnabled(settings: {
  turnstileSiteKey: string;
  turnstileSecretKey: string;
}): boolean {
  return Boolean(settings.turnstileSiteKey.trim() && settings.turnstileSecretKey.trim());
}

/** What Cloudflare answers with, reduced to what the caller acts on. */
export interface VerifyOutcome {
  ok: boolean;
  /** Cloudflare's own codes, kept for the server log — never shown to a visitor. */
  codes: string[];
}

/**
 * Reads a siteverify response.
 *
 * Anything that is not an explicit `success: true` is a failure. Written the
 * other way round — treating a malformed or unexpected body as a pass — a
 * Cloudflare outage or a changed payload would quietly turn the check off and
 * nothing on the screen would say so.
 */
export function readVerifyResponse(payload: unknown): VerifyOutcome {
  if (!payload || typeof payload !== "object") return { ok: false, codes: ["bad-body"] };
  const body = payload as Record<string, unknown>;
  const codes = Array.isArray(body["error-codes"])
    ? body["error-codes"].filter((c): c is string => typeof c === "string")
    : [];
  return { ok: body.success === true, codes };
}

/**
 * What to tell the visitor when a token is missing or refused.
 *
 * Deliberately the same sentence either way. "Token hết hạn" versus "token
 * sai" tells somebody probing the form which of the two they achieved, and a
 * person who simply left the tab open for ten minutes is helped by neither.
 */
export const TURNSTILE_FAILED = "Xác minh CAPTCHA không thành công. Vui lòng thử lại.";

/** How long a Turnstile token stays valid at Cloudflare, per their docs. */
export const TOKEN_TTL_MS = 5 * 60 * 1000;
