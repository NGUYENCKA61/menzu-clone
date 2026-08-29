// Typed dataset for the menzu.lol FlashSale section.
// Prices, discounts, and account codes are verbatim from the live site.

export type TierColor = "yellow" | "orange" | "pink" | "cyan" | "blue";

export interface FlashSaleTier {
  color: TierColor;
  count: number;
}

export interface FlashSaleItem {
  code: string;
  /**
   * /{category-slug}/{product-slug}. Optional only because the scraped
   * fixture below predates slugs; every item the shop actually serves carries
   * one, and the card falls back to the shop index rather than to an address
   * that no longer resolves.
   */
  href?: string;
  /** The shop's uploaded picture; absent, the by-code path below is shown. */
  imageUrl?: string | null;
  /**
   * The labelled stat strip, as on the listing card. Optional because the
   * scraped fixture below predates them; the strip hides what it lacks.
   */
  rank?: string;
  vip?: number;
  vipIngame?: number;
  discount: string | null;
  oldPrice: string | null;
  newPrice: string;
  skins: number;
  tiers: FlashSaleTier[];
}

const ACCOUNT_IMAGE_BASE_PATH =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account";

export function getAccountImagePath(code: string): string {
  return `${ACCOUNT_IMAGE_BASE_PATH}/${code}.webp`;
}

export const FLASH_SALE_BACKGROUND_IMAGE =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/behance/f945cb242281183.696998e170840.webp";

const TIER_ICON_BASE_PATH =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/valorant-api/contenttiers";

export const TIER_ICON_PATHS: Record<TierColor, string> = {
  yellow: `${TIER_ICON_BASE_PATH}/e046854e-406c-37f4-6607-19a9ba8426fc.webp`,
  orange: `${TIER_ICON_BASE_PATH}/411e4a55-4e59-7757-41f0-86a53f101bb5.webp`,
  pink: `${TIER_ICON_BASE_PATH}/60bca009-4182-7998-dee7-b8a2558dc369.webp`,
  cyan: `${TIER_ICON_BASE_PATH}/0cebb8be-46d7-c12a-d306-e9907bfc5a25.webp`,
  blue: `${TIER_ICON_BASE_PATH}/12683d76-48d7-84a3-4e09-6985794f0445.webp`,
};

