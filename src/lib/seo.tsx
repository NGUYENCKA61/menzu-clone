/**
 * Shared SEO helpers: the canonical origin, plus JSON-LD builders.
 *
 * Absolute URLs matter more here than usual — Open Graph and schema.org both
 * reject relative paths, so a card shared to Facebook or Zalo silently loses
 * its image if the origin is missing.
 */

/**
 * Canonical origin, without a trailing slash.
 *
 * Set NEXT_PUBLIC_SITE_URL in production. Vercel exposes the deployment host
 * as VERCEL_URL (no scheme), which is the right fallback for preview builds;
 * localhost is the last resort so `next build` never fails on a fresh clone.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  // Netlify names the deployed address itself, which is the right answer on
  // the host this shop actually runs on — and without it a production build
  // that forgot the variable published canonical tags, a sitemap and a robots
  // file all pointing at localhost, which is an instruction to de-index the
  // whole site.
  process.env.URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  "http://localhost:3000"
).replace(/\/$/, "");

// Said out loud once, at build time, because the symptom — every canonical
// pointing at a machine nobody can reach — is invisible until a search engine
// acts on it.
if (
  process.env.NODE_ENV === "production" &&
  SITE_URL.startsWith("http://localhost")
) {
  console.warn(
    "[seo] NEXT_PUBLIC_SITE_URL is not set: canonical tags, the sitemap and " +
      "robots.txt will all point at localhost.",
  );
}

/**
 * The shop's name for structured data, which is built in helpers that have no
 * access to the settings row. Keep it in step with Cấu hình → Nhận diện; the
 * browser tab and the share cards read that setting directly.
 */
export const SITE_NAME = "THICHTHIHACK";

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface ProductLdInput {
  code: string;
  price: number;
  imageUrl: string;
  categoryName: string;
  rank: string;
  weaponSkins: number;
  available: boolean;
  /**
   * A random listing ("acc random") sells from a pile that the shop refills,
   * so an empty pile is OutOfStock, not SoldOut.
   */
  restockable?: boolean;
  /** The product's own address — /{category}/{slug}. */
  href: string;
}

/**
 * schema.org/Product for an account listing.
 *
 * Every account is one-of-a-kind, so `sku` is the shop code and availability
 * flips to SoldOut the moment it sells rather than tracking a quantity. A
 * random listing is the exception: it is out of stock while its pile is
 * empty and back the day the shop refills it.
 */
