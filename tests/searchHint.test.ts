import { describe, expect, it } from "vitest";

import { editionsOf, shortGameName, softwareSearchHint } from "@/lib/searchHint";

describe("shortGameName", () => {
  it("drops the HACK prefix and the tail after a dash", () => {
    expect(shortGameName("HACK ĐỘT KÍCH CFVN - CF4VN")).toBe("Đột Kích CFVN");
  });

  it("keeps initialisms and cases the rest as names", () => {
    expect(shortGameName("HACK CS2 COUNTER STRIKE 2")).toBe("CS2 Counter Strike 2");
    expect(shortGameName("HACK DELTA FORCE MỚI")).toBe("Delta Force");
    expect(shortGameName("HACK PUBG STEAM PC")).toBe("PUBG Steam PC");
    expect(shortGameName("HACK TRUY KÍCH PC - TRUY KÍCH 2")).toBe("Truy Kích PC");
    expect(shortGameName("HACK CALL OF DUTY WARZONE BLACK OPS 6")).toBe("Call of Duty Warzone");
  });
});

describe("editionsOf", () => {
  it("reads 'bản X' from each name, once each, in order", () => {
    expect(
      editionsOf([
        "HACK CFVN BẢN OBV FULL - ESP AIMBOT",
        "HACK CFVN Bản VS giá rẻ",
        "HACK CFVN bản obv lite",
        "HACK CFVN BẢN CHUYÊN NGHIỆP",
        "HACK CFVN BẢN HACK FULL",
        "HACK CFVN không có gì",
        null,
      ]),
    ).toEqual(["OBV", "VS", "CHUYÊN"]);
  });
});

describe("softwareSearchHint", () => {
  it("names the game and its editions", () => {
    expect(
      softwareSearchHint("HACK ĐỘT KÍCH CFVN - CF4VN", [
        "HACK CFVN BẢN OBV",
        "HACK CFVN BẢN VS",
        "HACK CFVN BẢN UNNAMED",
        "HACK CFVN BẢN PRO",
      ]),
    ).toBe("Tìm: HACK Đột Kích CFVN bản OBV, bản VS, bản UNNAMED…");
  });

  it("falls back to the first tool's name when nothing says 'bản'", () => {
    expect(
      softwareSearchHint("HACK VALORANT MỚI", ["VALORANT TOOL PREMIUM ESP AIMBOT SIÊU MƯỢT AN TOÀN"]),
    ).toBe("Tìm: VALORANT TOOL PREMIUM ESP AIMBOT…");
  });

  it("names the game alone when the shelf is empty", () => {
    expect(softwareSearchHint("HACK NARAKA VN", [])).toBe("Tìm HACK Naraka VN…");
  });
});
