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

  // --- Tài khoản nhận chuyển khoản ------------------------------------------
  /**
   * Every account the shop can be paid into. The customer picks one on the
   * wallet page; reconciliation reads all of them, so a transfer settles the
   * request whichever bank it arrived at.
   */
  bankAccounts: BankAccountConfig[];

  // --- Nạp tự động ----------------------------------------------------------
  /** When on, a matched transfer credits the wallet without an admin. */
  autoTopUpEnabled: boolean;
  /** Shared secret a provider must present when it pushes to the webhook. */
  topUpApiKey: string;

  /**
   * Cloudflare Turnstile. Both halves or neither: the widget cannot be drawn
   * without the site key, and a token cannot be checked without the secret,
   * so half a pair would either show a broken box or accept anything.
   */
  turnstileSiteKey: string;
  turnstileSecretKey: string;
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
  /** Fixed artwork behind every page, sitting under a dimming overlay. */
  siteBackground: string;
  /** Backdrop inside the homepage flash-sale frame, shown at 10% opacity. */
  flashSaleBackground: string;

  /**
   * The pictures behind the sign-in and sign-up cards. One means a still
   * panel; several become a slideshow when the switch below is on.
   */
  authPanelImages: string[];
  authSlideEnabled: boolean;
  /** Seconds each picture holds before the next slides in. */
  authSlideSeconds: number;
  authPanelSubtitle: string;
  /** Newlines are line breaks — the overlay is two short words on two rows. */
  authLoginTitle: string;
  authSignupTitle: string;
  /** Empty means "leave the link inert", which is how the capture shipped. */
  contactZalo: string;
  contactFacebook: string;
  contactHotline: string;

  // --- Bố cục trang chủ -----------------------------------------------------
  /** Ordered block ids; a leading "-" marks the block as hidden. */
  homeBlocks: string[];
  /** Category slugs feeding the "Sản phẩm nổi bật" row. */
  homeValorantSlugs: string[];
  /**
   * Category slugs feeding the second row, "Danh sách game". The field and
   * its storage key still say tft, from when the row was Đấu Trường Chân Lý;
   * renaming the key would reset every shop that had configured it.
   */
  homeTftSlugs: string[];

  // --- Hero -----------------------------------------------------------------
  /** Newlines are line breaks: the heading is written to sit on two rows. */
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryLabel: string;
  heroPrimaryHref: string;
  heroSecondaryLabel: string;
  heroSecondaryHref: string;
  /**
   * Plays in the artwork frame instead of `heroBanner` when set. Empty means
   * the still image, which is what every shop starts with.
   */
  heroVideo: string;
  /** Whether the hero draws the shooting-star streaks over the starfield. */
  heroShootingStars: boolean;

  /** Category slugs shown as the "Danh mục sản phẩm" tiles. */
  homeCategorySlugs: string[];
  /** Article slugs shown in the "Xem hướng dẫn" section. */
  homeDocSlugs: string[];
  /** Service slugs shown in "Dịch vụ nổi bật". Empty means every service. */
  /** Cards per product row, so a row of twelve can be trimmed to four. */
  homeRowCount: number;

  // --- SEO Content ----------------------------------------------------------
  seoHeading: string;
  seoBody: string;
  seoFaq: FaqEntry[];
}

/** One question and its answer in the SEO block at the foot of the home page. */
export interface FaqEntry {
  q: string;
  a: string;
}

/** One account the shop can be paid into. */
export interface BankAccountConfig {
  /** VietQR bank code — "VCB", "OCB", or the 970xxx BIN. Drives the QR. */
  code: string;
  name: string;
  account: string;
  holder: string;
  /**
   * Where to read this account's statement, if the provider answers rather
   * than pushes. Each bank gets its own: sieuthicode hands out one endpoint
   * per account, and the token in it belongs to that account alone.
   */
  apiUrl: string;
}

