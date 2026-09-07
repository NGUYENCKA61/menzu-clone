import { describe, expect, it } from "vitest";

import {
  extractTopUpCode,
  formatCountdown,
  makeTopUpCode,
  readTransfers,
  topUpExpiresAt,
  TOPUP_EXPIRY_MINUTES,
  watchableTopUp,
  autoCreditVerdict,
  cardNet,
  cardRateFor,
  creditLine,
  parseCardRates,
  serializeCardRates,
  heldNotice,
  mismatchNotice,
  readCardDigits,
} from "@/lib/topup";

describe("extractTopUpCode", () => {
  it("reads the code out of a clean description", () => {
    expect(extractTopUpCode("NAP NT8F3K2Q")).toBe("NT8F3K2Q");
  });

  it("survives what banking apps do to the description", () => {
    // Spaces stripped, case flattened, the bank's own prefix bolted on.
    expect(extractTopUpCode("NAPNT8F3K2Q")).toBe("NT8F3K2Q");
    expect(extractTopUpCode("napnt8f3k2q")).toBe("NT8F3K2Q");
    expect(extractTopUpCode("CT DEN:0123456 NAP NT8F3K2Q")).toBe("NT8F3K2Q");
    expect(extractTopUpCode("MBVCB.123456.NAPNT8F3K2Q.CT tu 0123")).toBe("NT8F3K2Q");
    expect(extractTopUpCode("  nap   nt8f3k2q  ")).toBe("NT8F3K2Q");
  });

  it("returns nothing when there is no code to find", () => {
    expect(extractTopUpCode("")).toBeNull();
    expect(extractTopUpCode("chuyen tien cho ban")).toBeNull();
    // "NAP" alone is not a code, and a short tail must not be accepted.
    expect(extractTopUpCode("NAP")).toBeNull();
    expect(extractTopUpCode("NAP NT123")).toBeNull();
  });
});

const MINUTE = 60 * 1000;
const NOW = new Date("2026-08-13T10:00:00Z");

function row(status: string, code: string, minutesAgo: number) {
  return { status, code, createdAt: new Date(NOW.getTime() - minutesAgo * MINUTE) };
}

describe("watchableTopUp", () => {
  it("watches a request that is unpaid and recent", () => {
    expect(watchableTopUp([row("PENDING", "NTAAAAAA", 5)], NOW)?.code).toBe("NTAAAAAA");
    // Expired still credits if the money turns up, so it stays watched.
    expect(watchableTopUp([row("EXPIRED", "NTBBBBBB", 40)], NOW)?.code).toBe("NTBBBBBB");
  });

  it("stops watching one abandoned long ago", () => {
    // Left polling every ten seconds forever, on every later visit, for money
    // nobody was going to send.
    expect(watchableTopUp([row("EXPIRED", "NTOLD001", 7 * 24 * 60)], NOW)).toBeNull();
    expect(watchableTopUp([row("PENDING", "NTOLD002", 5 * 60)], NOW)).toBeNull();
  });

  it("skips past everything already settled", () => {
    expect(
      watchableTopUp(
        [
          row("COMPLETED", "NT111111", 1),
          row("FAILED", "NT222222", 2),
          row("PENDING", "NT333333", 3),
        ],
        NOW,
      )?.code,
    ).toBe("NT333333");
  });

  it("returns nothing when there is nothing outstanding", () => {
    expect(watchableTopUp([], NOW)).toBeNull();
    expect(watchableTopUp([row("COMPLETED", "NT111111", 1)], NOW)).toBeNull();
  });

  it("carries the deadline the countdown runs to", () => {
    // The screen counts down to this, so it has to be the same instant the
    // sweep uses — a countdown reaching zero minutes before or after the
    // request actually expires is the screen lying about the shop's rules.
    const opened = row("PENDING", "NTCCCCCC", 10);
    expect(watchableTopUp([opened], NOW)?.expiresAt).toEqual(
      new Date(opened.createdAt.getTime() + TOPUP_EXPIRY_MINUTES * MINUTE),
    );
  });
});

describe("topUpExpiresAt", () => {
  it("holds a request for the expiry window", () => {
    expect(topUpExpiresAt(NOW).getTime() - NOW.getTime()).toBe(
      TOPUP_EXPIRY_MINUTES * MINUTE,
    );
  });
});

