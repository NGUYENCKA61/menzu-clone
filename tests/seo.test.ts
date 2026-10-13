import { describe, expect, it } from "vitest";

import {
  SITE_URL,
  organizationJsonLd,
  productJsonLd,
  profileLinks,
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

describe("productJsonLd availability", () => {
  const account = {
    code: "ACC71",
    price: 70000,
    imageUrl: "/a.webp",
    categoryName: "CFVN",
    rank: "",
    weaponSkins: 0,
    href: "/cfvn/acc71",
  };

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
