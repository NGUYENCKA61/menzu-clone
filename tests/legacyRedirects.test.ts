import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination";
import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";
import { isReservedSlug } from "@/lib/routes";

/**
 * The redirects in next.config.ts, run through the same matcher and
 * destination builder Next's router uses for them, so these say what a
 * crawler will actually be answered without starting a server (the owner's
 * SEO review, 13/10/2026).
 */
async function redirects() {
  if (!nextConfig.redirects) throw new Error("next.config.ts has no redirects()");
  return nextConfig.redirects();
}

/** Where a GET for `url` is sent, or null when no redirect applies. */
async function follow(url: string): Promise<{ to: string; permanent: boolean } | null> {
  const { pathname, searchParams } = new URL(url, "http://shop.test");
  const query = Object.fromEntries(searchParams);
  for (const rule of await redirects()) {
    // The options Next's router builds every redirect matcher with.
    const match = getPathMatch(rule.source, { strict: true, removeUnnamedParams: true });
    const params = match(pathname);
    if (!params) continue;
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params,
      query,
    });
    const search = new URLSearchParams(
      parsedDestination.query as Record<string, string>,
    ).toString();
    return {
      to: parsedDestination.pathname + (search ? `?${search}` : ""),
      permanent: "permanent" in rule && rule.permanent === true,
    };
  }
  return null;
}

describe("the old PHP shop's addresses", () => {
  it("sends a category to the same slug at the root", async () => {
    expect(await follow("/cate/hack-valorant-moi")).toEqual({
      to: "/hack-valorant-moi",
      permanent: true,
    });
    // This one used to land on a PRODUCT of the same name, not the category.
    expect((await follow("/cate/hack-naraka-vn"))?.to).toBe("/hack-naraka-vn");
    // Trailing dashes are part of the slug and survive.
    expect((await follow("/cate/hack-pubg-steam-pc-"))?.to).toBe("/hack-pubg-steam-pc-");
  });

  it("sends the two retired category slugs to their categories today", async () => {
    expect((await follow("/cate/hack-cs2"))?.to).toBe("/hack-cs2-counter-strike-2");
    expect((await follow("/cate/hack-valorant-moi-"))?.to).toBe("/hack-valorant-moi");
  });

  it("keeps the referral code through sign-up", async () => {
    expect(await follow("/auth/register?ref=abc")).toEqual({
      to: "/signup?ref=abc",
      permanent: true,
    });
    expect((await follow("/auth/login"))?.to).toBe("/login");
    expect((await follow("/auth/forgot"))?.to).toBe("/forgot-password");
  });

  it("sends every top-up tab to the wallet", async () => {
    for (const old of ["/recharge", "/recharge/card", "/recharge/bank"]) {
      expect((await follow(old))?.to).toBe("/wallet");
    }
    expect((await follow("/index.php"))?.to).toBe("/");
  });

  it("leaves the shop's own addresses alone", async () => {
    // /huong-dan needs the database and has its own route handler.
    for (const own of [
      "/",
      "/hack-valorant-moi",
      "/hack-valorant-moi/spoofer-valorant-",
      "/huong-dan/spoofer-valorant-",
      "/login",
      "/wallet",
      "/docs/spoofer-la-gi",
    ]) {
      expect(await follow(own)).toBeNull();
    }
  });

  it("only ever redirects permanently", async () => {
    for (const rule of await redirects()) {
      expect("permanent" in rule && rule.permanent).toBe(true);
    }
  });

  it("reserves every first segment it redirects, so no category can hide there", async () => {
    for (const rule of await redirects()) {
      const first = rule.source.split("/")[1];
      if (first === "docs") continue;
      expect(isReservedSlug(first)).toBe(true);
    }
    expect(isReservedSlug("huong-dan")).toBe(true);
  });
});
