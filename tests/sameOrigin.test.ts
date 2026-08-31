import { describe, expect, it } from "vitest";

import { crossSiteRequest } from "@/lib/sameOrigin";

const post = (headers: Record<string, string>) =>
  new Request("http://localhost:3100/api/auth/login", { method: "POST", headers });

describe("crossSiteRequest", () => {
  it("lets our own pages through", () => {
    expect(crossSiteRequest(post({ "sec-fetch-site": "same-origin" }))).toBe(false);
    expect(crossSiteRequest(post({ "sec-fetch-site": "none" }))).toBe(false);
    expect(crossSiteRequest(post({ origin: "http://localhost:3100" }))).toBe(false);
  });

  it("stops a form posted from another site", () => {
    expect(crossSiteRequest(post({ "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(crossSiteRequest(post({ "sec-fetch-site": "same-site" }))).toBe(true);
    expect(crossSiteRequest(post({ origin: "https://evil.com" }))).toBe(true);
  });

  it("believes the browser's own header over the one page script can set", () => {
    expect(
      crossSiteRequest(
        post({ "sec-fetch-site": "cross-site", origin: "http://localhost:3100" }),
      ),
    ).toBe(true);
  });

  it("lets a request that is not a browser through", () => {
    // curl, a script, the shop's own tooling: no third party's cookies to ride
    // on, so no CSRF to commit.
    expect(crossSiteRequest(post({}))).toBe(false);
  });

  it("refuses an Origin that will not parse", () => {
    expect(crossSiteRequest(post({ origin: "null" }))).toBe(true);
    expect(crossSiteRequest(post({ origin: "not a url" }))).toBe(true);
  });
});
