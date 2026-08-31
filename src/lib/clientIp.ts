/**
 * Reads the client address from the proxy headers.
 *
 * Kept apart from the rate limiter it serves so it stays a pure function of
 * the request — no database, no environment — and can be tested directly.
 *
 * The order matters. `x-nf-client-connection-ip` is written by Netlify's edge
 * and carries exactly one address that no caller can influence, so it is
 * asked first: on the deployed site it is the whole answer, and the register
 * limit — the only thing standing between this shop and an endless run of
 * sign-ups — actually holds.
 *
 * `x-forwarded-for` is the fallback, and it is a hint rather than a fact. Each
 * proxy appends, so the original client is leftmost, which is the entry read
 * here; taking the rightmost instead would bucket every visitor behind one CDN
 * node together and lock them all out at once. The cost of reading the left is
 * that a caller who sends the header themselves chooses their own bucket, so
 * where the chain is all there is, treat the limit as friction rather than as
 * a wall.
 */
/** An IPv6 address in full is 45 characters; nothing honest is longer. */
const MAX_LENGTH = 45;
const cap = (value: string) => value.slice(0, MAX_LENGTH);

export function clientIp(request: Request): string {
  const netlify = request.headers.get("x-nf-client-connection-ip")?.trim();
  if (netlify) return cap(netlify);

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    // Capped because this string is written to two tables and read back as a
    // rate-limit key: a caller who sends a header a megabyte long would
    // otherwise store a megabyte, once per request.
    if (first) return cap(first);
  }
  return cap(request.headers.get("x-real-ip")?.trim() || "") || "unknown";
}
