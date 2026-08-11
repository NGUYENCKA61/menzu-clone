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

export const SITE_NAME = "Menzu Valorant";

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface ProductLdInput {
  code: string;
  price: number;
  oldPrice: number;
  imageUrl: string;
  categoryName: string;
  rank: string;
  weaponSkins: number;
  available: boolean;
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
    name: `Tài khoản Valorant ${product.code} — Rank ${product.rank}, ${product.weaponSkins} skin`,
    description:
      `Account Valorant mã ${product.code}, rank ${product.rank}, ${product.weaponSkins} skin súng. ` +
      `Thuộc danh mục ${product.categoryName} tại ${SITE_NAME}.`,
    sku: product.code,
    image: absoluteUrl(product.imageUrl),
    category: product.categoryName,
    brand: { "@type": "Brand", name: "Valorant" },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/account/${product.code}`),
      priceCurrency: "VND",
      price: product.price,
      availability: product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
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
