/**
 * Reads the client address from the proxy headers.
 *
 * Kept apart from the rate limiter it serves so it stays a pure function of
 * the request — no database, no environment — and can be tested directly.
 *
 * `x-forwarded-for` is a comma-separated chain and only the first entry is the
 * original client. It is trivially spoofable when nothing trusted sets it, so
 * treat the result as a hint: the per-identifier window is what actually stops
 * a determined attacker.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