/**
 * Every home-page block, in the order a fresh install renders them.
 *
 * The seven the layout is built around — hero, danh mục, hướng dẫn, hot
 * trending, danh sách game, dịch vụ, SEO — run in that order. The rest are
 * older blocks kept where they were and switchable, rather than deleted out
 * from under a shop that is using them.
 *
 * Ids outlive labels here. "valorant", "tft" and "gameServices" are what the
 * rows were called when they were written, and a shop's saved layout is a
 * list of those ids: renaming one would drop that block from every layout
 * already stored.
 */
export const HOME_BLOCKS: { id: string; label: string }[] = [
  { id: "hero", label: "Hero (2 cột)" },
  { id: "flash", label: "Flash sale hôm nay" },
  { id: "featured", label: "Danh mục sản phẩm" },
  { id: "docs", label: "Xem hướng dẫn" },
  // Every group row, in group order. One block for all of them because a shop
  // can make as many groups as it likes, and a block list cannot grow a new
  // entry each time somebody adds one.
  { id: "groups", label: "Các nhóm danh mục" },
  { id: "reviews", label: "Đánh giá khách hàng" },
  // Sits under the reviews by default — social proof, then who stands behind
  // it. "ticker" (recent purchases) used to live here; layouts that still
  // store that id simply have it filtered out on read.
  { id: "partners", label: "Đối tác uy tín" },
  { id: "utilities", label: "Khối tiện ích cuối trang" },
  { id: "seo", label: "SEO Content" },
];

const LOGO = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/logos/menzu-logo.webp";
const BANNER = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload/bannermung9-7-26.webp";
/** The captured artwork behind the sign-in card, and what "khôi phục" returns to. */
export const AUTH_PANEL =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/valorant-api/bundles/cb572643-4ce2-b10a-bb56-7c90cc09b19c.webp";
/** The fixed artwork behind every page, and what "khôi phục" returns to. */
export const BACKDROP =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/behance/e4307d166239615.6418bdb0084a4.webp";

export const DEFAULT_SETTINGS: ShopSettings = {
  topUpMin: 10_000,
  topUpPresets: [50_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000],
  bankTopUpEnabled: true,
  cardTopUpEnabled: true,
  // Empty on purpose: an account number is the shop's own, and a placeholder
  // here would be a stranger's account printed under a QR code. Until one is
  // added, the bank tab says so and the endpoint refuses.
  bankAccounts: [],
  autoTopUpEnabled: false,
  topUpApiKey: "",
  turnstileSiteKey: "",
  turnstileSecretKey: "",
  purchasesEnabled: true,
  closedMessage: "Shop đang tạm ngưng bán hàng, vui lòng quay lại sau ít phút.",

  brandName: "Menzu Valorant",
  brandLogo: LOGO,
  brandColor: "#7C3AED",
  heroBanner: BANNER,
  siteBackground: BACKDROP,
  flashSaleBackground:
    "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/behance/f945cb242281183.696998e170840.webp",
  authPanelImages: [AUTH_PANEL],
  authSlideEnabled: true,
  authSlideSeconds: 5,
  authPanelSubtitle: "Menzu Valorant",
  authLoginTitle: "Welcome\nBack",
  authSignupTitle: "Join\nUs",
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

  // The words the hero shipped with, so moving them into settings changes
  // nothing on screen until somebody edits one.
  heroTitle: "THICHTHIHACK.COM",
  heroSubtitle:
    "Kho tài khoản Valorant, phần mềm và dịch vụ gaming. Giao dịch nhanh chóng, " +
    "hỗ trợ tận tâm và cập nhật sản phẩm mỗi ngày.",
  heroPrimaryLabel: "Xem sản phẩm",
  heroPrimaryHref: "/categories",
  heroSecondaryLabel: "Xem hướng dẫn",
  heroSecondaryHref: "/docs",
  heroVideo: "",
  heroShootingStars: true,

  // Empty means "whatever the section already showed": the captured tiles for
  // categories, every service for the service rows, the newest guides for the
  // docs section. A shop that never opens this screen sees no change.
  homeCategorySlugs: [],
  homeDocSlugs: [],
  homeRowCount: 8,

  seoHeading: "",
  seoBody: "",
  seoFaq: [],
};

/** Most cards a single home-page row may show. */
export const ROW_COUNT_MIN = 1;
export const ROW_COUNT_MAX = 24;