describe("formatCountdown", () => {
  it("reads as mm:ss", () => {
    expect(formatCountdown(30 * MINUTE)).toBe("30:00");
    expect(formatCountdown(9 * MINUTE + 5 * 1000)).toBe("09:05");
    expect(formatCountdown(1000)).toBe("00:01");
  });

  it("stops at zero rather than counting into negatives", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-90 * 1000)).toBe("00:00");
  });

  it("rounds up, so the last second is shown rather than skipped", () => {
    // Ticking once a second lands mid-second; flooring would show 00:00 for a
    // whole second while the request was still open.
    expect(formatCountdown(1500)).toBe("00:02");
  });
});

describe("makeTopUpCode", () => {
  it("mints a code the matcher can read back", () => {
    // The two halves used to live in different files and nothing tied them
    // together; a code one character too long is silently truncated and the
    // transfer looks like it belongs to nobody.
    for (let i = 0; i < 200; i += 1) {
      const code = makeTopUpCode();
      expect(extractTopUpCode(`NAP ${code}`)).toBe(code);
      expect(extractTopUpCode(`CT DEN:0123 NAP${code}`)).toBe(code);
      expect(extractTopUpCode(`MBVCB.99.NAP${code}.CT tu 0123`)).toBe(code);
    }
  });

  it("mints codes that differ", () => {
    const codes = new Set(Array.from({ length: 500 }, () => makeTopUpCode()));
    expect(codes.size).toBeGreaterThan(490);
  });
});

describe("readTransfers", () => {
  it("reads a Casso batch", () => {
    const transfers = readTransfers({
      error: 0,
      data: [
        { tid: "abc", description: "NAP NT8F3K2Q", amount: 200000 },
        { tid: "def", description: "NAP NTZZZ111", amount: 50000 },
      ],
    });
    expect(transfers).toHaveLength(2);
    expect(transfers[0]).toEqual({
      description: "NAP NT8F3K2Q",
      amount: 200000,
      reference: "abc",
    });
  });

  it("reads a single SePay payload", () => {
    const transfers = readTransfers({
      id: 9,
      content: "NAP NT8F3K2Q",
      transferAmount: 200000,
      transferType: "in",
      referenceCode: "FT123",
    });
    expect(transfers).toEqual([
      { description: "NAP NT8F3K2Q", amount: 200000, reference: "FT123" },
    ]);
  });

  it("ignores money going out", () => {
    // A debit must never credit a wallet, whichever way the provider says it.
    expect(
      readTransfers({ content: "NAP NT8F3K2Q", transferAmount: 200000, transferType: "out" }),
    ).toEqual([]);
    expect(readTransfers({ data: [{ description: "NAP NT8F3K2Q", amount: -200000 }] })).toEqual([]);
  });

  it("reads the sieuthicode VCB v3 shape the shop actually uses", () => {
    // Copied from the provider's documented response. The description is one
    // long machine string with no spaces, which is what VCB hands over.
    const transfers = readTransfers({
      status: "success",
      message: "Thành công",
      transactions: [
        {
          transactionID: "5388 - 71420",
          amount: 99000,
          description: "020097040501312143182024IXIY051998",
          transactionDate: "31/01/2024",
          type: "IN",
        },
      ],
    });

    expect(transfers).toEqual([
      {
        description: "020097040501312143182024IXIY051998",
        amount: 99000,
        reference: "5388 - 71420",
      },
    ]);
  });

  it("finds the note inside a VCB description blob", () => {
    // The customer's note is appended to that machine string rather than
    // arriving on its own.
    const [transfer] = readTransfers({
      status: "success",
      transactions: [
        {
          transactionID: "1",
          amount: 200000,
          description: "020097040501312143182024IXIY051998 NAPNT8F3K2Q",
          type: "IN",
        },
      ],
    });
    expect(extractTopUpCode(transfer.description)).toBe("NT8F3K2Q");
  });

  it("refuses an outgoing VCB row", () => {
    expect(
      readTransfers({
        transactions: [{ transactionID: "2", amount: 99000, description: "x", type: "OUT" }],
      }),
    ).toEqual([]);
  });

  it("reads an amount that arrives as a formatted string", () => {
    const [transfer] = readTransfers({
      transactions: [{ id: "3", amount: "200,000", description: "NAP NT8F3K2Q", type: "IN" }],
    });
    expect(transfer.amount).toBe(200000);
  });

  it("ignores payloads it does not understand rather than guessing", () => {
    expect(readTransfers(null)).toEqual([]);
    expect(readTransfers("chuoi")).toEqual([]);
    expect(readTransfers({})).toEqual([]);
    expect(readTransfers({ data: [] })).toEqual([]);
    // No amount is not a zero-đồng transfer, it is an unreadable one.
    expect(readTransfers({ description: "NAP NT8F3K2Q" })).toEqual([]);
  });
});

