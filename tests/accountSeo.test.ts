import { describe, expect, it } from "vitest";

import {
  accountDisplayName,
  accountLdDescription,
  accountMetaDescription,
  accountMetaTitle,
  accountStatParts,
  clampText,
  isValorantAccount,
  type AccountSeoInput,
} from "@/lib/accountSeo";

const lol: AccountSeoInput = {
  code: "ACC77",
  name: "ACC RÁC LOL - CÓ TƯỚNG + SKIN",
  descriptionText: "",
  categoryName: "TOOL HACK + ACC LIÊN MINH HUYỀN THOẠI - LOL",
  categorySlug: "tool-hack-acc-lien-minh-huyen-thoai-lol",
  rank: "",
  weaponSkins: 0,
  agents: 0,
  level: 0,
  price: 60000,
};

const valorant: AccountSeoInput = {
  ...lol,
  code: "ACC12",
  name: "",
  categoryName: "ACCOUNT VALORANT TỰ CHỌN",
  categorySlug: "account-valorant-tu-chon",
  rank: "Kim Cương 2",
  weaponSkins: 34,
  agents: 0,
  level: 120,
  price: 1250000,
};

describe("accountMetaTitle", () => {
  it("leads with the listing's name, then the code once and the price", () => {
    expect(accountMetaTitle(lol)).toBe("ACC RÁC LOL - CÓ TƯỚNG + SKIN | ACC77 | 60.000đ");
  });

  it("falls back to the code alone, said once", () => {
    expect(accountMetaTitle(valorant)).toBe("Mã ACC12 | 1.250.000đ");
  });
});

describe("accountDisplayName", () => {
  it("is the name, or Mã <code> as the breadcrumb says", () => {
    expect(accountDisplayName(lol)).toBe("ACC RÁC LOL - CÓ TƯỚNG + SKIN");
    expect(accountDisplayName({ code: "ACC12", name: "  " })).toBe("Mã ACC12");
  });
});

describe("accountStatParts", () => {
  it("says nothing empty or zero, and no Valorant words off Valorant", () => {
    expect(accountStatParts(lol)).toEqual([]);
    expect(accountStatParts({ ...lol, weaponSkins: 5, agents: 3, level: 30 })).toEqual([]);
    expect(accountStatParts({ ...lol, rank: " Bạch Kim " })).toEqual(["rank Bạch Kim"]);
  });

  it("names a Valorant account's figures that have a value", () => {
    expect(accountStatParts(valorant)).toEqual(["rank Kim Cương 2", "34 skin súng", "level 120"]);
  });

  it("recognises a Valorant category by its slug or its name", () => {
    expect(isValorantAccount({ categorySlug: "random-valorant-20k", categoryName: "X" })).toBe(true);
    expect(isValorantAccount({ categorySlug: "x", categoryName: "Acc Valorant" })).toBe(true);
    expect(isValorantAccount(lol)).toBe(false);
  });
});

describe("accountMetaDescription", () => {
  it("builds a clean sentence when there is no write-up", () => {
    const text = accountMetaDescription(lol);
    expect(text).toBe(
      "Tài khoản TOOL HACK + ACC LIÊN MINH HUYỀN THOẠI - LOL mã ACC77. Giá 60.000đ. Bàn giao ngay sau khi thanh toán.",
    );
    expect(text).not.toMatch(/rank ,|0 skin súng|0 agent|level 0/);
  });

  it("uses the write-up, clamped, when there is one", () => {
    const long = "Acc rác LOL có tướng và skin, ".repeat(10);
    const text = accountMetaDescription({ ...lol, descriptionText: long });
    expect(text.length).toBeLessThanOrEqual(155);
    expect(text.endsWith("…")).toBe(true);
    expect(text.startsWith("Acc rác LOL có tướng và skin")).toBe(true);
  });

  it("gives the markup more room than the meta tag", () => {
    const long = "chữ ".repeat(100);
    expect(accountLdDescription({ ...lol, descriptionText: long }).length).toBeLessThanOrEqual(300);
    expect(accountLdDescription({ ...lol, descriptionText: long }).length).toBeGreaterThan(155);
  });
});

describe("clampText", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(clampText("  a   b ", 10)).toBe("a b");
  });

  it("cuts at a word with an ellipsis", () => {
    expect(clampText("một hai ba bốn năm sáu", 12)).toBe("một hai ba…");
  });
});
