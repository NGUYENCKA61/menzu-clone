/**
 * Shop settings that used to be constants in the code.
 *
 * This module is the shape of a setting: its default, how it is spelled in the
 * database, and what counts as valid. It deliberately touches no database, so
 * the rules can be tested directly — reading and writing them lives in
 * `settingsStore.ts`.
 *
 * The defaults below reproduce the behaviour the shop had before this table
 * existed, so an install with no rows written behaves exactly as it did: a
 * setting only ever changes something once someone changes it on purpose.
 */
export interface ShopSettings {
  /** Smallest accepted top-up, in đồng. */
  topUpMin: number;
  /** The amount buttons offered on /wallet. */
  topUpPresets: number[];
  bankTopUpEnabled: boolean;
  cardTopUpEnabled: boolean;
  /** When false, the buy endpoint refuses with `closedMessage`. */
  purchasesEnabled: boolean;
  closedMessage: string;

  // --- Nhận diện ------------------------------------------------------------
  /** Shown in the header, the footer and the browser tab. */
  brandName: string;
  brandLogo: string;
  /** Accent colour. Becomes --brand, which every button and badge reads. */
  brandColor: string;
  /** The wide image at the top of the home page. */
  heroBanner: string;
  /** Empty means "leave the link inert", which is how the capture shipped. */
  contactZalo: string;
  contactFacebook: string;
  contactHotline: string;

  // --- Bố cục trang chủ -----------------------------------------------------
  /** Ordered block ids; a leading "-" marks the block as hidden. */
  homeBlocks: string[];
  /** Category slugs feeding the "Sản phẩm nổi bật" row. */
  homeValorantSlugs: string[];
  /** Category slugs feeding the "Đấu trường chân lý" row. */
  homeTftSlugs: string[];
}

/** Every home-page block, in the order the captured site renders them. */
export const HOME_BLOCKS: { id: string; label: string }[] = [
  { id: "hero", label: "Banner đầu trang" },
  { id: "quick", label: "Thanh truy cập nhanh" },
  { id: "flash", label: "Flash sale hôm nay" },
  { id: "featured", label: "Danh mục nổi bật" },
  { id: "valorant", label: "Hàng sản phẩm nổi bật" },
  { id: "tft", label: "Hàng Đấu Trường Chân Lý" },
  { id: "gameServices", label: "Hàng dịch vụ game" },
  { id: "otherServices", label: "Hàng dịch vụ khác" },
  { id: "reviews", label: "Đánh giá khách hàng" },
  { id: "ticker", label: "Ticker giao dịch gần đây" },
  { id: "utilities", label: "Khối tiện ích cuối trang" },
];

const LOGO = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/logos/menzu-logo.webp";
const BANNER = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload/bannermung9-7-26.webp";

export const DEFAULT_SETTINGS: ShopSettings = {
  topUpMin: 10_000,
  topUpPresets: [50_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000],
  bankTopUpEnabled: true,
  cardTopUpEnabled: true,
  purchasesEnabled: true,
  closedMessage: "Shop đang tạm ngưng bán hàng, vui lòng quay lại sau ít phút.",

  brandName: "Menzu Valorant",
  brandLogo: LOGO,
  brandColor: "#7C3AED",
  heroBanner: BANNER,
  contactZalo: "",
  contactFacebook: "",
  contactHotline: "",

  homeBlocks: HOME_BLOCKS.map((block) => block.id),
  homeValorantSlugs: [
    "account-valorant-tu-chon",
    "random-valorant-20k-oi-thong-tin",
    "random-smuft-ban-rank-oi-thong-tin",
    "random-valorant-tren-lv-20-oi-thong-tin",
    "random-valorant-tren-lv-20-nfa",
  ],
  homeTftSlugs: [
    "random-acc-tft",
    "acc-tft-pet-tim",
    "acc-tft-san-tim",
    "acc-tft-hang-hieu",
  ],
};

/** Dotted storage keys. Renaming one silently resets it, so they are fixed. */
export const SETTING_KEYS: Record<keyof ShopSettings, string> = {
  topUpMin: "topup.min",
  topUpPresets: "topup.presets",
  bankTopUpEnabled: "topup.bank",
  cardTopUpEnabled: "topup.card",
  purchasesEnabled: "shop.purchases",
  closedMessage: "shop.closedMessage",

  brandName: "brand.name",
  brandLogo: "brand.logo",
  brandColor: "brand.color",
  heroBanner: "brand.heroBanner",
  contactZalo: "contact.zalo",
  contactFacebook: "contact.facebook",
  contactHotline: "contact.hotline",

  homeBlocks: "home.blocks",
  homeValorantSlugs: "home.row.valorant",
  homeTftSlugs: "home.row.tft",
};

function toNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function toBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  return raw === "true";
}

function toNumberList(raw: string | undefined, fallback: number[]): number[] {
  if (raw === undefined) return fallback;
  const values = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  // An empty list would leave /wallet with no amount buttons at all, which
  // reads as a broken page rather than a configured one.
  return values.length > 0 ? values : fallback;
}

function toText(raw: string | undefined, fallback: string): string {
  return raw?.trim() || fallback;
}