describe("creditLine", () => {
  it("is the plain line when the transfer matched the request", () => {
    expect(creditLine("NT8F3K2Q", 50000, 50000)).toBe("Nạp tiền vào ví · NT8F3K2Q");
  });

  it("carries both figures when it did not", () => {
    expect(creditLine("NT8F3K2Q", 50000, 45000)).toBe(
      "Nạp tiền vào ví · NT8F3K2Q · lệnh 50.000đ, nhận 45.000đ",
    );
    expect(creditLine("NT8F3K2Q", 50000, 60000)).toContain("nhận 60.000đ");
  });
});

describe("mismatchNotice", () => {
  it("tells a short payment what was credited and how to finish", () => {
    const notice = mismatchNotice("NT8F3K2Q", 50000, 45000);
    expect(notice.title).toBe("Nhận thiếu so với lệnh nạp");
    expect(notice.body).toContain("ghi 50.000đ");
    expect(notice.body).toContain("báo về 45.000đ");
    expect(notice.body).toContain("cộng đúng 45.000đ");
    expect(notice.body).toContain("nạp thêm phần còn thiếu");
  });

  it("tells an over-payment it was credited in full, with nothing to do", () => {
    const notice = mismatchNotice("NT8F3K2Q", 50000, 60000);
    expect(notice.title).toBe("Nhận dư so với lệnh nạp");
    expect(notice.body).toContain("cộng đúng 60.000đ");
    expect(notice.body).not.toContain("nạp thêm");
  });
});

describe("autoCreditVerdict", () => {
  it("accepts a plausible short or over payment", () => {
    expect(autoCreditVerdict(50000, 50000)).toBe("ok");
    expect(autoCreditVerdict(50000, 45000)).toBe("ok");
    expect(autoCreditVerdict(50000, 60000)).toBe("ok");
    expect(autoCreditVerdict(50000, 100000)).toBe("ok");
  });

  it("holds a figure under the floor for a human", () => {
    expect(autoCreditVerdict(50000, 500)).toBe("too-small");
    expect(autoCreditVerdict(30000000, 1000)).toBe("ok");
  });

  it("holds a figure beyond twice the request — a mis-read amount, most likely", () => {
    expect(autoCreditVerdict(50000, 100001)).toBe("too-large");
    expect(autoCreditVerdict(50000, 5000000)).toBe("too-large");
  });
});

describe("readTransfers amounts", () => {
  const one = (amount: unknown) =>
    readTransfers([{ description: "NAP NT8F3K2Q", amount, id: "x" }])[0]?.amount;

  it("reads Vietnamese grouping and plain digits", () => {
    expect(one("50.000")).toBe(50000);
    expect(one("50,000")).toBe(50000);
    expect(one("200000")).toBe(200000);
    expect(one(200000)).toBe(200000);
  });

  it("drops a fractional tail instead of reading it as more digits", () => {
    expect(one("50000.00")).toBe(50000);
    expect(one("50000,5")).toBe(50000);
    expect(one("1,5")).toBe(1);
    expect(one("200.000,00")).toBe(200000);
  });
});

describe("heldNotice", () => {
  it("names the customer, both figures and the reason for a figure under the floor", () => {
    const notice = heldNotice("NT8F3K2Q", 50_000, 500, "hoangbao2");
    expect(notice.title).toBe("Chuyển khoản cần duyệt · NT8F3K2Q");
    expect(notice.body).toContain("hoangbao2 chuyển 500đ cho lệnh 50.000đ");
    expect(notice.body).toContain("dưới mức tự cộng 1.000đ");
    expect(notice.body).toContain("ví CHƯA cộng");
  });

  it("says why a figure beyond twice the request waited", () => {
    const notice = heldNotice("NT8F3K2Q", 50_000, 5_000_000, "hoangbao2");
    expect(notice.body).toContain("5.000.000đ cho lệnh 50.000đ");
    expect(notice.body).toContain("hơn gấp 2 lần lệnh");
  });

  it("is the same text for the same figures — that is what makes it tell-once", () => {
    expect(heldNotice("NTA", 50_000, 500, "x")).toEqual(heldNotice("NTA", 50_000, 500, "x"));
    expect(heldNotice("NTA", 50_000, 500, "x").body).not.toBe(heldNotice("NTA", 50_000, 600, "x").body);
  });
});

