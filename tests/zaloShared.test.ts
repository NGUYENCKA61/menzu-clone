import { describe, expect, it } from "vitest";

import {
  LINK_CODE_ALPHABET,
  LINK_CODE_LENGTH,
  linkMessage,
  makeLinkCodeValue,
  noticeText,
  readLinkMessage,
  readZaloBotState,
  settleZaloBotState,
} from "@/lib/zaloShared";

/**
 * The Zalo channel's two ends meet on a six-letter code: the web prints it,
 * the customer types it to the bot. What matters is that every way a person
 * types it is read, and nothing else is.
 */
describe("link codes", () => {
  it("draws from an alphabet without 0, O, 1 or I", () => {
    expect(LINK_CODE_ALPHABET).not.toMatch(/[01OI]/);
    const code = makeLinkCodeValue((max) => max - 1);
    expect(code).toHaveLength(LINK_CODE_LENGTH);
    expect(code).toBe("999999".replace(/9/g, LINK_CODE_ALPHABET.at(-1)!));
  });

  it("reads the word and the code however they were typed", () => {
    expect(readLinkMessage("LIENKET ABC234")).toBe("ABC234");
    expect(readLinkMessage("lienket abc234")).toBe("ABC234");
    expect(readLinkMessage("  Liên kết: ABC234 ")).toBe("ABC234");
    expect(readLinkMessage("lien ket - abc234")).toBe("ABC234");
    expect(linkMessage("ABC234")).toBe("LIENKET ABC234");
  });

  it("answers nothing to a message that is not a code", () => {
    expect(readLinkMessage("xin chào")).toBeNull();
    expect(readLinkMessage("LIENKET")).toBeNull();
    expect(readLinkMessage("LIENKET ABC23")).toBeNull();
    // A letter outside the alphabet is a typo, not a lookup.
    expect(readLinkMessage("LIENKET ABC0I1")).toBeNull();
    expect(readLinkMessage("LIENKET ABC234 xin chào")).toBeNull();
  });
});

describe("the message a notice becomes", () => {
  it("is title, body and the page, one per line, with nothing blank", () => {
    expect(
      noticeText(
        "Shop đã nhận yêu cầu",
        "Đơn DH1: shop sẽ xử lý sớm.",
        "https://x.vn/orders/DH1",
      ),
    ).toBe(
      "Shop đã nhận yêu cầu\nĐơn DH1: shop sẽ xử lý sớm.\nhttps://x.vn/orders/DH1",
    );
    expect(noticeText("Quà của bạn", "", null)).toBe("Quà của bạn");
  });
});

describe("the bot's reported standing", () => {
  it("reads what the bot wrote and refuses anything else", () => {
    expect(readZaloBotState(null)).toBeNull();
    expect(readZaloBotState("junk")).toBeNull();
    expect(
      readZaloBotState(JSON.stringify({ state: "dancing", at: "x" })),
    ).toBeNull();
    expect(
      readZaloBotState(
        JSON.stringify({
          state: "qr",
          qrUrl: "/uploads/zalo/qr-1.png",
          at: "2026-10-12T10:00:00Z",
        }),
      ),
    ).toEqual({
      state: "qr",
      qrUrl: "/uploads/zalo/qr-1.png",
      name: null,
      at: "2026-10-12T10:00:00Z",
      note: null,
    });
  });
});

describe("the bot's standing as Cấu hình reads it", () => {
  it("keeps a fresh scan wait, and reads a stale one as lost", () => {
    const at = new Date("2026-10-12T10:00:00Z");
    const qr = {
      state: "qr" as const,
      qrUrl: "/uploads/zalo/qr-1.png",
      name: null,
      at: at.toISOString(),
      note: null,
    };
    expect(settleZaloBotState(qr, at.getTime() + 5 * 60 * 1000)).toEqual(qr);
    const stale = settleZaloBotState(qr, at.getTime() + 11 * 60 * 1000);
    expect(stale?.state).toBe("offline");
    expect(stale?.qrUrl).toBeNull();
    expect(stale?.note).toMatch(/không chạy/);
    expect(settleZaloBotState(null)).toBeNull();
    // A heartbeat is fresh for a few minutes; an hour-old "online" is a bot
    // that died without its goodbye (tests/zaloBotStanding.test.ts).
    const online = { ...qr, state: "online" as const };
    expect(settleZaloBotState(online, at.getTime() + 60 * 1000)).toEqual(
      online,
    );
    expect(
      settleZaloBotState(online, at.getTime() + 60 * 60 * 1000)?.state,
    ).toBe("offline");
  });
});
