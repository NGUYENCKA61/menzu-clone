import { describe, expect, it } from "vitest";

import { groupedLines, parseGroupedLines } from "@/lib/cfInventoryGroups";
import { weaponGroup } from "@/lib/cfWeaponGroup";

describe("weaponGroup", () => {
  it("puts the weapons from the owner's inventory where the game does", () => {
    expect(weaponGroup("AK-47-K-HonorGuard-MK. 2")).toBe("Vũ khí chính");
    expect(weaponGroup("M4A1-S Predator")).toBe("Vũ khí chính");
    expect(weaponGroup("M82A1-S Born Beast")).toBe("Vũ khí chính");
    expect(weaponGroup("SPAS-12-Void-Gold")).toBe("Vũ khí chính");
    expect(weaponGroup("Steyr TMP-Death Eye")).toBe("Vũ khí chính");
    expect(weaponGroup("Desert Eagle-Sentry-MK1")).toBe("Vũ khí phụ");
    expect(weaponGroup("Raging Bull Gunknife")).toBe("Vũ khí phụ");
    expect(weaponGroup("Knife-Black")).toBe("Cận chiến");
    expect(weaponGroup("Smoke Grenade")).toBe("Lựu đạn");
  });

  it("keeps rifles that carry a knife with the rifles", () => {
    expect(weaponGroup("AK47-Knife Born Beast")).toBe("Vũ khí chính");
    expect(weaponGroup("AK12 Knife")).toBe("Vũ khí chính");
  });
});

describe("grouped admin lists", () => {
  it("reads [Group] lines as the group of the names under them", () => {
    expect(parseGroupedLines(["Túi 3", "[Chức năng]", "Giáp chống đạn", " ", "[]", "Túi 4"])).toEqual([
      { name: "Túi 3", group: null },
      { name: "Giáp chống đạn", group: "Chức năng" },
      { name: "Túi 4", group: null },
    ]);
  });

  it("writes back what it reads", () => {
    const rows = [
      { name: "Túi 3", group: null },
      { name: "Giáp chống đạn", group: "Chức năng" },
      { name: "Mũ chống đạn", group: "Chức năng" },
      { name: "Băng đạn vô hạn AI", group: "Chỉ chế độ" },
    ];
    expect(parseGroupedLines(groupedLines(rows))).toEqual(rows);
  });
});
