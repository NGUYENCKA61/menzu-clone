// Typed dataset for the menzu.lol category-listing ProductCard, shared across
// every `/category/[slug]` page. Codes, ranks, tier counts, and prices are
// verbatim from page 1 of `account-valorant-tu-chon`.

export type TierColor = "yellow" | "orange" | "pink" | "cyan" | "blue";

export interface ProductTier {
  color: TierColor;
  count: number;
}

export interface Product {
  code: string; // "VLR2077"
  rank: string; // "GOLD 1" | "Unranked"
  skins: number; // 61
  tiers: ProductTier[]; // omits tiers with no count
  tag: string | null; // "DROP MAIL" or null
  extraSkins: number; // 11 -> "+11" chip
  oldPrice: number; // 7200000
  price: number; // 3960000
}

const ACCOUNT_IMAGE_BASE_PATH =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account";

const TIER_ICON_BASE_PATH =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/valorant-api/contenttiers";

// Tailwind can't see dynamically-built class names, so every tier color's
// icon path is spelled out here as a literal record, keyed by tier color.
export const TIER_ICON_PATHS: Record<TierColor, string> = {
  yellow: `${TIER_ICON_BASE_PATH}/e046854e-406c-37f4-6607-19a9ba8426fc.webp`,
  orange: `${TIER_ICON_BASE_PATH}/411e4a55-4e59-7757-41f0-86a53f101bb5.webp`,
  pink: `${TIER_ICON_BASE_PATH}/60bca009-4182-7998-dee7-b8a2558dc369.webp`,
  cyan: `${TIER_ICON_BASE_PATH}/0cebb8be-46d7-c12a-d306-e9907bfc5a25.webp`,
  blue: `${TIER_ICON_BASE_PATH}/12683d76-48d7-84a3-4e09-6985794f0445.webp`,
};

export const CATEGORY_PRODUCTS: Product[] = [
  {
    code: "VLR2077",
    rank: "GOLD 1",
    skins: 61,
    tiers: [
      { color: "yellow", count: 1 },
      { color: "orange", count: 13 },
      { color: "pink", count: 7 },
      { color: "cyan", count: 12 },
      { color: "blue", count: 28 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 7200000,
    price: 3960000,
  },
  {
    code: "VLR2079",
    rank: "DIAMOND 3",
    skins: 71,
    tiers: [
      { color: "yellow", count: 1 },
      { color: "orange", count: 6 },
      { color: "pink", count: 11 },
      { color: "cyan", count: 16 },
      { color: "blue", count: 37 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 4200000,
    price: 2520000,
  },
  {
    code: "VLR2030",
    rank: "DIAMOND 1",
    skins: 42,
    tiers: [
      { color: "orange", count: 10 },
      { color: "pink", count: 8 },
      { color: "cyan", count: 8 },
      { color: "blue", count: 16 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 4800000,
    price: 2990000,
  },
  {
    code: "VLR1610",
    rank: "PLATINUM 2",
    skins: 14,
    tiers: [
      { color: "orange", count: 5 },
      { color: "pink", count: 7 },
      { color: "blue", count: 2 },
    ],
    tag: "DROP MAIL",
    extraSkins: 8,
    oldPrice: 3100000,
    price: 2175000,
  },
  {
    code: "VLR1546",
    rank: "Unranked",
    skins: 75,
    tiers: [
      { color: "orange", count: 17 },
      { color: "pink", count: 4 },
      { color: "cyan", count: 19 },
      { color: "blue", count: 35 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 6100000,
    price: 3965000,
  },
  {
    code: "MENZU720",
    rank: "BRONZE 2",
    skins: 43,
    tiers: [
      { color: "orange", count: 10 },
      { color: "pink", count: 5 },
      { color: "cyan", count: 10 },
      { color: "blue", count: 18 },
    ],
    tag: null,
    extraSkins: 11,
    oldPrice: 4200000,
    price: 2310000,
  },
  {
    code: "VLR1524",
    rank: "Unranked",
    skins: 46,
    tiers: [
      { color: "orange", count: 9 },
      { color: "pink", count: 2 },
      { color: "cyan", count: 11 },
      { color: "blue", count: 24 },
    ],
    tag: "DROP MAIL",
    extraSkins: 7,
    oldPrice: 3300000,
    price: 2640000,
  },
  {
    code: "VLR1919",
    rank: "PLATINUM 2",
    skins: 52,
    tiers: [
      { color: "yellow", count: 2 },
      { color: "orange", count: 11 },
      { color: "pink", count: 6 },
      { color: "cyan", count: 9 },
      { color: "blue", count: 24 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 6050000,
    price: 3920000,
  },
  {
    code: "VLR1640",
    rank: "SILVER 1",
    skins: 81,
    tiers: [
      { color: "orange", count: 15 },
      { color: "pink", count: 6 },
      { color: "cyan", count: 19 },
      { color: "blue", count: 41 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 6100000,
    price: 3355000,
  },
  {
    code: "VLR1587",
    rank: "DIAMOND 3",
    skins: 94,
    tiers: [
      { color: "orange", count: 11 },
      { color: "pink", count: 9 },
      { color: "cyan", count: 21 },
      { color: "blue", count: 53 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 4900000,
    price: 3675000,
  },
  {
    code: "VLR1500",
    rank: "Unranked",
    skins: 170,
    tiers: [
      { color: "yellow", count: 2 },
      { color: "orange", count: 27 },
      { color: "pink", count: 14 },
      { color: "cyan", count: 44 },
      { color: "blue", count: 83 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 10600000,
    price: 6360000,
  },
  {
    code: "VLR1453",
    rank: "Unranked",
    skins: 57,
    tiers: [
      { color: "yellow", count: 1 },
      { color: "orange", count: 17 },
      { color: "pink", count: 1 },
      { color: "cyan", count: 13 },
      { color: "blue", count: 25 },
    ],
    tag: "DROP MAIL",
    extraSkins: 11,
    oldPrice: 5500000,
    price: 3575000,
  },
];

export function productImage(code: string): string {
  return `${ACCOUNT_IMAGE_BASE_PATH}/${code}.webp`;
}

export function discountPct(p: Product): number {
  return Math.round((1 - p.price / p.oldPrice) * 100);
}

// Locale-independent VND grouping (thousands separated by ".") so server and
// client render identical markup regardless of ICU data availability.
export function formatVnd(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
