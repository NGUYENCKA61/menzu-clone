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
}

export const DEFAULT_SETTINGS: ShopSettings = {
  topUpMin: 10_000,
  topUpPresets: [50_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000],
  bankTopUpEnabled: true,
  cardTopUpEnabled: true,
  purchasesEnabled: true,
  closedMessage: "Shop đang tạm ngưng bán hàng, vui lòng quay lại sau ít phút.",
};

/** Dotted storage keys. Renaming one silently resets it, so they are fixed. */
export const SETTING_KEYS: Record<keyof ShopSettings, string> = {
  topUpMin: "topup.min",
  topUpPresets: "topup.presets",
  bankTopUpEnabled: "topup.bank",
  cardTopUpEnabled: "topup.card",
  purchasesEnabled: "shop.purchases",
  closedMessage: "shop.closedMessage",
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
  return null;
}
