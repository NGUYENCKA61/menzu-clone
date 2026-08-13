/**
 * Whether "Quay lại" has somewhere on this site to go back to.
 *
 * History alone is not enough to ask. A tab opened straight onto /login — from
 * a bookmark, an ad, a message — still reports a length above one once Next
 * has done any client navigation of its own, and going back from there walks
 * the visitor off the site entirely, which is the opposite of what the arrow
 * promises. The referrer is what says they arrived from a page of ours.
 *
 * The origin has to match to a boundary, not merely as a prefix:
 * "http://localhost:3100" is a prefix of "http://localhost:31000", and a
 * neighbouring port is not this site.
 */
export function canGoBack(
  historyLength: number,
  referrer: string,
  origin: string,
): boolean {
  if (historyLength <= 1) return false;
  if (!referrer || !origin) return false;
  return referrer === origin || referrer.startsWith(`${origin}/`);
}