/** Optional text: an empty stored value means empty, not "use the default". */
function toOptionalText(raw: string | undefined, fallback: string): string {
  return raw === undefined ? fallback : raw.trim();
}

function toSlugList(raw: string | undefined, fallback: string[]): string[] {
  if (raw === undefined) return fallback;
  // An emptied row is a real choice — it hides the row — so unlike the top-up
  // presets this does not fall back when the list comes back empty.
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Reads the block order, then appends any block the stored list has never
 * heard of. Without that, a block added to the site later would be invisible
 * on every shop that had already saved a layout.
 */
function toBlockList(raw: string | undefined, fallback: string[]): string[] {
  if (raw === undefined) return fallback;
  const known = new Set(HOME_BLOCKS.map((block) => block.id));
  const stored = raw
    .split(",")
    .map((part) => part.trim())
    .filter((id) => known.has(id.replace(/^-/, "")));

  const seen = new Set(stored.map((id) => id.replace(/^-/, "")));
  const missing = HOME_BLOCKS.filter((block) => !seen.has(block.id)).map((b) => b.id);
  return [...stored, ...missing];
}

/** The blocks to render, in order, with the hidden ones dropped. */
export function visibleBlocks(settings: ShopSettings): string[] {
  return settings.homeBlocks.filter((id) => !id.startsWith("-"));
}

/**
 * Builds the settings object from whatever rows exist, filling every unwritten
 * or unparseable key from the defaults.
 */
export function parseSettings(rows: Iterable<{ key: string; value: string }>): ShopSettings {
  const stored = new Map<string, string>();
  for (const row of rows) stored.set(row.key, row.value);

  return {
    topUpMin: toNumber(stored.get(SETTING_KEYS.topUpMin), DEFAULT_SETTINGS.topUpMin),
    topUpPresets: toNumberList(
      stored.get(SETTING_KEYS.topUpPresets),
      DEFAULT_SETTINGS.topUpPresets,
    ),
    bankTopUpEnabled: toBoolean(
      stored.get(SETTING_KEYS.bankTopUpEnabled),
      DEFAULT_SETTINGS.bankTopUpEnabled,
    ),
    cardTopUpEnabled: toBoolean(
      stored.get(SETTING_KEYS.cardTopUpEnabled),
      DEFAULT_SETTINGS.cardTopUpEnabled,
    ),
    purchasesEnabled: toBoolean(
      stored.get(SETTING_KEYS.purchasesEnabled),
      DEFAULT_SETTINGS.purchasesEnabled,
    ),
    closedMessage:
      stored.get(SETTING_KEYS.closedMessage)?.trim() || DEFAULT_SETTINGS.closedMessage,

    brandName: toText(stored.get(SETTING_KEYS.brandName), DEFAULT_SETTINGS.brandName),
    brandLogo: toText(stored.get(SETTING_KEYS.brandLogo), DEFAULT_SETTINGS.brandLogo),
    brandColor: toText(stored.get(SETTING_KEYS.brandColor), DEFAULT_SETTINGS.brandColor),
    heroBanner: toText(stored.get(SETTING_KEYS.heroBanner), DEFAULT_SETTINGS.heroBanner),
    contactZalo: toOptionalText(
      stored.get(SETTING_KEYS.contactZalo),
      DEFAULT_SETTINGS.contactZalo,
    ),
    contactFacebook: toOptionalText(
      stored.get(SETTING_KEYS.contactFacebook),
      DEFAULT_SETTINGS.contactFacebook,
    ),
    contactHotline: toOptionalText(
      stored.get(SETTING_KEYS.contactHotline),
      DEFAULT_SETTINGS.contactHotline,
    ),

    homeBlocks: toBlockList(stored.get(SETTING_KEYS.homeBlocks), DEFAULT_SETTINGS.homeBlocks),
    homeValorantSlugs: toSlugList(
      stored.get(SETTING_KEYS.homeValorantSlugs),
      DEFAULT_SETTINGS.homeValorantSlugs,
    ),
    homeTftSlugs: toSlugList(
      stored.get(SETTING_KEYS.homeTftSlugs),
      DEFAULT_SETTINGS.homeTftSlugs,
    ),
  };
}

/** The rows to write for a settings object, in key order. */
export function serializeSettings(settings: ShopSettings): { key: string; value: string }[] {
  const values: Record<keyof ShopSettings, string> = {
    topUpMin: String(Math.floor(settings.topUpMin)),
    topUpPresets: settings.topUpPresets.map((preset) => Math.floor(preset)).join(","),
    bankTopUpEnabled: String(settings.bankTopUpEnabled),
    cardTopUpEnabled: String(settings.cardTopUpEnabled),
    purchasesEnabled: String(settings.purchasesEnabled),
    closedMessage: settings.closedMessage.trim(),

    brandName: settings.brandName.trim(),
    brandLogo: settings.brandLogo.trim(),
    brandColor: settings.brandColor.trim(),
    heroBanner: settings.heroBanner.trim(),
    contactZalo: settings.contactZalo.trim(),
    contactFacebook: settings.contactFacebook.trim(),
    contactHotline: settings.contactHotline.trim(),

    homeBlocks: settings.homeBlocks.join(","),
    homeValorantSlugs: settings.homeValorantSlugs.join(","),
    homeTftSlugs: settings.homeTftSlugs.join(","),
  };

  return (Object.keys(SETTING_KEYS) as (keyof ShopSettings)[]).map((field) => ({
    key: SETTING_KEYS[field],
    value: values[field],
  }));
}

/**
 * Coerces an untrusted request body into a settings object.
 *
 * Every field falls back to its default rather than to whatever the body
 * happened to contain, so a malformed request cannot write a half-typed value
 * into the shop's configuration.
 */
export function normalizeSettings(raw: Partial<ShopSettings> | null): ShopSettings {
  const presets = Array.isArray(raw?.topUpPresets)
    ? raw.topUpPresets
        .map((preset) => Math.floor(Number(preset)))
        .filter((preset) => Number.isFinite(preset) && preset > 0)
    : DEFAULT_SETTINGS.topUpPresets;

  const topUpMin = Math.floor(Number(raw?.topUpMin));

  return {
    topUpMin: Number.isFinite(topUpMin) ? topUpMin : Number.NaN,
    // Sorted and de-duplicated so the buttons on /wallet always read low to
    // high, whatever order they were typed in.
    topUpPresets: [...new Set(presets)].sort((a, b) => a - b),
    bankTopUpEnabled: Boolean(raw?.bankTopUpEnabled),
    cardTopUpEnabled: Boolean(raw?.cardTopUpEnabled),
    purchasesEnabled: Boolean(raw?.purchasesEnabled),
    closedMessage: String(raw?.closedMessage ?? "").trim(),

    // Identity falls back to the default when blank: a shop with no name in
    // the header looks broken, and blank is never a deliberate choice here.
    brandName: String(raw?.brandName ?? "").trim() || DEFAULT_SETTINGS.brandName,
    brandLogo: String(raw?.brandLogo ?? "").trim() || DEFAULT_SETTINGS.brandLogo,
    brandColor: String(raw?.brandColor ?? "").trim() || DEFAULT_SETTINGS.brandColor,
    heroBanner: String(raw?.heroBanner ?? "").trim() || DEFAULT_SETTINGS.heroBanner,
    // Contact details are optional — blank leaves the link inert, as captured.
    contactZalo: String(raw?.contactZalo ?? "").trim(),
    contactFacebook: String(raw?.contactFacebook ?? "").trim(),
    contactHotline: String(raw?.contactHotline ?? "").trim(),

    homeBlocks: toBlockList(
      Array.isArray(raw?.homeBlocks) ? raw.homeBlocks.join(",") : undefined,
      DEFAULT_SETTINGS.homeBlocks,
    ),
    homeValorantSlugs: Array.isArray(raw?.homeValorantSlugs)
      ? raw.homeValorantSlugs.map((slug) => String(slug).trim()).filter(Boolean)
      : DEFAULT_SETTINGS.homeValorantSlugs,
    homeTftSlugs: Array.isArray(raw?.homeTftSlugs)
      ? raw.homeTftSlugs.map((slug) => String(slug).trim()).filter(Boolean)
      : DEFAULT_SETTINGS.homeTftSlugs,
  };
}

/**
 * Checks a complete settings object, returning the first problem in Vietnamese
 * or null.
 *
 * Shared by the admin endpoint and the form so the two cannot disagree about
 * what is allowed.
 */
export function validateSettings(settings: ShopSettings): string | null {
  if (!Number.isInteger(settings.topUpMin) || settings.topUpMin < 1_000) {
    return "Mức nạp tối thiểu phải từ 1.000đ trở lên";
  }
  if (settings.topUpPresets.length === 0) {
    return "Cần ít nhất một mệnh giá gợi ý";
  }
  if (settings.topUpPresets.length > 12) {
    return "Tối đa 12 mệnh giá gợi ý";
  }
  // A preset under the minimum renders a button that always fails — the
  // customer sees the shop reject an amount the shop itself offered.
  const belowMin = settings.topUpPresets.find((preset) => preset < settings.topUpMin);
  if (belowMin !== undefined) {
    return `Mệnh giá ${belowMin.toLocaleString("vi-VN")}đ thấp hơn mức nạp tối thiểu`;
  }
  if (!settings.closedMessage.trim()) {
    return "Cần nhập thông báo hiển thị khi khóa mua hàng";
  }
  // The colour is written straight into a CSS custom property, so anything
  // that is not a plain hex would either do nothing or let arbitrary CSS in.
  if (!/^#[0-9a-fA-F]{6}$/.test(settings.brandColor)) {
    return "Màu chủ đạo phải là mã hex 6 ký tự, ví dụ #7C3AED";
  }
  for (const [label, path] of [
    ["Logo", settings.brandLogo],
    ["Ảnh banner", settings.heroBanner],
  ] as const) {
    if (!path.startsWith("/") && !/^https?:\/\//.test(path)) {
      return `${label} phải là đường dẫn bắt đầu bằng / hoặc http`;
    }
  }
  return null;
}
