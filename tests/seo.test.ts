import { describe, expect, it } from "vitest";

import {
  SITE_URL,
  organizationJsonLd,
  profileLinks,
  websiteJsonLd,
} from "@/lib/seo";

describe("profileLinks", () => {
  it("keeps full profile addresses and drops groups, invites and chats", () => {
    expect(
      profileLinks([
        "https://www.tiktok.com/@thichthihack",
        "https://facebook.com/valhaxthichthihack114",
        "https://t.me/thichthihack",
        "https://facebook.com/groups/thichthihack",
        "https://discord.gg/thichthihack",
        "https://m.me/thichthihack",
        "https://zalo.me/0900000000",
        "https://t.me/+AbCdEf",
      ]),
    ).toEqual([
      "https://www.tiktok.com/@thichthihack",
      "https://facebook.com/valhaxthichthihack114",
      "https://t.me/thichthihack",
    ]);
  });

  it("drops blanks, bare handles and duplicates", () => {
    expect(
      profileLinks(["", "  ", null, undefined, "@thichthihack", "0900000000", "https://t.me/a", " https://t.me/a "]),
    ).toEqual(["https://t.me/a"]);
  });
});

describe("organizationJsonLd", () => {
  it("uses the configured logo, made absolute, and lists sameAs", () => {
    const ld = organizationJsonLd({
      brandName: "SHOP",
      brandLogo: "/uploads/site/logo.webp",
      sameAs: ["https://t.me/shop"],
    });
    expect(ld.logo).toBe(`${SITE_URL}/uploads/site/logo.webp`);
    expect(ld.sameAs).toEqual(["https://t.me/shop"]);
    expect(ld.name).toBe("SHOP");
  });

  it("leaves out an empty logo and an empty sameAs", () => {
    const ld = organizationJsonLd({ brandName: "SHOP", brandLogo: " ", sameAs: [] });
    expect("logo" in ld).toBe(false);
    expect("sameAs" in ld).toBe(false);
  });
});

describe("websiteJsonLd", () => {
  it("names the site at the root address, with no search action", () => {
    expect(websiteJsonLd("SHOP")).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "SHOP",
      url: `${SITE_URL}/`,
    });
  });
});
