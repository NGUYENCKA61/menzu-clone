import { describe, expect, it } from "vitest";

import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  readDescription,
  readIssue,
  WARRANTY_ISSUE_KEYS,
  warrantyBlockedReason,
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

  it("refuses an order that was never charged or was paid back", () => {
    for (const orderStatus of ["PENDING", "CANCELLED", "REFUNDED"]) {
      expect(warrantyBlockedReason({ orderStatus, openRequest: false })).toMatch(
        /đã thanh toán/,
      );
    }
  });

  it("refuses a second report while the first is still open", () => {
    expect(warrantyBlockedReason({ orderStatus: "PAID", openRequest: true })).toMatch(
      /chưa xử lý xong/,
    );
  });

  it("says the money reason first when both are true", () => {
    expect(warrantyBlockedReason({ orderStatus: "REFUNDED", openRequest: true })).toMatch(
      /đã thanh toán/,
    );
  });
});

describe("warrantyOpen", () => {
  it("is open until resolved", () => {
    expect(warrantyOpen("OPEN")).toBe(true);
    expect(warrantyOpen("IN_PROGRESS")).toBe(true);
    expect(warrantyOpen("RESOLVED")).toBe(false);
  });
});
