import { describe, expect, it } from "vitest";

import { sameZaloSecret, zaloInboundSecret } from "@/lib/zaloInbound";
import {
  clip,
  normalizeInput,
  parseZaloCommand,
  readAmount,
  readChatState,
  tidyAmount,
  ZaloText,
} from "@/lib/zaloShopRules";

/** The Zalo shop's grammar: what a typed line means, and what the bot holds between lines. */
describe("reading what the customer typed", () => {
  it("drops accents, case and extra spaces", () => {
    expect(normalizeInput("  Nạp   100k ")).toBe("NAP 100K");
    expect(normalizeInput("Đơn hàng")).toBe("DON HANG");
  });

  it("reads money however it is typed", () => {
    expect(readAmount("100000")).toBe(100_000);
    expect(readAmount("100.000")).toBe(100_000);
    expect(readAmount("100,000")).toBe(100_000);
    expect(readAmount("100k")).toBe(100_000);
    expect(readAmount("100 nghìn")).toBe(100_000);
    expect(readAmount("1tr")).toBe(1_000_000);
    expect(readAmount("1,5 triệu")).toBe(1_500_000);
    expect(readAmount("2m")).toBe(2_000_000);
    expect(readAmount("50.000đ")).toBe(50_000);
    expect(readAmount("abc")).toBeNull();
    expect(readAmount("0")).toBeNull();
    expect(readAmount("5000tr")).toBeNull();
  });

  it("knows its commands, and nothing else", () => {
    expect(parseZaloCommand("menu")).toEqual({ kind: "menu" });
    expect(parseZaloCommand("Shop")).toEqual({ kind: "shop" });
    expect(parseZaloCommand("mua")).toEqual({ kind: "shop" });
    expect(parseZaloCommand(" 3 ")).toEqual({ kind: "pick", n: 3 });
    expect(parseZaloCommand("ok")).toEqual({ kind: "ok" });
    expect(parseZaloCommand("Xác nhận")).toEqual({ kind: "ok" });
    expect(parseZaloCommand("Hủy")).toEqual({ kind: "cancel" });
    expect(parseZaloCommand("nạp 50k")).toEqual({
      kind: "topup",
      amount: 50_000,
      raw: "50K",
    });
    expect(parseZaloCommand("nap")).toEqual({
      kind: "topup",
      amount: null,
      raw: "",
    });
    expect(parseZaloCommand("nạp tiền abc")).toEqual({
      kind: "topup",
      amount: null,
      raw: "ABC",
    });
    expect(parseZaloCommand("Số dư")).toEqual({ kind: "balance" });
    expect(parseZaloCommand("đơn hàng")).toEqual({ kind: "orders" });
    expect(parseZaloCommand("shop ơi cho hỏi")).toEqual({ kind: "unknown" });
    expect(parseZaloCommand("")).toEqual({ kind: "unknown" });
  });
});

describe("the state the bot holds", () => {
  const now = 1_800_000_000_000;

  it("comes back when its shape is right and it is fresh", () => {
    expect(
      readChatState(
        { step: "categories", ids: ["a", "b"], at: now - 1000 },
        now,
      ),
    ).toEqual({
      step: "categories",
      ids: ["a", "b"],
      at: now - 1000,
    });
    expect(
      readChatState(
        { step: "confirm", productId: "p", packageId: "k", at: now },
        now,
      ),
    ).toEqual({ step: "confirm", productId: "p", packageId: "k", at: now });
    expect(
      readChatState(
        { step: "packages", ids: ["k"], productId: "p", at: now },
        now,
      ),
    ).toMatchObject({ step: "packages", productId: "p" });
  });

  it("is dropped when stale, malformed or invented", () => {
    expect(
      readChatState(
        { step: "categories", ids: ["a"], at: now - 31 * 60_000 },
        now,
      ),
    ).toBeNull();
    expect(
      readChatState({ step: "categories", ids: [1, 2], at: now }, now),
    ).toBeNull();
    expect(
      readChatState({ step: "products", ids: ["a"], at: now }, now),
    ).toBeNull();
    expect(readChatState({ step: "admin", ids: [], at: now }, now)).toBeNull();
    expect(readChatState("junk", now)).toBeNull();
    expect(readChatState(null, now)).toBeNull();
  });
});

describe("helpers", () => {
  it("builds styled text whose ranges point at the right words", () => {
    const t = new ZaloText()
      .add("Giá: ")
      .add("39.000đ", "b", "c_db342e")
      .line("Gõ ")
      .add("OK", "b");
    const { text, styles } = t.done();
    expect(text).toBe("Giá: 39.000đ\nGõ OK");
    expect(styles.map((s) => text.slice(s.start, s.start + s.len))).toEqual([
      "39.000đ",
      "39.000đ",
      "OK",
    ]);
  });

  it("clips long names and tidies a shortfall", () => {
    expect(clip("A".repeat(80), 10)).toBe(`${"A".repeat(9)}…`);
    expect(clip("ngắn")).toBe("ngắn");
    expect(tidyAmount(19_000)).toBe(20_000);
    expect(tidyAmount(123_000)).toBe(130_000);
    expect(tidyAmount(1_234_000)).toBe(1_300_000);
  });

  it("derives the bot's secret from the database address", () => {
    const a = zaloInboundSecret("postgresql://u:p@db/x");
    expect(a).toHaveLength(64);
    expect(zaloInboundSecret("postgresql://u:p@db/x")).toBe(a);
    expect(zaloInboundSecret("postgresql://u:q@db/x")).not.toBe(a);
    expect(sameZaloSecret(a, a)).toBe(true);
    expect(sameZaloSecret("nope", a)).toBe(false);
    expect(sameZaloSecret("", "")).toBe(false);
  });
});
