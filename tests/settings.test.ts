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
  type BankAccountConfig,
  type ShopSettings,
} from "@/lib/settings";
import { orderBySlugs, splitTileName } from "@/lib/homeSections";

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

  it("reads the red the shop shipped with as no choice at all", () => {
    // Every install that saved Nhận diện without touching the colour stored
    // #FF3158; it must follow the stylesheet's red, not pin the old one.
    const legacy = parseSettings([{ key: SETTING_KEYS.brandColor, value: "#FF3158" }]);
    const chosen = parseSettings([{ key: SETTING_KEYS.brandColor, value: "#123456" }]);
    expect(legacy.brandColor).toBe(DEFAULT_SETTINGS.brandColor);
    expect(chosen.brandColor).toBe("#123456");
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

function account(overrides: Partial<BankAccountConfig> = {}): BankAccountConfig {
  return {
    code: "VCB",
    name: "Vietcombank",
    account: "1234567890",
    holder: "NGUYEN VAN A",
    apiUrl: "",
    ...overrides,
  };
}

describe("tài khoản nhận chuyển khoản", () => {
  it("chưa khai tài khoản nào thì coi như chưa nhận được chuyển khoản", () => {
    expect(bankReady(DEFAULT_SETTINGS)).toBe(false);
    expect(bankReady(settings({ bankAccounts: [account()] }))).toBe(true);
  });

  it("nhận nhiều ngân hàng cùng lúc", () => {
    const two = settings({
      bankAccounts: [
        account(),
        account({ code: "OCB", name: "OCB", account: "0040100036036009" }),
      ],
    });
    expect(validateSettings(two)).toBeNull();
    expect(bankReady(two)).toBe(true);
  });

  it("mã ngân hàng phải là mã VietQR, không phải câu chữ", () => {
    expect(
      validateSettings(settings({ bankAccounts: [account({ code: "Ngân hàng ngoại thương" })] })),
    ).toMatch(/mã ngân hàng/i);
    expect(validateSettings(settings({ bankAccounts: [account({ code: "OCB" })] }))).toBeNull();
    expect(validateSettings(settings({ bankAccounts: [account({ code: "970436" })] }))).toBeNull();
  });

  it("số tài khoản chỉ giữ lại chữ số và mã viết hoa", () => {
    const result = normalizeSettings({
      ...DEFAULT_SETTINGS,
      bankAccounts: [account({ account: "0040 1000 3603 6009", code: "ocb" })],
    });
    expect(result.bankAccounts[0].account).toBe("0040100036036009");
    // Mã ngân hàng luôn viết hoa vì nó đi thẳng vào URL của VietQR.
    expect(result.bankAccounts[0].code).toBe("OCB");
  });

  it("bỏ dòng khai dở dang thay vì lưu tài khoản không nhận được tiền", () => {
    const result = normalizeSettings({
      ...DEFAULT_SETTINGS,
      bankAccounts: [account(), { code: "OCB", name: "OCB", account: "", holder: "", apiUrl: "" }],
    });
    expect(result.bankAccounts).toHaveLength(1);
  });

  it("số tài khoản quá ngắn bị chặn", () => {
    expect(validateSettings(settings({ bankAccounts: [account({ account: "123" })] }))).toMatch(
      /quá ngắn/,
    );
  });

  it("chặn khai trùng một tài khoản hai lần", () => {
    expect(
      validateSettings(settings({ bankAccounts: [account(), account()] })),
    ).toMatch(/hai lần/);
  });

  it("địa chỉ API phải là https vì token nằm trong đó", () => {
    expect(
      validateSettings(
        settings({ bankAccounts: [account({ apiUrl: "http://api.sieuthicode.vn/x" })] }),
      ),
    ).toMatch(/https/);
  });

  it("bật auto cần API key hoặc ít nhất một địa chỉ đối soát", () => {
    expect(
      validateSettings(settings({ autoTopUpEnabled: true, bankAccounts: [account()] })),
    ).toMatch(/API key/);
    expect(
      validateSettings(
        settings({
          autoTopUpEnabled: true,
          bankAccounts: [account({ apiUrl: "https://api.sieuthicode.vn/x" })],
        }),
      ),
    ).toBeNull();
  });

  it("giữ nguyên qua một vòng lưu rồi đọc lại", () => {
    const original = settings({
      bankAccounts: [
        account({ apiUrl: "https://api.sieuthicode.vn/historyapivcbv3/a/b/c" }),
        account({
          code: "OCB",
          name: "OCB",
          account: "0040100036036009",
          apiUrl: "https://api.sieuthicode.vn/historyapiocbv2/token",
        }),
      ],
    });
    expect(parseSettings(serializeSettings(original))).toEqual(original);
  });

  it("đọc được cấu hình một tài khoản kiểu cũ", () => {
    // Shop nào đã khai trước khi có danh sách thì không phải gõ lại.
    const parsed = parseSettings([
      { key: "bank.code", value: "VCB" },
      { key: "bank.name", value: "Vietcombank" },
      { key: "bank.account", value: "1234567890" },
      { key: "bank.holder", value: "NGUYEN VAN A" },
      { key: "topup.apiUrl", value: "https://api.sieuthicode.vn/x" },
    ]);
    expect(parsed.bankAccounts).toEqual([
      account({ apiUrl: "https://api.sieuthicode.vn/x" }),
    ]);
  });
});

describe("bố cục trang chủ", () => {
  it("keeps the stored order and marks hidden blocks with a dash", () => {
    const parsed = parseSettings([
      { key: SETTING_KEYS.homeBlocks, value: "flash,hero,-reviews" },
    ]);
    expect(parsed.homeBlocks.slice(0, 3)).toEqual(["flash", "hero", "-reviews"]);
    expect(visibleBlocks(parsed)).not.toContain("-reviews");
    expect(visibleBlocks(parsed).slice(0, 2)).toEqual(["flash", "hero"]);
  });

  it("drops retired block ids a stored layout still carries", () => {
    // "ticker" shipped once and was later removed; a layout that saved it must
    // neither render it nor keep it in the way.
    const parsed = parseSettings([
      { key: SETTING_KEYS.homeBlocks, value: "flash,ticker,hero" },
    ]);
    expect(parsed.homeBlocks).not.toContain("ticker");
    expect(parsed.homeBlocks.slice(0, 2)).toEqual(["flash", "hero"]);
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

describe("home layout migration", () => {
  it("gives a pre-upgrade layout the new blocks without losing its own", () => {
    // A shop that arranged its home page before "docs" and "seo" existed, and
    // back when the quick-actions bar was still a block.
    const saved =
      "hero,quick,-flash,featured,valorant,tft,gameServices," +
      "otherServices,reviews,ticker,utilities";
    const parsed = parseSettings([{ key: SETTING_KEYS.homeBlocks, value: saved }]);

    // Both new blocks arrive, switched on, and every earlier choice survives —
    // including the one the shop had hidden. The retired bar and the retired
    // tools hub are dropped.
    expect(parsed.homeBlocks).toContain("docs");
    expect(parsed.homeBlocks).toContain("seo");
    expect(parsed.homeBlocks).toContain("-flash");
    expect(parsed.homeBlocks).not.toContain("quick");
    expect(parsed.homeBlocks).not.toContain("utilities");
    expect(parsed.homeBlocks).toHaveLength(HOME_BLOCKS.length);
    expect(parsed.homeBlocks.slice(0, 2)).toEqual(["hero", "-flash"]);
  });

  it("keeps an order the admin rearranged", () => {
    const parsed = parseSettings([
      { key: SETTING_KEYS.homeBlocks, value: "tft,hero,featured" },
    ]);
    const order = parsed.homeBlocks.map((id) => id.replace(/^-/, ""));
    expect(order.indexOf("tft")).toBeLessThan(order.indexOf("hero"));
  });

  it("drops a block id the site no longer has", () => {
    const parsed = parseSettings([
      { key: SETTING_KEYS.homeBlocks, value: "hero,somethingRemoved,featured" },
    ]);
    expect(parsed.homeBlocks).not.toContain("somethingRemoved");
  });
});

describe("hero and SEO settings", () => {
  it("round-trips through serialize and parse", () => {
    const before = settings({
      heroTitle: "Dòng một\nDòng hai",
      heroVideo: "/videos/hero.mp4",
      seoFaq: [{ q: "Bao lâu?", a: "Vài phút." }],
      homeRowCount: 4,
    });
    expect(parseSettings(serializeSettings(before))).toEqual(before);
  });

  it("keeps the newline that splits the heading", () => {
    const parsed = parseSettings([
      { key: SETTING_KEYS.heroTitle, value: "Mua acc\n& dịch vụ" },
    ]);
    expect(parsed.heroTitle.split("\n")).toHaveLength(2);
  });

  it("falls back rather than leaving the hero wordless", () => {
    const normalized = normalizeSettings({ heroTitle: "  ", heroPrimaryLabel: "" });
    expect(normalized.heroTitle).toBe(DEFAULT_SETTINGS.heroTitle);
    expect(normalized.heroPrimaryLabel).toBe(DEFAULT_SETTINGS.heroPrimaryLabel);
  });

  it("lets the badge above the eyebrow be emptied, and ships one by default", () => {
    // Blank is a choice — no pill — unlike the heading, which falls back.
    expect(normalizeSettings({ heroBadge: "  " }).heroBadge).toBe("");
    expect(parseSettings([]).heroBadge).toBe("Official OBV Hax Reseller");
    expect(
      parseSettings([{ key: SETTING_KEYS.heroBadge, value: " Đại lý uỷ quyền " }]).heroBadge,
    ).toBe("Đại lý uỷ quyền");
  });

  it("lets the optional parts be emptied on purpose", () => {
    const normalized = normalizeSettings({ heroSecondaryLabel: "" });
    expect(normalized.heroSecondaryLabel).toBe("");
  });

  it("drops a question with no answer", () => {
    const normalized = normalizeSettings({
      seoFaq: [
        { q: "Có bảo hành không?", a: "" },
        { q: "Nạp thế nào?", a: "Qua ngân hàng." },
      ],
    });
    expect(normalized.seoFaq).toEqual([{ q: "Nạp thế nào?", a: "Qua ngân hàng." }]);
  });

  it("clamps the row count into range", () => {
    expect(normalizeSettings({ homeRowCount: 0 }).homeRowCount).toBe(1);
    expect(normalizeSettings({ homeRowCount: 999 }).homeRowCount).toBe(24);
    expect(normalizeSettings({ homeRowCount: Number.NaN }).homeRowCount).toBe(
      DEFAULT_SETTINGS.homeRowCount,
    );
  });

  it("refuses a hero link that is neither a path nor a URL", () => {
    expect(validateSettings(settings({ heroPrimaryHref: "javascript:alert(1)" }))).toMatch(
      /Nút chính/,
    );
    expect(validateSettings(settings({ heroPrimaryHref: "/categories" }))).toBeNull();
  });

});

describe("homeSections", () => {
  it("puts the last word on the tile's big line", () => {
    expect(splitTileName("Acc tự chọn Valorant")).toEqual({
      line1: "Acc tự chọn",
      line2: "Valorant",
    });
  });

  it("keeps a single word whole", () => {
    expect(splitTileName("Valorant")).toEqual({ line1: "", line2: "Valorant" });
  });

  it("never drops a word, however long the name", () => {
    const split = splitTileName("Acc siêu cấp vôdịchvũtrụbaola");
    expect(`${split.line1} ${split.line2}`).toBe("Acc siêu cấp vôdịchvũtrụbaola");
  });

  it("orders rows by the slug list and skips what is gone", () => {
    const rows = [{ slug: "b" }, { slug: "a" }, { slug: "c" }];
    expect(orderBySlugs(rows, ["a", "missing", "b"])).toEqual([{ slug: "a" }, { slug: "b" }]);
  });
});
