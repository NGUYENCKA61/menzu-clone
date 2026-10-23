import { describe, expect, it } from "vitest";

import {
  LINK_CODE_ALPHABET,
  LINK_CODE_LENGTH,
  linkMessage,
  makeLinkCodeValue,
  noticeText,
  zaloNoticeMessage,
  zaloTopUpCreditedMessage,
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

describe("zaloNoticeMessage", () => {
  it("bolds the title and keeps body and link on their own lines", () => {
    const m = zaloNoticeMessage("Shop đã nhận yêu cầu bảo hành", "Đơn DH1: đã nhận.", "https://x.test/orders");
    expect(m.text).toBe("Shop đã nhận yêu cầu bảo hành
Đơn DH1: đã nhận.
https://x.test/orders");
    expect(m.styles).toEqual([{ start: 0, len: "Shop đã nhận yêu cầu bảo hành".length, st: "b" }]);
  });

  it("leaves out a missing link", () => {
    expect(zaloNoticeMessage("Quà của bạn", "", null).text).toBe("Quà của bạn");
  });
});

describe("zaloTopUpCreditedMessage", () => {
  it("names the request, the sum and the balance, the figures bold", () => {
    const m = zaloTopUpCreditedMessage({ code: "NT8F3K2Q", received: 50000n, balance: 150000n, walletUrl: "https://x.test/wallet/NT8F3K2Q" });
    expect(m.text).toContain("Lệnh NT8F3K2Q: đã cộng 50.000đ vào ví.");
    expect(m.text).toContain("Số dư hiện tại: 150.000đ.");
    expect(m.text.startsWith("Nạp tiền thành công")).toBe(true);
    const bold = m.styles.filter((s) => s.st === "b").map((s) => m.text.slice(s.start, s.start + s.len));
    expect(bold).toEqual(["Nạp tiền thành công", "50.000đ", "150.000đ"]);
  });
});