export const FLASH_SALE_ITEMS: FlashSaleItem[] = [
  {
    code: "MENZU725",
    discount: "-40%",
    oldPrice: "3.300.000 VND",
    newPrice: "1.980.000 VND",
    skins: 25,
    tiers: [
      { color: "orange", count: 9 },
      { color: "pink", count: 2 },
      { color: "cyan", count: 3 },
      { color: "blue", count: 11 },
    ],
  },
  {
    code: "VLR2116",
    discount: "-15%",
    oldPrice: "2.100.000 VND",
    newPrice: "1.785.000 VND",
    skins: 18,
    tiers: [
      { color: "orange", count: 3 },
      { color: "pink", count: 5 },
      { color: "cyan", count: 5 },
      { color: "blue", count: 5 },
    ],
  },
  {
    code: "VLR2117",
    discount: "-35%",
    oldPrice: "4.100.000 VND",
    newPrice: "2.665.000 VND",
    skins: 45,
    tiers: [
      { color: "yellow", count: 1 },
      { color: "orange", count: 10 },
      { color: "pink", count: 3 },
      { color: "cyan", count: 10 },
      { color: "blue", count: 21 },
    ],
  },
  {
    code: "MENZU727",
    discount: "-55%",
    oldPrice: "5.800.000 VND",
    newPrice: "2.610.000 VND",
    skins: 82,
    tiers: [
      { color: "yellow", count: 2 },
      { color: "orange", count: 7 },
      { color: "pink", count: 14 },
      { color: "cyan", count: 20 },
      { color: "blue", count: 39 },
    ],
  },
  {
    code: "VLR2028",
    discount: "-30%",
    oldPrice: "3.000.000 VND",
    newPrice: "2.100.000 VND",
    skins: 71,
    tiers: [
      { color: "yellow", count: 1 },
      { color: "orange", count: 6 },
      { color: "pink", count: 5 },
      { color: "cyan", count: 15 },
      { color: "blue", count: 44 },
    ],
  },
  {
    code: "VLR2121",
    discount: "-45%",
    oldPrice: "7.100.000 VND",
    newPrice: "3.905.000 VND",
    skins: 56,
    tiers: [
      { color: "yellow", count: 6 },
      { color: "orange", count: 16 },
      { color: "pink", count: 4 },
      { color: "cyan", count: 8 },
      { color: "blue", count: 22 },
    ],
  },
  {
    code: "MENZU732",
    discount: "-30%",
    oldPrice: "2.100.000 VND",
    newPrice: "1.470.000 VND",
    skins: 25,
    tiers: [
      { color: "orange", count: 2 },
      { color: "pink", count: 6 },
      { color: "cyan", count: 5 },
      { color: "blue", count: 12 },
    ],
  },
  {
    code: "VLR2124",
    discount: "-50%",
    oldPrice: "6.300.000 VND",
    newPrice: "3.150.000 VND",
    skins: 114,
    tiers: [
      { color: "orange", count: 13 },
      { color: "pink", count: 11 },
      { color: "cyan", count: 33 },
      { color: "blue", count: 57 },
    ],
  },
  {
    code: "MENZU733",
    discount: "-51%",
    oldPrice: "6.000.000 VND",
    newPrice: "2.970.000 VND",
    skins: 64,
    tiers: [
      { color: "orange", count: 19 },
      { color: "pink", count: 5 },
      { color: "cyan", count: 14 },
      { color: "blue", count: 26 },
    ],
  },
  {
    code: "VLR2127",
    discount: "-45%",
    oldPrice: "6.800.000 VND",
    newPrice: "3.740.000 VND",
    skins: 54,
    tiers: [
      { color: "yellow", count: 4 },
      { color: "orange", count: 14 },
      { color: "pink", count: 3 },
      { color: "cyan", count: 11 },
      { color: "blue", count: 22 },
    ],
  },
  {
    code: "MENZU736",
    discount: "-50%",
    oldPrice: "5.700.000 VND",
    newPrice: "2.850.000 VND",
    skins: 66,
    tiers: [
      { color: "orange", count: 11 },
      { color: "pink", count: 10 },
      { color: "cyan", count: 12 },
      { color: "blue", count: 33 },
    ],
  },
  {
    code: "MENZU737",
    discount: "-50%",
    oldPrice: "4.900.000 VND",
    newPrice: "2.450.000 VND",
    skins: 61,
    tiers: [
      { color: "yellow", count: 1 },
      { color: "orange", count: 14 },
      { color: "pink", count: 2 },
      { color: "cyan", count: 14 },
      { color: "blue", count: 30 },
    ],
  },
  {
    code: "VLR2134",
    discount: "-55%",
    oldPrice: "6.600.000 VND",
    newPrice: "2.970.000 VND",
    skins: 47,
    tiers: [
      { color: "orange", count: 14 },
      { color: "pink", count: 5 },
      { color: "cyan", count: 11 },
      { color: "blue", count: 17 },
    ],
  },
  {
    code: "VLR2133",
    discount: "-45%",
    oldPrice: "8.300.000 VND",
    newPrice: "4.565.000 VND",
    skins: 100,
    tiers: [
      { color: "yellow", count: 3 },
      { color: "orange", count: 20 },
      { color: "pink", count: 10 },
      { color: "cyan", count: 23 },
      { color: "blue", count: 44 },
    ],
  },
  {
    code: "VLR2135",
    discount: "-20%",
    oldPrice: "1.800.000 VND",
    newPrice: "1.440.000 VND",
    skins: 38,
    tiers: [
      { color: "yellow", count: 1 },
      { color: "orange", count: 5 },
      { color: "pink", count: 3 },
      { color: "cyan", count: 11 },
      { color: "blue", count: 18 },
    ],
  },
  {
    code: "MENZU742",
    discount: "-45%",
    oldPrice: "4.200.000 VND",
    newPrice: "2.310.000 VND",
    skins: 55,
    tiers: [
      { color: "orange", count: 7 },
      { color: "pink", count: 11 },
      { color: "cyan", count: 15 },
      { color: "blue", count: 22 },
    ],
  },
  {
    code: "VLR2136",
    discount: "-60%",
    oldPrice: "17.200.000 VND",
    newPrice: "6.880.000 VND",
    skins: 184,
    tiers: [
      { color: "yellow", count: 4 },
      { color: "orange", count: 39 },
      { color: "pink", count: 15 },
      { color: "cyan", count: 40 },
      { color: "blue", count: 86 },
    ],
  },
  {
    code: "MENZU743",
    discount: "-60%",
    oldPrice: "9.900.000 VND",
    newPrice: "3.960.000 VND",
    skins: 138,
    tiers: [
      { color: "yellow", count: 2 },
      { color: "orange", count: 23 },
      { color: "pink", count: 11 },
      { color: "cyan", count: 34 },
      { color: "blue", count: 68 },
    ],
  },
  {
    code: "VLR2137",
    discount: null,
    oldPrice: null,
    newPrice: "850.000 VND",
    skins: 4,
    tiers: [
      { color: "orange", count: 1 },
      { color: "pink", count: 2 },
      { color: "blue", count: 1 },
    ],
  },
  {
    code: "MENZU744",
    discount: "-45%",
    oldPrice: "5.300.000 VND",
    newPrice: "2.915.000 VND",
    skins: 48,
    tiers: [
      { color: "yellow", count: 1 },
      { color: "orange", count: 10 },
      { color: "pink", count: 8 },
      { color: "cyan", count: 12 },
      { color: "blue", count: 17 },
    ],
  },
];
