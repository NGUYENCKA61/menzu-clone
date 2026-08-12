import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  normalizeSettings,
  parseSettings,
  serializeSettings,
  validateSettings,
  type ShopSettings,
} from "@/lib/settings";

function settings(overrides: Partial<ShopSettings> = {}): ShopSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("parseSettings", () => {
  it("returns the defaults when nothing has been written", () => {
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it("reads stored values over the defaults", () => {
    const parsed = parseSettings([
      { key: SETTING_KEYS.topUpMin, value: "20000" },
      { key: SETTING_KEYS.topUpPresets, value: "20000,50000,100000" },
      { key: SETTING_KEYS.cardTopUpEnabled, value: "false" },
      { key: SETTING_KEYS.closedMessage, value: "Nghỉ Tết đến mùng 6" },
    ]);

    expect(parsed.topUpMin).toBe(20_000);
    expect(parsed.topUpPresets).toEqual([20_000, 50_000, 100_000]);
    expect(parsed.cardTopUpEnabled).toBe(false);
    expect(parsed.closedMessage).toBe("Nghỉ Tết đến mùng 6");
    // Untouched keys keep behaving as they did before the table existed.
    expect(parsed.bankTopUpEnabled).toBe(true);
    expect(parsed.purchasesEnabled).toBe(true);
  });

  it("treats only the exact string \"true\" as on", () => {
    const on = parseSettings([{ key: SETTING_KEYS.purchasesEnabled, value: "true" }]);
    const off = parseSettings([{ key: SETTING_KEYS.purchasesEnabled, value: "1" }]);
    expect(on.purchasesEnabled).toBe(true);
    expect(off.purchasesEnabled).toBe(false);
  });

  it("falls back rather than accepting a corrupt value", () => {
    const parsed = parseSettings([
      { key: SETTING_KEYS.topUpMin, value: "không phải số" },
      { key: SETTING_KEYS.topUpPresets, value: "abc, -5, 0" },
      { key: SETTING_KEYS.closedMessage, value: "   " },
    ]);

    expect(parsed.topUpMin).toBe(DEFAULT_SETTINGS.topUpMin);
    expect(parsed.topUpPresets).toEqual(DEFAULT_SETTINGS.topUpPresets);
    expect(parsed.closedMessage).toBe(DEFAULT_SETTINGS.closedMessage);
  });

  it("survives a round trip through the stored rows", () => {
    const original = settings({
      topUpMin: 25_000,
      topUpPresets: [25_000, 500_000],
      bankTopUpEnabled: false,
      purchasesEnabled: false,
      closedMessage: "Bảo trì hệ thống tới 22h",
    });
    expect(parseSettings(serializeSettings(original))).toEqual(original);
  });
});

describe("normalizeSettings", () => {
  it("sorts and de-duplicates the presets", () => {
    const result = normalizeSettings({
      ...DEFAULT_SETTINGS,
      topUpPresets: [500_000, 50_000, 500_000, 200_000],
    });
    expect(result.topUpPresets).toEqual([50_000, 200_000, 500_000]);
  });

  it("drops presets that are not usable amounts", () => {
    const result = normalizeSettings({
      ...DEFAULT_SETTINGS,
      topUpPresets: [50_000, 0, -1, Number.NaN] as number[],
    });
    expect(result.topUpPresets).toEqual([50_000]);
  });

  it("does not invent a minimum when the body has none", () => {
    // NaN fails validation, which is the point: a missing minimum must be
    // rejected rather than silently reset to the default.
    expect(validateSettings(normalizeSettings({}))).not.toBeNull();
  });

  it("treats a missing toggle as off, never as on", () => {
    const result = normalizeSettings({ topUpMin: 10_000, closedMessage: "x" });
    expect(result.purchasesEnabled).toBe(false);
    expect(result.bankTopUpEnabled).toBe(false);
    expect(result.cardTopUpEnabled).toBe(false);
  });
});

describe("validateSettings", () => {
  it("accepts the defaults", () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toBeNull();
  });

  it("rejects a minimum below 1.000đ", () => {
    expect(validateSettings(settings({ topUpMin: 999 }))).toMatch(/tối thiểu/);
    expect(validateSettings(settings({ topUpMin: 0 }))).toMatch(/tối thiểu/);
  });

  it("rejects a preset the shop would then refuse", () => {
    const message = validateSettings(
      settings({ topUpMin: 100_000, topUpPresets: [50_000, 200_000] }),
    );
    expect(message).toMatch(/thấp hơn mức nạp tối thiểu/);
  });

  it("requires at least one preset and caps the list", () => {
    expect(validateSettings(settings({ topUpPresets: [] }))).toMatch(/ít nhất một/);
    const many = Array.from({ length: 13 }, (_, index) => (index + 1) * 10_000);
    expect(validateSettings(settings({ topUpMin: 10_000, topUpPresets: many }))).toMatch(
      /Tối đa 12/,
    );
  });

  it("requires a message to show while sales are paused", () => {
    expect(validateSettings(settings({ closedMessage: "   " }))).toMatch(/thông báo/);
  });

  it("allows both top-up methods to be switched off", () => {
    // A shop that has paused deposits entirely is a real state, not an error.
    expect(
      validateSettings(settings({ bankTopUpEnabled: false, cardTopUpEnabled: false })),
    ).toBeNull();
  });
});
