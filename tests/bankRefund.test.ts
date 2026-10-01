import { describe, expect, it } from "vitest";

import {
  maskAccount,
  normaliseAccount,
  normaliseHolder,
  readBankDetails,
  REFUND_BANKS,
} from "@/lib/bankRefund";

/**
 * The account a bank refund goes to. Money sent to a wrong account does not
 * come back, so what matters is that a typo is caught here — before the shop
 * transfers — and that the form and the route refuse the same things.
 */
const good = {
  bankName: "Vietcombank",
  bankAccount: "0123456789",
  bankAccountConfirm: "0123456789",
  accountHolder: "Nguyễn Văn An",
};

describe("readBankDetails", () => {
  it("takes a complete, matching account and cleans it up", () => {
    expect(readBankDetails(good)).toEqual({
      ok: true,
      bankName: "Vietcombank",
      bankAccount: "0123456789",
      accountHolder: "NGUYEN VAN AN",
    });
  });

  it("accepts the spaces and dots a bank app shows", () => {
    const read = readBankDetails({ ...good, bankAccount: "0123 456.789", bankAccountConfirm: "0123-456-789" });
    expect(read.ok && read.bankAccount).toBe("0123456789");
  });

  it("refuses a second number that does not match the first", () => {
    const read = readBankDetails({ ...good, bankAccountConfirm: "0123456788" });
    expect(read.ok).toBe(false);
    expect(!read.ok && read.error).toMatch(/không khớp/);
  });

  it("refuses a bank that is not on the list", () => {
    expect(readBankDetails({ ...good, bankName: "Ngân hàng X" }).ok).toBe(false);
    expect(readBankDetails({ ...good, bankName: "" }).ok).toBe(false);
  });

  it("refuses an account that is not 6–20 digits", () => {
    for (const bankAccount of ["12345", "1".repeat(21), "01234abc89", ""]) {
      expect(readBankDetails({ ...good, bankAccount, bankAccountConfirm: bankAccount }).ok).toBe(false);
    }
  });

  it("refuses a holder name that is not one", () => {
    for (const accountHolder of ["", "A", "NGUYEN 123", "x".repeat(61)]) {
      expect(readBankDetails({ ...good, accountHolder }).ok).toBe(false);
    }
  });

  it("refuses anything that is not text at all", () => {
    expect(readBankDetails({}).ok).toBe(false);
    expect(readBankDetails({ ...good, bankAccount: 123456789 }).ok).toBe(false);
  });
});

describe("normaliseHolder", () => {
  it("writes the name the way a bank does", () => {
    expect(normaliseHolder("  Trần   Thị Đào ")).toBe("TRAN THI DAO");
    expect(normaliseHolder("đỗ hữu đức")).toBe("DO HUU DUC");
  });
});

describe("normaliseAccount", () => {
  it("keeps the digits", () => {
    expect(normaliseAccount(" 1903 4567.89-0 ")).toBe("190345678 90".replace(" ", ""));
    expect(normaliseAccount(undefined)).toBe("");
  });
});

describe("maskAccount", () => {
  it("shows the last four only", () => {
    expect(maskAccount("0123456789")).toBe("••••6789");
  });
});

describe("REFUND_BANKS", () => {
  it("lists each bank once", () => {
    expect(new Set(REFUND_BANKS).size).toBe(REFUND_BANKS.length);
  });
});
