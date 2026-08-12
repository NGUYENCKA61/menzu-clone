import { describe, expect, it } from "vitest";

import { extractTopUpCode, readTransfers } from "@/lib/topup";

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

  it("ignores payloads it does not understand rather than guessing", () => {
    expect(readTransfers(null)).toEqual([]);
    expect(readTransfers("chuoi")).toEqual([]);
    expect(readTransfers({})).toEqual([]);
    expect(readTransfers({ data: [] })).toEqual([]);
    // No amount is not a zero-đồng transfer, it is an unreadable one.
    expect(readTransfers({ description: "NAP NT8F3K2Q" })).toEqual([]);
  });
});
