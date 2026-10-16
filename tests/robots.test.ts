import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

/**
 * What robots.txt keeps crawlers away from (the owner's SEO review,
 * 13/10/2026): the signed-in areas and the free-key tickets, but not the
 * public pages whose noindex only works if a crawler may read it.
 */
function disallowed(): string[] {
  const rules = robots().rules;
  const first = Array.isArray(rules) ? rules[0] : rules;
  const list = first?.disallow ?? [];
  return Array.isArray(list) ? list : [list];
}

describe("robots.txt", () => {
  it("lets crawlers read the noindex on the public sign-in and cart pages", () => {
    const list = disallowed();
    // /affiliate joined them in round 2: it says noindex and redirects a
    // guest, which a disallowed crawler would never see.
    for (const page of ["/login", "/signup", "/forgot-password", "/reset-password", "/cart", "/2fa", "/affiliate"]) {
      expect(list).not.toContain(page);
    }
  });

  it("still keeps the admin, the API and every signed-in area out", () => {
    const list = disallowed();
    for (const area of [
      "/admin",
      "/api",
      "/profile",
      "/wallet",
      "/orders",
      "/transactions",
      "/security",
      "/agency/dashboard",
    ]) {
      expect(list).toContain(area);
    }
  });

  it("keeps bots off the free-key tickets, whose GET spends a claim", () => {
    expect(disallowed()).toContain("/free-key/");
  });
});