export function productJsonLd(product: ProductLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Tài khoản ${product.categoryName} ${product.code}, Rank ${product.rank}, ${product.weaponSkins} skin`,
    description:
      `Tài khoản mã ${product.code}, rank ${product.rank}, ${product.weaponSkins} skin súng. ` +
      `Thuộc danh mục ${product.categoryName} tại ${SITE_NAME}.`,
    sku: product.code,
    image: absoluteUrl(product.imageUrl),
    category: product.categoryName,
    offers: {
      "@type": "Offer",
      // The real address. This said /account/<code>, an URL scheme the shop
      // stopped using — every offer pointed at a 404, which is worse for a
      // crawler than no offer at all.
      url: absoluteUrl(product.href),
      priceCurrency: "VND",
      price: product.price,
      availability: product.available
        ? "https://schema.org/InStock"
        : product.restockable
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/SoldOut",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

interface SoftwareLdInput {
  code: string;
  name: string;
  description: string;
  /** "" when the tool has no picture yet: the property is then left out. */
  imageUrl: string;
  categoryName: string;
  href: string;
  /** Buyable now: on the shelf, not sales-locked, with a tier to buy. */
  available: boolean;
  /** Every tier's price; the cheapest positive one is the offer. */
  prices: number[];
  /** A free tool (its tiers cost 1đ or less): one Offer at price 0. */
  free?: boolean;
}

/**
 * schema.org/Product for a tool, or null when there is nothing to offer.
 *
 * One Offer at the cheapest tier, the same "Từ X đ" the title quotes. The
 * tiers are durations of one product from one shop, and Google asks that
 * variants not be described as an AggregateOffer, which this used to emit.
 * A free tool says price 0, Google's way of marking a product free, rather
 * than the 1đ placeholder its tiers carry. A tool with no priced tier is not
 * on sale at all, and a Product with price 0 would claim it is free, so no
 * block is emitted (the owner's SEO review, 13/10/2026).
 */
export function softwareJsonLd(software: SoftwareLdInput) {
  const cheapest = software.prices
    .filter((p) => p > 0)
    .reduce<number | null>((min, p) => (min === null || p < min ? p : min), null);
  const price = software.free ? 0 : cheapest;
  if (price === null) return null;
  const image = software.imageUrl.trim();

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: software.name,
    description: software.description,
    sku: software.code,
    // absoluteUrl("") is the home page, which is not a picture of the tool.
    ...(image ? { image: absoluteUrl(image) } : {}),
    category: software.categoryName,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(software.href),
      priceCurrency: "VND",
      price,
      availability: software.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

/** schema.org/BreadcrumbList — mirrors the visible breadcrumb on the page. */
export function breadcrumbJsonLd(trail: { name: string; path?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      ...(entry.path ? { item: absoluteUrl(entry.path) } : {}),
    })),
  };
}

/**
 * schema.org/ItemList for a category's shelf.
 *
 * The category pages are most of the shop's public addresses and carried no
 * structured data at all — not even a breadcrumb, which both detail pages have
 * had from the start. A crawler therefore knew a tool's price from its own page
 * and nothing whatever about the shelf that lists forty of them.
 *
 * Deliberately a list of links rather than a list of Products: the entries here
 * carry no price, and a Product with no offer is a worse answer than a plain
 * pointer at the page that has one. Positions are one-based and follow the
 * order the page draws.
 */
export function itemListJsonLd(
  name: string,
  items: { name: string; path: string }[],
) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      url: absoluteUrl(entry.path),
    })),
  };
}

/**
 * schema.org/FAQPage for the questions in the home page's SEO block.
 *
 * The same questions the reader sees, marked up so a search engine can show
 * them as answers. Google drops a FAQPage whose questions are not visible on
 * the page, so this is built from the rendered list rather than a separate
 * one — and returns null when there is nothing to describe, since an empty
 * FAQPage is an invalid one.
 */
export function faqJsonLd(entries: { q: string; a: string }[]) {
  if (entries.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a },
    })),
  };
}

/**
 * The one sentence the shop is described by. The meta description on every
 * page and the schema.org record on the homepage read this same string, so a
 * rebrand in Cấu hình → Nhận diện reaches both — and the record can no longer
 * drift back to the cloned shop's "acc Valorant, cày thuê và nạp VP", which
 * it did for a month while the page above it said hack game.
 */
export function siteDescription(brandName: string): string {
  return `${brandName} là shop hack game và tài khoản game uy tín. Hack Valorant, CS2, PUBG, Liên Quân: key bản quyền giao tự động, cập nhật liên tục, hỗ trợ 24/7.`;
}

/**
 * The shop's own profile pages, for `sameAs`: the addresses that are the shop
 * itself on another site. A group, an invite or a chat link is a place to talk
 * rather than the shop's profile, so those are left out, and so is anything
 * that is not a full http(s) address (a bare handle or a phone number).
 */
export function profileLinks(candidates: (string | null | undefined)[]): string[] {
  const NOT_A_PROFILE = [
    /^https?:\/\/(?:www\.|m\.)?facebook\.com\/groups\//i,
    /^https?:\/\/(?:www\.)?(?:m\.me|zalo\.me|discord\.gg|discord\.com\/invite)\b/i,
    /^https?:\/\/(?:www\.)?t\.me\/(?:\+|joinchat\/)/i,
  ];
  const out: string[] = [];
  for (const raw of candidates) {
    const url = raw?.trim() ?? "";
    if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(url)) continue;
    if (NOT_A_PROFILE.some((re) => re.test(url))) continue;
    if (!out.includes(url)) out.push(url);
  }
  return out;
}

/**
 * schema.org/Organization (as an OnlineStore) for the homepage.
 *
 * The logo is the one Cấu hình → Nhận diện sets, the same file the header
 * draws: it was a fixed path to the cloned shop's file, so a new logo reached
 * the header and never the markup (the owner's SEO review, 13/10/2026).
 * `sameAs` names the shop's profiles elsewhere, which is how a search engine
 * ties the TikTok, the fanpage and the channel to this site.
 */
export function organizationJsonLd(org: {
  brandName: string;
  brandLogo: string;
  sameAs?: string[];
}) {
  const logo = org.brandLogo.trim();
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: org.brandName,
    url: SITE_URL,
    ...(logo ? { logo: absoluteUrl(logo) } : {}),
    description: siteDescription(org.brandName),
    areaServed: "VN",
    ...(org.sameAs && org.sameAs.length > 0 ? { sameAs: org.sameAs } : {}),
  };
}

/**
 * schema.org/WebSite for the homepage: Google's main source for the site name
 * it prints over a result, which matters here because the brand is spelled
 * differently from the domain. No SearchAction: Google retired the sitelinks
 * search box in November 2024.
 */
export function websiteJsonLd(brandName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brandName,
    url: `${SITE_URL}/`,
  };
}

/**
 * Renders a JSON-LD block.
 *
 * The payload is our own serialised object, never user input, so
 * dangerouslySetInnerHTML is safe here — `<` is escaped regardless so a value
 * containing "</script>" cannot break out of the tag.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
