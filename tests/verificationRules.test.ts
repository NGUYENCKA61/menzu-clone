import { describe, expect, it } from "vitest";

import {
  maskPhone,
  normalisePhone,
  readFacebookUrl,
  readName,
  readPhone,
} from "@/lib/verificationRules";

describe("a phone number for xác thực cấp 2", () => {
  it("reads the Vietnamese spellings down to ten digits with a leading 0", () => {
    expect(normalisePhone("0912.345.678")).toBe("0912345678");
    expect(normalisePhone("+84 912 345 678")).toBe("0912345678");
    expect(normalisePhone("84912345678")).toBe("0912345678");
    expect(readPhone("0912345678")).toBe("0912345678");
  });

  it("refuses anything that is not one", () => {
    expect(readPhone("912345678")).toBeNull();
    expect(readPhone("09123456789")).toBeNull();
    expect(readPhone("abc")).toBeNull();
    expect(readPhone(null)).toBeNull();
  });

  it("masks the middle for the screen", () => {
    expect(maskPhone("0912345678")).toBe("0912•••678");
  });
});

describe("a Facebook address", () => {
  it("takes the profile spellings and tidies them", () => {
    expect(readFacebookUrl("facebook.com/nguyen.van.an")).toBe(
      "https://facebook.com/nguyen.van.an",
    );
    expect(
      readFacebookUrl("https://www.facebook.com/profile.php?id=100001234#x"),
    ).toBe("https://www.facebook.com/profile.php?id=100001234");
    expect(readFacebookUrl("http://m.facebook.com/an.nguyen")).toBe(
      "https://m.facebook.com/an.nguyen",
    );
    expect(readFacebookUrl("fb.com/an")).toBe("https://fb.com/an");
  });

  it("refuses other sites, the bare front door, and junk", () => {
    expect(readFacebookUrl("https://zalo.me/0912345678")).toBeNull();
    expect(readFacebookUrl("https://facebook.com/")).toBeNull();
    expect(readFacebookUrl("facebook.com")).toBeNull();
    expect(readFacebookUrl("not a url at all")).toBeNull();
    expect(readFacebookUrl("")).toBeNull();
    expect(readFacebookUrl(42)).toBeNull();
  });
});

describe("a name", () => {
  it("is single-spaced, trimmed and capped", () => {
    expect(readName("  Nguyễn   Văn  An ")).toBe("Nguyễn Văn An");
    expect(readName("x".repeat(100))).toHaveLength(80);
    expect(readName(undefined)).toBe("");
  });
});
