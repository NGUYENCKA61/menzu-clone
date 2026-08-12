import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  HOME_BLOCKS,
  bankReady,
  SETTING_KEYS,
  normalizeSettings,
  parseSettings,
  serializeSettings,
  validateSettings,
  visibleBlocks,
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

  it("rejects a brand colour that is not a plain hex", () => {
    // It is written straight into a CSS custom property, so anything else
    // either does nothing or smuggles CSS into the page.
    for (const bad of ["red", "#FFF", "#12345", "var(--x)", "#7C3AED; }"]) {
      expect(validateSettings(settings({ brandColor: bad }))).toMatch(/Màu chủ đạo/);
    }
    expect(validateSettings(settings({ brandColor: "#00ff88" }))).toBeNull();
  });

  it("rejects a logo or banner that is not a usable path", () => {
    expect(validateSettings(settings({ brandLogo: "logo.webp" }))).toMatch(/Logo/);
    expect(validateSettings(settings({ heroBanner: "banner.webp" }))).toMatch(/banner/);
    expect(
      validateSettings(
        settings({ brandLogo: "https://cdn.example/x.webp", heroBanner: "/x.webp" }),
      ),
    ).toBeNull();
  });
});

describe("tài khoản nhận chuyển khoản", () => {
  it("chưa điền thì coi như chưa nhận được chuyển khoản", () => {
    expect(bankReady(DEFAULT_SETTINGS)).toBe(false);
    expect(bankReady(settings({ bankCode: "VCB" }))).toBe(false);
    expect(bankReady(settings({ bankCode: "VCB", bankAccount: "1234567890" }))).toBe(false);
    expect(
      bankReady(
        settings({ bankCode: "VCB", bankAccount: "1234567890", bankHolder: "NGUYEN VAN A" }),
      ),
    ).toBe(true);
  });

  it("mã ngân hàng phải là mã VietQR, không phải câu chữ", () => {
    expect(validateSettings(settings({ bankCode: "Ngân hàng ngoại thương" }))).toMatch(
      /Mã ngân hàng/,
    );
    expect(validateSettings(settings({ bankCode: "VCB" }))).toBeNull();
    expect(validateSettings(settings({ bankCode: "970436" }))).toBeNull();
  });

  it("số tài khoản chỉ giữ lại chữ số", () => {
    const result = normalizeSettings({
      ...DEFAULT_SETTINGS,
      bankAccount: "1234 5678 90",
      bankCode: "vcb",
    });
    expect(result.bankAccount).toBe("1234567890");
    // Mã ngân hàng luôn viết hoa vì nó đi thẳng vào URL của VietQR.
    expect(result.bankCode).toBe("VCB");
  });

  it("số tài khoản quá ngắn bị chặn", () => {
    expect(validateSettings(settings({ bankAccount: "123" }))).toMatch(/quá ngắn/);
  });

  it("giữ nguyên qua một vòng lưu rồi đọc lại", () => {
    const original = settings({
      bankCode: "TCB",
      bankName: "Techcombank",
      bankAccount: "19001234567",
      bankHolder: "NGUYEN VAN A",
    });
    expect(parseSettings(serializeSettings(original))).toEqual(original);
  });
});

describe("bố cục trang chủ", () => {
  it("keeps the stored order and marks hidden blocks with a dash", () => {
    const parsed = parseSettings([
      { key: SETTING_KEYS.homeBlocks, value: "flash,hero,-ticker" },
    ]);
    expect(parsed.homeBlocks.slice(0, 3)).toEqual(["flash", "hero", "-ticker"]);
    expect(visibleBlocks(parsed)).not.toContain("-ticker");
    expect(visibleBlocks(parsed).slice(0, 2)).toEqual(["flash", "hero"]);
  });

  it("appends blocks the stored layout has never heard of", () => {
    // A block added to the site later must not vanish for shops that already
    // saved a layout.
    const parsed = parseSettings([{ key: SETTING_KEYS.homeBlocks, value: "flash" }]);
    expect(parsed.homeBlocks).toHaveLength(HOME_BLOCKS.length);
    expect(parsed.homeBlocks[0]).toBe("flash");
    for (const block of HOME_BLOCKS) {
      expect(parsed.homeBlocks.some((id) => id.replace(/^-/, "") === block.id)).toBe(true);
    }
  });

  it("drops ids that no longer exist", () => {
    const parsed = parseSettings([
      { key: SETTING_KEYS.homeBlocks, value: "flash,khong-co-that" },
    ]);
    expect(parsed.homeBlocks).not.toContain("khong-co-that");
  });

  it("lets a row be emptied, which hides it", () => {
    const parsed = parseSettings([{ key: SETTING_KEYS.homeTftSlugs, value: "" }]);
    expect(parsed.homeTftSlugs).toEqual([]);
    // Unwritten is different from emptied: it still gets the defaults.
    expect(parseSettings([]).homeTftSlugs).toEqual(DEFAULT_SETTINGS.homeTftSlugs);
  });

  it("survives a round trip with a rearranged layout", () => {
    const original = settings({
      homeBlocks: [
        "flash",
        "-hero",
        ...HOME_BLOCKS.map((b) => b.id).filter((id) => id !== "flash" && id !== "hero"),
      ],
      homeValorantSlugs: ["mot-danh-muc"],
      homeTftSlugs: [],
      brandName: "Shop Của Tôi",
      brandColor: "#00FF88",
      contactZalo: "0900000000",
    });
    expect(parseSettings(serializeSettings(original))).toEqual(original);
  });
});
