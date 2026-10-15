import { describe, expect, it } from "vitest";

import {
  SITE_URL,
  articleJsonLd,
  isShopUrl,
  organizationJsonLd,
  productJsonLd,
  profileLinks,
  siteDescription,
  softwareJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

const tool = {
  code: "HACK98",
  name: "Hack Delta Force",
  description: "Tool.",
  imageUrl: "/uploads/products/a.webp",
  categoryName: "HACK DELTA FORCE",
  href: "/hack-delta-force-moi/hack-delta-force",
  available: true,
  prices: [1000000, 450000],
};

describe("softwareJsonLd", () => {
  it("emits one Offer at the cheapest tier, never an AggregateOffer", () => {
    const ld = softwareJsonLd(tool);
    expect(ld?.offers).toMatchObject({
      "@type": "Offer",
      price: 450000,
      priceCurrency: "VND",
      url: `${SITE_URL}/hack-delta-force-moi/hack-delta-force`,
      availability: "https://schema.org/InStock",
    });
    expect(JSON.stringify(ld)).not.toContain("AggregateOffer");
  });

  it("says OutOfStock when the tool cannot be bought", () => {
    expect(softwareJsonLd({ ...tool, available: false })?.offers.availability).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("emits nothing for a tool with no priced tier", () => {
    expect(softwareJsonLd({ ...tool, prices: [] })).toBeNull();
    expect(softwareJsonLd({ ...tool, prices: [0] })).toBeNull();
  });

  it("marks a free tool price 0, not its 1đ placeholder", () => {
    expect(softwareJsonLd({ ...tool, prices: [1], free: true })?.offers.price).toBe(0);
    expect(softwareJsonLd({ ...tool, prices: [0], free: true })?.offers.price).toBe(0);
  });

  it("leaves image out when the tool has no picture", () => {
    const ld = softwareJsonLd({ ...tool, imageUrl: "" });
    expect(ld && "image" in ld).toBe(false);
    expect(softwareJsonLd(tool)?.image).toBe(`${SITE_URL}/uploads/products/a.webp`);
  });
});

describe("productJsonLd", () => {
  const account = {
    code: "ACC71",
    name: "ACC RÁC CFVN",
    description: "Acc rác CFVN.",
    price: 70000,
    images: ["/a.webp"],
    categoryName: "CFVN",
    href: "/cfvn/acc71",
  };

  it("carries the given name and description", () => {
    const ld = productJsonLd({ ...account, available: true });
    expect(ld.name).toBe("ACC RÁC CFVN");
    expect(ld.description).toBe("Acc rác CFVN.");
    expect(ld).toMatchObject({ image: `${SITE_URL}/a.webp` });
  });

  it("lists several pictures as an array, without duplicates or blanks", () => {
    const ld = productJsonLd({
      ...account,
      images: ["/a.webp", "/b.webp", "/a.webp", ""],
      available: true,
    });
    expect(ld).toMatchObject({ image: [`${SITE_URL}/a.webp`, `${SITE_URL}/b.webp`] });
  });

  it("leaves image out when there is no picture", () => {
    expect("image" in productJsonLd({ ...account, images: [], available: true })).toBe(false);
  });

  it("is SoldOut for a sold one-of-a-kind account", () => {
    expect(productJsonLd({ ...account, available: false }).offers.availability).toBe(
      "https://schema.org/SoldOut",
    );
  });

  it("is OutOfStock for an empty random pile, which the shop refills", () => {
    expect(
      productJsonLd({ ...account, available: false, restockable: true }).offers.availability,
    ).toBe("https://schema.org/OutOfStock");
  });
});

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

  it("never names the shop's own domains, the old PHP one included", () => {
    expect(
      profileLinks([
        "https://thichthihack.com",
        "https://www.thichthihackk.com/",
        "http://thichthihack.com/bio",
        `${SITE_URL}/bio`,
        "https://t.me/thichthihack",
      ]),
    ).toEqual(["https://t.me/thichthihack"]);
  });
});

describe("isShopUrl", () => {
  it("knows both domains, with or without www, and the configured origin", () => {
    expect(isShopUrl("https://thichthihack.com/x")).toBe(true);
    expect(isShopUrl("https://www.thichthihackk.com/")).toBe(true);
    expect(isShopUrl("//thichthihackk.com/docs")).toBe(true);
    expect(isShopUrl(`${SITE_URL}/docs`)).toBe(true);
    expect(isShopUrl("https://obvhax.com/")).toBe(false);
    expect(isShopUrl("/docs/x")).toBe(false);
    expect(isShopUrl("not a url")).toBe(false);
  });
});

describe("siteDescription", () => {
  it("fits a snippet and names the shelves the shop sells today", () => {
    const text = siteDescription("THICHTHIHACK");
    expect(text.length).toBeLessThanOrEqual(160);
    for (const game of ["CS2", "Valorant", "Đột Kích CF", "Delta Force", "Truy Kích", "Blood Strike", "LoL"]) {
      expect(text).toContain(game);
    }
    // Shelves the shop does not stock and a promise it does not make.
    expect(text).not.toMatch(/PUBG|Liên Quân|24\/7|[–—]/);
    // The shop rents out; a bare "thuê" would have it hiring hacks itself.
    expect(text).toContain("cho thuê");
    expect(text.startsWith("THICHTHIHACK")).toBe(true);
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

describe("articleJsonLd", () => {
  const base = {
    headline: "Spoofer là gì?",
    description: "Giải thích spoofer.",
    image: "/images/docs/covers/spoofer-la-gi.webp",
    datePublished: new Date("2026-09-23T00:00:00Z"),
    dateModified: new Date("2026-10-13T00:00:00Z"),
    path: "/docs/spoofer-la-gi",
    brandName: "SHOP",
  };

  it("describes the article with absolute addresses and the shop as author", () => {
    expect(articleJsonLd(base)).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Spoofer là gì?",
      description: "Giải thích spoofer.",
      image: `${SITE_URL}/images/docs/covers/spoofer-la-gi.webp`,
      datePublished: "2026-09-23T00:00:00.000Z",
      dateModified: "2026-10-13T00:00:00.000Z",
      mainEntityOfPage: `${SITE_URL}/docs/spoofer-la-gi`,
      author: { "@type": "Organization", name: "SHOP", url: SITE_URL },
      publisher: { "@type": "Organization", name: "SHOP", url: SITE_URL },
    });
  });

  it("leaves out a missing excerpt or picture, and never dates an edit before publication", () => {
    const ld = articleJsonLd({
      ...base,
      description: null,
      image: "",
      dateModified: new Date("2026-09-01T00:00:00Z"),
    });
    expect("description" in ld).toBe(false);
    expect("image" in ld).toBe(false);
    expect(ld.dateModified).toBe("2026-09-23T00:00:00.000Z");
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