describe("readCardDigits", () => {
  it("takes the digits as printed on the card", () => {
    expect(readCardDigits("10004783922539")).toBe("10004783922539");
  });

  it("drops the spaces, dots and dashes people type them with", () => {
    expect(readCardDigits("1000 4783 9225 39")).toBe("10004783922539");
    expect(readCardDigits("1000-4783-9225-39")).toBe("10004783922539");
    expect(readCardDigits("1000.4783.9225.39")).toBe("10004783922539");
  });

  it("refuses anything that is not a number", () => {
    expect(readCardDigits("1000O4783")).toBeNull();
    expect(readCardDigits("")).toBeNull();
    expect(readCardDigits(undefined)).toBeNull();
    expect(readCardDigits(12345678)).toBeNull();
  });

  it("refuses a card too short or too long to be one", () => {
    expect(readCardDigits("12345")).toBeNull();
    expect(readCardDigits("123456")).toBe("123456");
    expect(readCardDigits("1".repeat(24))).toBe("1".repeat(24));
    expect(readCardDigits("1".repeat(25))).toBeNull();
  });
});

describe("card rates", () => {
  it("reads the pairs an admin types, spaces and commas and all", () => {
    expect(parseCardRates("10000:27.5, 50000:20.5")).toEqual([
      { amount: 10_000, percent: 27.5 },
      { amount: 50_000, percent: 20.5 },
    ]);
  });

  it("takes a Vietnamese decimal comma in the percent", () => {
    expect(parseCardRates("50000:20,5")).toEqual([{ amount: 50_000, percent: 20.5 }]);
  });

  it("drops anything that is not a rate", () => {
    expect(parseCardRates("")).toEqual([]);
    expect(parseCardRates("abc")).toEqual([]);
    expect(parseCardRates("50000:120")).toEqual([]);
    expect(parseCardRates("50000:-5")).toEqual([]);
    expect(parseCardRates("0:20")).toEqual([]);
  });

  it("sorts by denomination so the admin field reads low to high", () => {
    expect(serializeCardRates(parseCardRates("500000:19, 10000:27.5"))).toBe(
      "10000:27.5,500000:19",
    );
  });

  it("credits the whole card when the shop set no rate", () => {
    expect(cardNet(50_000, [])).toBe(50_000);
    expect(cardRateFor(50_000, [])).toBe(0);
  });

  it("keeps the shop's percent and rounds the đồng down", () => {
    const rates = parseCardRates("50000:20.5, 500000:19.5");
    expect(cardNet(50_000, rates)).toBe(39_750);
    expect(cardNet(500_000, rates)).toBe(402_500);
  });

  it("leaves a denomination the shop did not list alone", () => {
    const rates = parseCardRates("50000:20.5");
    expect(cardNet(20_000, rates)).toBe(20_000);
  });
});

describe("the default card rate", () => {
  it("covers every denomination the list does not mention", () => {
    expect(cardNet(50_000, [], 20)).toBe(40_000);
    expect(cardNet(10_000, [], 20)).toBe(8_000);
    expect(cardRateFor(50_000, [], 20)).toBe(20);
  });

  it("gives way to a denomination the shop priced itself", () => {
    const rates = parseCardRates("50000:15.5");
    expect(cardNet(50_000, rates, 20)).toBe(42_250);
    expect(cardNet(100_000, rates, 20)).toBe(80_000);
  });

  it("credits whole when the shop keeps nothing", () => {
    expect(cardNet(50_000, [], 0)).toBe(50_000);
  });

  it("ignores a default that is not a percent", () => {
    expect(cardNet(50_000, [], -5)).toBe(50_000);
    expect(cardNet(50_000, [], 100)).toBe(50_000);
  });
});
