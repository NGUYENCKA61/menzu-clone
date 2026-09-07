/**
 * Is this request coming from another website?
 *
 * The attack it stops is login CSRF: a page somewhere else posts the
 * attacker's own credentials to /api/auth/login, the visitor's browser signs
 * in as them without noticing, and every top-up they make afterwards lands in
 * the attacker's wallet. Nothing about the request looks wrong — it carries no
 * stolen data and needs no session — which is why the request's origin has to
 * be the thing that is checked.
 *
 * Two signals, in the order they can be trusted:
 *
 *  - `Sec-Fetch-Site` is set by the browser itself and cannot be reached from
 *    page script. "same-origin" is our own page; "none" is a typed address or
 *    a bookmark. Anything else came from somewhere else.
 *  - `Origin` is the older signal and is compared against the address the
 *    request actually arrived at — the Host header, which the proxy in front
 *    of the shop passes through unchanged. Not `request.url`: behind that
 *    proxy, and on the dev server reached by IP, the URL the server believes
 *    it has is "localhost", and a genuine Safari 16 or Firefox 89 (neither
 *    sends Sec-Fetch-Site) would be turned away from its own sign-in form.
 *
 * A request carrying neither is not a browser at all — curl, a script, a
 * mobile client — and a program impersonating nobody's browser cannot commit
 * CSRF, because there is no third party whose cookies it is riding on. Those
 * are let through, which is also what keeps the shop's own tooling working.
 */
export function crossSiteRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "none";

  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host =
    request.headers.get("host") ??
    request.headers.get("x-forwarded-host") ??
    new URL(request.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    // An Origin that will not parse is not one this site sent.
    return true;
  }
}
