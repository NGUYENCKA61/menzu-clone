import { describe, expect, it } from "vitest";

import { gradeMark, gradeOf, isVipName, readGradeMark } from "@/lib/cfGrades";

describe("isVipName", () => {
  it("knows the owner's VIP weapons by their series", () => {
    expect(isVipName("M4A1-S Predator")).toBe(true);
    expect(isVipName("M82A1-S Born Beast")).toBe(true);
    expect(isVipName("Gatling Gun-Infernal Dragon")).toBe(true);
    expect(isVipName("Raging Bull Gunknife")).toBe(true);
    expect(isVipName("M200 Dominator")).toBe(true);
  });

  it("leaves ordinary weapons and characters alone", () => {
    expect(isVipName("Steyr TMP-Death Eye")).toBe(false);
    expect(isVipName("QBU09-Digital Camo")).toBe(false);
    expect(isVipName("SWAT 2.0")).toBe(false);
  });

  it("knows VVIP characters by the start of their name", () => {
    expect(isVipName("Subject Alpha-Veteran Beret")).toBe(true);
    expect(isVipName("Baron Woman")).toBe(true);
  });
});

describe("the shop's mark", () => {
  it("reads (VIP) / (AI) / (Nano) / (Thường) off a line and writes it back", () => {
    expect(readGradeMark("AN94-Galaxy (VIP)")).toEqual({ name: "AN94-Galaxy", tier: "ULTRA" });
    expect(readGradeMark("SPAS-12-Void-Gold (AI)")).toEqual({ name: "SPAS-12-Void-Gold", tier: "PREMIUM" });
    expect(readGradeMark("Steyr TMP-Death Eye (nano)")).toEqual({ name: "Steyr TMP-Death Eye", tier: "DELUXE" });
    expect(readGradeMark("M4A1-S Predator (thường)")).toEqual({ name: "M4A1-S Predator", tier: "SELECT" });
    expect(readGradeMark("Knife-Black")).toEqual({ name: "Knife-Black", tier: null });
    expect(gradeMark("PREMIUM")).toBe(" (AI)");
    expect(gradeMark("DELUXE")).toBe(" (Nano)");
  });

  it("beats the name either way", () => {
    expect(gradeOf({ name: "AN94-Galaxy", tier: "ULTRA" })).toBe("VIP");
    expect(gradeOf({ name: "Steyr TMP-Death Eye", tier: "DELUXE" })).toBe("Nano");
    expect(gradeOf({ name: "M4A1-S Predator", tier: "SELECT" })).toBeNull();
    expect(gradeOf({ name: "M4A1-S Predator", tier: null })).toBe("VIP");
  });
});