/** Dotted storage keys. Renaming one silently resets it, so they are fixed. */
export const SETTING_KEYS: Record<keyof ShopSettings, string> = {
  topUpMin: "topup.min",
  topUpPresets: "topup.presets",
  bankTopUpEnabled: "topup.bank",
  cardTopUpEnabled: "topup.card",
  bankAccounts: "bank.accounts",
  autoTopUpEnabled: "topup.auto",
  topUpApiKey: "topup.apiKey",
  turnstileSiteKey: "turnstile.siteKey",
  turnstileSecretKey: "turnstile.secretKey",
  purchasesEnabled: "shop.purchases",
  closedMessage: "shop.closedMessage",

  brandName: "brand.name",
  brandLogo: "brand.logo",
  brandColor: "brand.color",
  heroBanner: "brand.heroBanner",
  siteBackground: "brand.background",
  flashSaleBackground: "home.flashSale.background",
  authPanelImages: "auth.panelImages",
  authSlideEnabled: "auth.slide",
  authSlideSeconds: "auth.slideSeconds",
  authPanelSubtitle: "auth.panelSubtitle",
  authLoginTitle: "auth.loginTitle",
  authSignupTitle: "auth.signupTitle",
  contactZalo: "contact.zalo",
  contactFacebook: "contact.facebook",
  contactHotline: "contact.hotline",

  homeBlocks: "home.blocks",
  homeValorantSlugs: "home.row.valorant",
  homeTftSlugs: "home.row.tft",

  heroTitle: "home.hero.title",
  heroSubtitle: "home.hero.subtitle",
  heroPrimaryLabel: "home.hero.ctaLabel",
  heroPrimaryHref: "home.hero.ctaHref",
  heroSecondaryLabel: "home.hero.altLabel",
  heroSecondaryHref: "home.hero.altHref",
  heroVideo: "home.hero.video",
  heroShootingStars: "home.hero.shootingStars",

  homeCategorySlugs: "home.row.categories",
  homeDocSlugs: "home.row.docs",
  homeRowCount: "home.row.count",

  seoHeading: "home.seo.heading",
  seoBody: "home.seo.body",
  seoFaq: "home.seo.faq",
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
/** Where the single panel image lived before the slideshow replaced it. */
const LEGACY_PANEL_IMAGE_KEY = "auth.panelImage";

/** Slowest and fastest the slideshow may be set to, in seconds. */
export const SLIDE_SECONDS_MIN = 2;
export const SLIDE_SECONDS_MAX = 60;

export function clampSlideSeconds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.authSlideSeconds;
  return Math.min(SLIDE_SECONDS_MAX, Math.max(SLIDE_SECONDS_MIN, Math.round(value)));
}

function toSlideSeconds(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_SETTINGS.authSlideSeconds;
  return clampSlideSeconds(Number(raw));
}

/**
 * The panel's pictures, from whatever is stored.
 *
 * Never empty: an empty list would render a panel with no <Image src>, which
 * throws at render and takes the whole sign-in page down. Falling back to the
 * captured artwork keeps the page up whatever the row says.
 */
