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
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  "http://localhost:3000"
).replace(/\/$/, "");

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
  /** The product's own address — /{category}/{slug}. */
  href: string;
}

/**
 * schema.org/Product for an account listing.
 *
 * Every account is one-of-a-kind, so `sku` is the shop code and availability
 * flips to SoldOut the moment it sells rather than tracking a quantity.
 */
export function productJsonLd(product: ProductLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Tài khoản ${product.categoryName} ${product.code} — Rank ${product.rank}, ${product.weaponSkins} skin`,
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
        : "https://schema.org/SoldOut",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

interface SoftwareLdInput {
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  categoryName: string;
  href: string;
  available: boolean;
  /** Every duration on sale, so the range shows rather than one figure. */
  prices: number[];
}

/**
 * schema.org/Product for a tool.
 *
 * A tool is not one-of-a-kind and is sold in several durations at several
 * prices, so it carries an AggregateOffer with the range rather than the
 * single Offer an account gets. Without this the software pages — which are
 * most of the shop now — offered a crawler nothing but prose.
 */
export function softwareJsonLd(software: SoftwareLdInput) {
  const prices = software.prices.filter((p) => p > 0).sort((a, b) => a - b);
  const availability = software.available
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: software.name,
    description: software.description,
    sku: software.code,
    image: absoluteUrl(software.imageUrl),
    category: software.categoryName,
    offers:
      prices.length > 1
        ? {
            "@type": "AggregateOffer",
            url: absoluteUrl(software.href),
            priceCurrency: "VND",
            lowPrice: prices[0],
            highPrice: prices[prices.length - 1],
            offerCount: prices.length,
            availability,
            seller: { "@type": "Organization", name: SITE_NAME },
          }
        : {
            "@type": "Offer",
            url: absoluteUrl(software.href),
            priceCurrency: "VND",
            price: prices[0] ?? 0,
            availability,
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

/** schema.org/Organization for the homepage. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/logos/menzu-logo.webp"),
    description:
      "Shop account Valorant uy tín — acc tự chọn, acc giá rẻ, dịch vụ cày thuê và nạp VP.",
    areaServed: "VN",
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
