import { describe, expect, it } from "vitest";

import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  readDescription,
  readIssue,
  WARRANTY_ISSUE_KEYS,
  WARRANTY_STATUS,
  warrantyBlockedReason,
  warrantyButton,
  warrantyOpen,
} from "@/lib/warrantyRequests";

describe("readIssue", () => {
  it("accepts each listed issue and nothing else", () => {
    for (const key of WARRANTY_ISSUE_KEYS) {
      expect(readIssue(key)).toEqual({ ok: true, issue: key });
    }
    for (const bad of ["", "REFUND", 42, null, undefined]) {
      expect(readIssue(bad).ok).toBe(false);
    }
  });
});

describe("readDescription", () => {
  it("wants a sentence, not a word", () => {
    expect(readDescription("loi key").ok).toBe(false);
    expect(readDescription("x".repeat(DESCRIPTION_MIN - 1)).ok).toBe(false);
  });

  it("trims and accepts a real description", () => {
    const said = readDescription(`  Key báo sai khi nhập, đã thử lại ba lần vẫn không được.  `);
    expect(said).toEqual({
      ok: true,
      description: "Key báo sai khi nhập, đã thử lại ba lần vẫn không được.",
    });
  });

  it("refuses an essay", () => {
    expect(readDescription("x".repeat(DESCRIPTION_MAX + 1)).ok).toBe(false);
  });
});

describe("warrantyBlockedReason", () => {
  it("lets a paid order with nothing open through", () => {
    expect(warrantyBlockedReason({ orderStatus: "PAID", openRequest: false })).toBeNull();
  });

  it("refuses an order that was never charged", () => {
    for (const orderStatus of ["PENDING", "CANCELLED"]) {
      expect(warrantyBlockedReason({ orderStatus, openRequest: false })).toMatch(
        /đã thanh toán/,
      );
    }
  });

  it("says plainly when the order was paid back", () => {
    expect(warrantyBlockedReason({ orderStatus: "REFUNDED", openRequest: false })).toMatch(
      /đã được hoàn tiền/,
    );
  });

  it("refuses a second report while the first is still open", () => {
    expect(warrantyBlockedReason({ orderStatus: "PAID", openRequest: true })).toMatch(
      /chưa xử lý xong/,
    );
  });

  it("points at the refund under way instead of promising a reply", () => {
    const said = warrantyBlockedReason({ orderStatus: "PAID", openRequest: true, refunding: true });
    expect(said).toMatch(/đang được hoàn tiền/);
    expect(said).not.toMatch(/sẽ trả lời/);
  });

  it("says the money reason first when both are true", () => {
    expect(warrantyBlockedReason({ orderStatus: "REFUNDED", openRequest: true })).toMatch(
      /đã được hoàn tiền/,
    );
    expect(warrantyBlockedReason({ orderStatus: "CANCELLED", openRequest: true })).toMatch(
      /đã thanh toán/,
    );
  });
});

describe("warrantyOpen", () => {
  it("is open until fixed or paid back", () => {
    expect(warrantyOpen("OPEN")).toBe(true);
    expect(warrantyOpen("IN_PROGRESS")).toBe(true);
    // A bank refund still waiting on the account or the transfer is not over.
    expect(warrantyOpen("REFUNDING")).toBe(true);
    expect(warrantyOpen("RESOLVED")).toBe(false);
    expect(warrantyOpen("REFUNDED")).toBe(false);
  });
});

describe("WARRANTY_STATUS", () => {
  it("names and colours all five states, with literal classes", () => {
    expect(Object.keys(WARRANTY_STATUS).sort()).toEqual(
      ["IN_PROGRESS", "OPEN", "REFUNDED", "REFUNDING", "RESOLVED"],
    );
    for (const value of Object.values(WARRANTY_STATUS)) {
      expect(value.label.length).toBeGreaterThan(0);
      expect(value.tile).not.toMatch(/\$\{/);
      expect(value.dot).toMatch(/^bg-/);
    }
  });
});

describe("warrantyButton (the receipt)", () => {
  it("asks for a report until there is one", () => {
    expect(warrantyButton(null)).toEqual({ kind: "request", label: "Yêu cầu bảo hành" });
  });

  it("only lets the buyer follow a ticket after that", () => {
    for (const status of ["OPEN", "IN_PROGRESS", "RESOLVED", "REFUNDED"] as const) {
      expect(warrantyButton({ status, needsBank: false })).toEqual({
        kind: "status",
        label: "Xem trạng thái",
      });
    }
  });

  it("asks for the bank account while a bank refund waits on it", () => {
    expect(warrantyButton({ status: "REFUNDING", needsBank: true })).toEqual({
      kind: "bank",
      label: "Nhập số tài khoản",
    });
    // Account sent: back to watching.
    expect(warrantyButton({ status: "REFUNDING", needsBank: false }).kind).toBe("status");
  });
});
