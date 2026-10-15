import { describe, expect, it } from "vitest";

import { VERIFY_WORD, verifyMessage } from "@/lib/zaloShared";
import { parseZaloCommand } from "@/lib/zaloShopRules";

/**
 * The phone code for xác thực cấp 2 (the owner, 15/10/2026: "cái đảo chiều
 * đc đó"): shown on the web, sent by the customer TO the bot, read by the shop.
 */
describe("a phone code sent to the bot", () => {
  it("is the word and the six digits, as the card shows it", () => {
    expect(VERIFY_WORD).toBe("XACTHUC");
    expect(verifyMessage("482913")).toBe("XACTHUC 482913");
    expect(parseZaloCommand(verifyMessage("482913"))).toEqual({
      kind: "verify",
      code: "482913",
      bare: false,
    });
  });

  it("reads the word however it was typed", () => {
    for (const text of [
      "xác thực 482913",
      "Xac thuc: 482913",
      "XACTHUC-482913",
      "otp 482913",
      "OTP482913",
      "  xacthuc   482913 ",
    ]) {
      expect(parseZaloCommand(text), text).toEqual({
        kind: "verify",
        code: "482913",
        bare: false,
      });
    }
  });

  it("reads six digits alone as a bare code, and leaves the rest of the grammar alone", () => {
    expect(parseZaloCommand("482913")).toEqual({
      kind: "verify",
      code: "482913",
      bare: true,
    });
    expect(parseZaloCommand("12")).toEqual({ kind: "pick", n: 12 });
    expect(parseZaloCommand("XACTHUC 48291")).toEqual({ kind: "unknown" });
    expect(parseZaloCommand("XACTHUC 4829131")).toEqual({ kind: "unknown" });
    expect(parseZaloCommand("NAP 100000")).toEqual({
      kind: "topup",
      amount: 100_000,
      raw: "100000",
    });
  });
});
