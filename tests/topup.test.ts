import { describe, expect, it } from "vitest";

import { extractTopUpCode, makeTopUpCode, readTransfers } from "@/lib/topup";

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
