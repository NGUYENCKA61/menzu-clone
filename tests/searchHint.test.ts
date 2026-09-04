import { describe, expect, it } from "vitest";

import { editionsOf, shortGameName, softwareSearchHint } from "@/lib/searchHint";

describe("shortGameName", () => {
  it("drops the HACK prefix and the tail after a dash", () => {
    expect(shortGameName("HACK ĐỘT KÍCH CFVN - CF4VN")).toBe("ĐỘT KÍCH CFVN");
  });

  it("drops 'mới' and keeps at most four words, in capitals", () => {
    expect(shortGameName("HACK DELTA FORCE MỚI")).toBe("DELTA FORCE");
    expect(shortGameName("hack Call of Duty Warzone Black Ops 6")).toBe("CALL OF DUTY WARZONE");
    expect(shortGameName("HACK TRUY KÍCH PC - TRUY KÍCH 2")).toBe("TRUY KÍCH PC");
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
  it("names the game and its editions, bản said once", () => {
    expect(
      softwareSearchHint("HACK ĐỘT KÍCH CFVN - CF4VN", [
        "HACK CFVN BẢN OBV",
        "HACK CFVN BẢN VS",
        "HACK CFVN BẢN UNNAMED",
        "HACK CFVN BẢN PRO",
      ]),
    ).toBe("Tìm: HACK ĐỘT KÍCH CFVN bản OBV, VS, UNNAMED…");
  });

  it("falls back to the first tool's name when nothing says 'bản'", () => {
    expect(
      softwareSearchHint("HACK VALORANT MỚI", ["VALORANT TOOL PREMIUM ESP AIMBOT SIÊU MƯỢT AN TOÀN"]),
    ).toBe("Tìm: VALORANT TOOL PREMIUM ESP AIMBOT…");
  });

  it("names the game alone when the shelf is empty", () => {
    expect(softwareSearchHint("HACK NARAKA VN", [])).toBe("Tìm HACK NARAKA VN…");
  });
});
