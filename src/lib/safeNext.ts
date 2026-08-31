/**
 * Where a "come back here afterwards" parameter is allowed to point.
 *
 * "Starts with a slash" is not enough, and that was the whole bug: a browser
 * reads `//evil.com` and `/\evil.com` as protocol-relative addresses and goes
 * to another site, so a link like /login?next=//evil.com sent the customer to
 * a copy of the shop the moment they finished signing in for real — with the
 * link they clicked, and the sign-in they completed, both genuine.
 *
 * So the test is positive rather than negative: one leading slash, then
 * something that is not another slash or a backslash. Everything else falls
 * back to the home page. Backslashes are rejected anywhere in the path too —
 * no legitimate address here contains one, and browsers have historically
 * disagreed about how to normalise them.
 */
const SAFE = /^\/(?![/\\])[^\\]*$/;

/** The path to return to, or "/" when the value cannot be trusted. */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  const value = raw.trim();
  // Control characters are dropped by the browser before the address is
  // parsed, which is one more way to smuggle a second slash past this test;
  // a raw space is refused with them because a genuine target arrives
  // percent-encoded, so one here means the value was assembled by hand.
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return "/";
  }
  return SAFE.test(value) ? value : "/";
}