export function readImageList(value: unknown): string[] {
  const list = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  const cleaned = list.map((item) => item.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [DEFAULT_SETTINGS.authPanelImages[0]!];
}

function toImageList(raw: string | undefined, legacy: string | undefined): string[] {
  if (raw === undefined) {
    return legacy?.trim() ? [legacy.trim()] : DEFAULT_SETTINGS.authPanelImages;
  }
  try {
    return readImageList(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS.authPanelImages;
  }
}

/**
 * Reads the saved block order, then appends any block the stored list has
 * never heard of. Without that, a block added to the site later would be
 * invisible on every shop that had already saved a layout.
 *
 * Appended, not slotted into place. Inserting each new block beside its
 * default-order neighbour reads better on paper and misbehaves in practice:
 * a shop that has genuinely rearranged its page has no position that means
 * what the default order meant, and a new block lands in front of something
 * deliberately put first. The end of the list is always somewhere the admin
 * can see it and move it, and it disturbs nothing on the way.
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

function toFaq(raw: unknown): FaqEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const entry = (row ?? {}) as Record<string, unknown>;
      return { q: String(entry.q ?? "").trim(), a: String(entry.a ?? "").trim() };
    })
    // A question with no answer is a half-typed row, not an FAQ entry.
    .filter((entry) => entry.q && entry.a);
}

function toFaqStored(raw: string | undefined): FaqEntry[] {
  if (raw === undefined) return DEFAULT_SETTINGS.seoFaq;
  try {
    return toFaq(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS.seoFaq;
  }
}

function toTextList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item).trim()).filter(Boolean);
}

export function clampRowCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.homeRowCount;
  return Math.min(ROW_COUNT_MAX, Math.max(ROW_COUNT_MIN, Math.round(value)));
}

/**
 * Whether the shop can actually receive a transfer.
 *
 * Bank top-ups stay switched on by default, but a shop that has not filled in
 * its account cannot take one — showing a QR with nobody's account behind it
 * would take money nowhere.
 */
export function bankReady(settings: ShopSettings): boolean {
  return settings.bankAccounts.length > 0;
}

/** Trims one account and drops it if the essentials are missing. */
function toAccount(raw: unknown): BankAccountConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const account: BankAccountConfig = {
    code: String(row.code ?? "").trim().toUpperCase(),
    name: String(row.name ?? "").trim(),
    account: String(row.account ?? "").replace(/[^0-9]/g, ""),
    holder: String(row.holder ?? "").trim(),
    apiUrl: String(row.apiUrl ?? "").trim(),
  };

  // A row without these three cannot receive anything, so it is a half-typed
  // draft rather than an account.
  if (!account.code || !account.account || !account.holder) return null;
  return account;
}

/**
 * Reads the account list, falling back to the single-account keys this used to
 * store. A shop that configured one account before the list existed keeps
 * working without anybody re-typing their bank details.
 */
function toAccounts(
  stored: Map<string, string>,
  fallback: BankAccountConfig[],
): BankAccountConfig[] {
  const raw = stored.get(SETTING_KEYS.bankAccounts);
  if (raw !== undefined) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(toAccount).filter((a): a is BankAccountConfig => a !== null);
      }
    } catch {
      // Corrupt JSON falls through to the legacy keys, then to the default.
    }
  }

  const legacy = toAccount({
    code: stored.get("bank.code"),
    name: stored.get("bank.name"),
    account: stored.get("bank.account"),
    holder: stored.get("bank.holder"),
    apiUrl: stored.get("topup.apiUrl"),
  });
  return legacy ? [legacy] : fallback;
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
    bankAccounts: toAccounts(stored, DEFAULT_SETTINGS.bankAccounts),
    autoTopUpEnabled: toBoolean(
      stored.get(SETTING_KEYS.autoTopUpEnabled),
      DEFAULT_SETTINGS.autoTopUpEnabled,
    ),
    topUpApiKey: toOptionalText(stored.get(SETTING_KEYS.topUpApiKey), DEFAULT_SETTINGS.topUpApiKey),
    turnstileSiteKey: toOptionalText(
      stored.get(SETTING_KEYS.turnstileSiteKey),
      DEFAULT_SETTINGS.turnstileSiteKey,
    ),
    turnstileSecretKey: toOptionalText(
      stored.get(SETTING_KEYS.turnstileSecretKey),
      DEFAULT_SETTINGS.turnstileSecretKey,
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
    siteBackground: toText(
      stored.get(SETTING_KEYS.siteBackground),
      DEFAULT_SETTINGS.siteBackground,
    ),
    flashSaleBackground: toText(
      stored.get(SETTING_KEYS.flashSaleBackground),
      DEFAULT_SETTINGS.flashSaleBackground,
    ),
    // The old single-image key is read when the list has never been written,
    // so a shop that picked a picture before the slideshow existed keeps it
    // rather than silently reverting to the captured default.
    authPanelImages: toImageList(
      stored.get(SETTING_KEYS.authPanelImages),
      stored.get(LEGACY_PANEL_IMAGE_KEY),
    ),
    authSlideEnabled: toBoolean(
      stored.get(SETTING_KEYS.authSlideEnabled),
      DEFAULT_SETTINGS.authSlideEnabled,
    ),
    authSlideSeconds: toSlideSeconds(stored.get(SETTING_KEYS.authSlideSeconds)),
    authPanelSubtitle: toText(
      stored.get(SETTING_KEYS.authPanelSubtitle),
      DEFAULT_SETTINGS.authPanelSubtitle,
    ),
    authLoginTitle: toText(
      stored.get(SETTING_KEYS.authLoginTitle),
      DEFAULT_SETTINGS.authLoginTitle,
    ),
    authSignupTitle: toText(
      stored.get(SETTING_KEYS.authSignupTitle),
      DEFAULT_SETTINGS.authSignupTitle,
    ),
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

    heroTitle: toText(stored.get(SETTING_KEYS.heroTitle), DEFAULT_SETTINGS.heroTitle),
    heroSubtitle: toOptionalText(
      stored.get(SETTING_KEYS.heroSubtitle),
      DEFAULT_SETTINGS.heroSubtitle,
    ),
    heroPrimaryLabel: toText(
      stored.get(SETTING_KEYS.heroPrimaryLabel),
      DEFAULT_SETTINGS.heroPrimaryLabel,
    ),
    heroPrimaryHref: toText(
      stored.get(SETTING_KEYS.heroPrimaryHref),
      DEFAULT_SETTINGS.heroPrimaryHref,
    ),
    heroSecondaryLabel: toOptionalText(
      stored.get(SETTING_KEYS.heroSecondaryLabel),
      DEFAULT_SETTINGS.heroSecondaryLabel,
    ),
    heroSecondaryHref: toOptionalText(
      stored.get(SETTING_KEYS.heroSecondaryHref),
      DEFAULT_SETTINGS.heroSecondaryHref,
    ),
    heroVideo: toOptionalText(stored.get(SETTING_KEYS.heroVideo), DEFAULT_SETTINGS.heroVideo),
    heroShootingStars: toBoolean(
      stored.get(SETTING_KEYS.heroShootingStars),
      DEFAULT_SETTINGS.heroShootingStars,
    ),

    homeCategorySlugs: toSlugList(
      stored.get(SETTING_KEYS.homeCategorySlugs),
      DEFAULT_SETTINGS.homeCategorySlugs,
    ),
    homeDocSlugs: toSlugList(stored.get(SETTING_KEYS.homeDocSlugs), DEFAULT_SETTINGS.homeDocSlugs),
    homeRowCount:
      stored.get(SETTING_KEYS.homeRowCount) === undefined
        ? DEFAULT_SETTINGS.homeRowCount
        : clampRowCount(Number(stored.get(SETTING_KEYS.homeRowCount))),

    seoHeading: toOptionalText(stored.get(SETTING_KEYS.seoHeading), DEFAULT_SETTINGS.seoHeading),
    seoBody: toOptionalText(stored.get(SETTING_KEYS.seoBody), DEFAULT_SETTINGS.seoBody),
    seoFaq: toFaqStored(stored.get(SETTING_KEYS.seoFaq)),
  };
}

