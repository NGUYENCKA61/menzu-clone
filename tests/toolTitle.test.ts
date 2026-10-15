import { describe, expect, it } from "vitest";

import { DOCS_TITLE_MAX, TOOL_TITLE_MAX, clampTitle, tidyToolName, toolPageTitle } from "@/lib/toolTitle";

/**
 * Two of the owner's names as they stand in the catalogue (15/10/2026):
 * with " | Từ 39.000đ | THICHTHIHACK" they made 186- and 177-character
 * titles (the SEO review, round 2, T1).
 */
const HACK73 =
  "HACK ĐỘT KÍCH CFVN - BẢN PRIME CHUYÊN ZOMBIE LOẠI 2 : TĂNG DAME BẮN NHANH CHÉM NHANH THAY ĐẠN NHANH KHÔNG GIẬT BAY CAO VÀ MỘT CHỨC NĂNG KHÁC (NGỪNG HOẠT ĐỘNG)";
const HACK83 =
  "HACK CS2 BẢN MS RAGE SIÊU BÁ - BẮN ĐỤC XUYÊN TƯỜNG ĐẠN DÍ TỰ KÊ ĐẦU SIÊU AN TOÀN CÓ MOD SKIN + TẶNG KÈM CONFIG !!! (BẢN HACK META NHẤT HIỆN TẠI !!!)";

describe("tidyToolName", () => {
  it("drops runs of ! and the spaces they leave", () => {
    expect(tidyToolName("SPOOFER VALORANT !!!")).toBe("SPOOFER VALORANT");
    expect(tidyToolName("HACK DELTA FORCE VN BẢN ONLY AIMBOT - AN TOÀN !!!")).toBe(
      "HACK DELTA FORCE VN BẢN ONLY AIMBOT - AN TOÀN",
    );
    expect(tidyToolName(HACK83)).toBe(
      "HACK CS2 BẢN MS RAGE SIÊU BÁ - BẮN ĐỤC XUYÊN TƯỜNG ĐẠN DÍ TỰ KÊ ĐẦU SIÊU AN TOÀN CÓ MOD SKIN + TẶNG KÈM CONFIG (BẢN HACK META NHẤT HIỆN TẠI)",
    );
  });

  it("folds whitespace and closes the spaces inside brackets", () => {
    expect(tidyToolName("HACK TRUY KÍCH 2.0 CŨ - 114 ESP  - AN TOÀN + AIM MƯỢT")).toBe(
      "HACK TRUY KÍCH 2.0 CŨ - 114 ESP - AN TOÀN + AIM MƯỢT",
    );
    expect(tidyToolName("BẢN PRECHAIR ( MAGIC BULLET ) MỚI NHẤT - AN TOÀN NHẤT !!!")).toBe(
      "BẢN PRECHAIR (MAGIC BULLET) MỚI NHẤT - AN TOÀN NHẤT",
    );
    expect(tidyToolName("TOOL X (!!!) Y")).toBe("TOOL X Y");
  });

  it("takes a dangling separator off the end", () => {
    expect(tidyToolName("HACK CS2 BẢN LEGIT -")).toBe("HACK CS2 BẢN LEGIT");
    expect(tidyToolName("HACK CS2 BẢN LEGIT:")).toBe("HACK CS2 BẢN LEGIT");
    expect(tidyToolName("HACK CS2 BẢN LEGIT - !!!")).toBe("HACK CS2 BẢN LEGIT");
  });

  it("leaves an ordinary name alone", () => {
    expect(tidyToolName("HACK NARAKA VN")).toBe("HACK NARAKA VN");
    expect(tidyToolName(HACK73)).toBe(HACK73);
  });
});

describe("toolPageTitle", () => {
  it("keeps a short name whole and appends the suffix after a bar", () => {
    expect(toolPageTitle("HACK NARAKA VN", "Từ 39.000đ")).toBe("HACK NARAKA VN | Từ 39.000đ");
    expect(toolPageTitle("SPOOFER VALORANT !!!", "Miễn phí")).toBe("SPOOFER VALORANT | Miễn phí");
    expect(toolPageTitle("HACK NARAKA VN", null)).toBe("HACK NARAKA VN");
    expect(toolPageTitle("HACK NARAKA VN")).toBe("HACK NARAKA VN");
  });

  it("cuts HACK73 at a word to the title limit", () => {
    const title = toolPageTitle(HACK73, "Từ 39.000đ");
    const name = title.replace(/ \| Từ 39\.000đ$/, "");
    expect(name).toBe("HACK ĐỘT KÍCH CFVN - BẢN PRIME CHUYÊN ZOMBIE LOẠI 2 : TĂNG…");
    expect(name.length).toBeLessThanOrEqual(TOOL_TITLE_MAX);
    // With the layout's " | THICHTHIHACK" the whole tab stays under 90.
    expect(title.length + " | THICHTHIHACK".length).toBeLessThan(90);
  });

  it("cuts HACK83 with its shouting already gone", () => {
    const title = toolPageTitle(HACK83, "Từ 39.000đ");
    const name = title.replace(/ \| Từ 39\.000đ$/, "");
    expect(name).toBe("HACK CS2 BẢN MS RAGE SIÊU BÁ - BẮN ĐỤC XUYÊN TƯỜNG ĐẠN DÍ TỰ…");
    expect(name).not.toContain("!");
    expect(name.length).toBeLessThanOrEqual(TOOL_TITLE_MAX);
  });

  it("never leaves a separator in front of the ellipsis", () => {
    // 58 letters, then " - " and more: the cut lands on the separator.
    const name = `${"A".repeat(58)} - BẢN LEGIT CHO MÁY NHÀ`;
    expect(toolPageTitle(name)).toBe(`${"A".repeat(58)}…`);
    expect(clampTitle(`${"B".repeat(45)} : X Y`, DOCS_TITLE_MAX)).toBe(`${"B".repeat(45)}…`);
  });
});