/** The rows to write for a settings object, in key order. */
export function serializeSettings(settings: ShopSettings): { key: string; value: string }[] {
  const values: Record<keyof ShopSettings, string> = {
    topUpMin: String(Math.floor(settings.topUpMin)),
    topUpPresets: settings.topUpPresets.map((preset) => Math.floor(preset)).join(","),
    bankTopUpEnabled: String(settings.bankTopUpEnabled),
    cardTopUpEnabled: String(settings.cardTopUpEnabled),
    bankAccounts: JSON.stringify(settings.bankAccounts),
    autoTopUpEnabled: String(settings.autoTopUpEnabled),
    topUpApiKey: settings.topUpApiKey.trim(),
    turnstileSiteKey: settings.turnstileSiteKey.trim(),
    turnstileSecretKey: settings.turnstileSecretKey.trim(),
    purchasesEnabled: String(settings.purchasesEnabled),
    closedMessage: settings.closedMessage.trim(),

    brandName: settings.brandName.trim(),
    brandLogo: settings.brandLogo.trim(),
    brandColor: settings.brandColor.trim(),
    heroBanner: settings.heroBanner.trim(),
    siteBackground: settings.siteBackground.trim(),
    flashSaleBackground: settings.flashSaleBackground.trim(),
    authPanelImages: JSON.stringify(settings.authPanelImages),
    authSlideEnabled: String(settings.authSlideEnabled),
    authSlideSeconds: String(settings.authSlideSeconds),
    authPanelSubtitle: settings.authPanelSubtitle.trim(),
    authLoginTitle: settings.authLoginTitle.trim(),
    authSignupTitle: settings.authSignupTitle.trim(),
    contactZalo: settings.contactZalo.trim(),
    contactFacebook: settings.contactFacebook.trim(),
    contactHotline: settings.contactHotline.trim(),

    homeBlocks: settings.homeBlocks.join(","),
    homeValorantSlugs: settings.homeValorantSlugs.join(","),
    homeTftSlugs: settings.homeTftSlugs.join(","),

    // Not trimmed per line: the newline between the two rows is the layout.
    heroTitle: settings.heroTitle.trim(),
    heroSubtitle: settings.heroSubtitle.trim(),
    heroPrimaryLabel: settings.heroPrimaryLabel.trim(),
    heroPrimaryHref: settings.heroPrimaryHref.trim(),
    heroSecondaryLabel: settings.heroSecondaryLabel.trim(),
    heroSecondaryHref: settings.heroSecondaryHref.trim(),
    heroVideo: settings.heroVideo.trim(),
    heroShootingStars: String(settings.heroShootingStars),

    homeCategorySlugs: settings.homeCategorySlugs.join(","),
    homeDocSlugs: settings.homeDocSlugs.join(","),
    homeRowCount: String(settings.homeRowCount),

    seoHeading: settings.seoHeading.trim(),
    seoBody: settings.seoBody.trim(),
    seoFaq: JSON.stringify(settings.seoFaq),
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
    // Half-typed rows are dropped rather than saved: an account without a
    // number cannot receive anything, and printing one under a QR would be
    // worse than showing nothing.
    bankAccounts: Array.isArray(raw?.bankAccounts)
      ? raw.bankAccounts.map(toAccount).filter((a): a is BankAccountConfig => a !== null)
      : DEFAULT_SETTINGS.bankAccounts,
    autoTopUpEnabled: Boolean(raw?.autoTopUpEnabled),
    topUpApiKey: String(raw?.topUpApiKey ?? "").trim(),
    turnstileSiteKey: String(raw?.turnstileSiteKey ?? "").trim(),
    turnstileSecretKey: String(raw?.turnstileSecretKey ?? "").trim(),
    purchasesEnabled: Boolean(raw?.purchasesEnabled),
    closedMessage: String(raw?.closedMessage ?? "").trim(),

    // Identity falls back to the default when blank: a shop with no name in
    // the header looks broken, and blank is never a deliberate choice here.
    brandName: String(raw?.brandName ?? "").trim() || DEFAULT_SETTINGS.brandName,
    brandLogo: String(raw?.brandLogo ?? "").trim() || DEFAULT_SETTINGS.brandLogo,
    brandColor: String(raw?.brandColor ?? "").trim() || DEFAULT_SETTINGS.brandColor,
    heroBanner: String(raw?.heroBanner ?? "").trim() || DEFAULT_SETTINGS.heroBanner,
    siteBackground: String(raw?.siteBackground ?? "").trim() || DEFAULT_SETTINGS.siteBackground,
    flashSaleBackground:
      String(raw?.flashSaleBackground ?? "").trim() || DEFAULT_SETTINGS.flashSaleBackground,
    // Blank falls back to the default rather than leaving an empty <Image src>,
    // which throws at render and takes the whole sign-in page with it.
    authPanelImages: readImageList(raw?.authPanelImages),
    authSlideEnabled: Boolean(raw?.authSlideEnabled),
    authSlideSeconds: clampSlideSeconds(Number(raw?.authSlideSeconds)),
    authPanelSubtitle: String(raw?.authPanelSubtitle ?? "").trim(),
    authLoginTitle: String(raw?.authLoginTitle ?? "").trim(),
    authSignupTitle: String(raw?.authSignupTitle ?? "").trim(),
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

    // The heading and the first button fall back when blank — a hero with no
    // words and a button with no label are broken, never a choice. The rest
    // may be emptied on purpose: no second button.
    heroTitle: String(raw?.heroTitle ?? "").trim() || DEFAULT_SETTINGS.heroTitle,
    heroSubtitle: String(raw?.heroSubtitle ?? "").trim(),
    heroPrimaryLabel:
      String(raw?.heroPrimaryLabel ?? "").trim() || DEFAULT_SETTINGS.heroPrimaryLabel,
    heroPrimaryHref: String(raw?.heroPrimaryHref ?? "").trim() || DEFAULT_SETTINGS.heroPrimaryHref,
    heroSecondaryLabel: String(raw?.heroSecondaryLabel ?? "").trim(),
    heroSecondaryHref: String(raw?.heroSecondaryHref ?? "").trim(),
    heroVideo: String(raw?.heroVideo ?? "").trim(),
    heroShootingStars: Boolean(raw?.heroShootingStars),

    homeCategorySlugs: toTextList(raw?.homeCategorySlugs),
    homeDocSlugs: toTextList(raw?.homeDocSlugs),
    homeRowCount: clampRowCount(Number(raw?.homeRowCount)),

    seoHeading: String(raw?.seoHeading ?? "").trim(),
    seoBody: String(raw?.seoBody ?? "").trim(),
    seoFaq: toFaq(raw?.seoFaq),
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
  // Auto top-up credits wallets with no human in the loop, so it needs a way
  // to hear about a transfer: either an address to poll — providers like
  // sieuthicode put the credentials in the URL itself — or a key that a
  // pushing provider must present. The webhook stays shut without a key
  // regardless, so it can never be an open endpoint.
  const polled = settings.bankAccounts.filter((account) => account.apiUrl);
  if (settings.autoTopUpEnabled && !settings.topUpApiKey && polled.length === 0) {
    return "Bật nạp tự động thì cần địa chỉ API đối soát ở ít nhất một tài khoản, hoặc API key cho webhook";
  }

  for (const account of settings.bankAccounts) {
    const label = account.name || account.code;
    // Goes into a VietQR URL, so it has to be the plain code the service uses.
    if (!/^[A-Z0-9]{3,10}$/.test(account.code)) {
      return `${label}: mã ngân hàng chỉ gồm chữ và số, ví dụ VCB hoặc OCB`;
    }
    if (account.account.length < 6) {
      return `${label}: số tài khoản trông quá ngắn, kiểm tra lại giúp mình`;
    }
    // The token usually rides in this URL, so it may not travel in the clear.
    if (account.apiUrl && !/^https:\/\//.test(account.apiUrl)) {
      return `${label}: địa chỉ API phải bắt đầu bằng https://`;
    }
  }

  const duplicate = settings.bankAccounts.find(
    (account, index) =>
      settings.bankAccounts.findIndex(
        (other) => other.code === account.code && other.account === account.account,
      ) !== index,
  );
  if (duplicate) {
    return `Tài khoản ${duplicate.account} bị khai hai lần`;
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
  if (settings.heroVideo && !settings.heroVideo.startsWith("/") &&
      !/^https?:\/\//.test(settings.heroVideo)) {
    return "Video hero phải là đường dẫn bắt đầu bằng / hoặc http";
  }
  // Written straight into href. A link that is neither a path nor a URL goes
  // nowhere, and "javascript:" would go somewhere worse.
  for (const [label, href] of [
    ["Nút chính", settings.heroPrimaryHref],
    ["Nút phụ", settings.heroSecondaryHref],
  ] as const) {
    if (href && !href.startsWith("/") && !/^https?:\/\//.test(href)) {
      return `${label} của hero phải là đường dẫn bắt đầu bằng / hoặc http`;
    }
  }
  if (settings.seoFaq.length > 20) {
    return "Tối đa 20 câu hỏi trong phần SEO Content";
  }
  return null;
}
