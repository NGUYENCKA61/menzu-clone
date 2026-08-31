import { describe, expect, it } from "vitest";

import {
  DEFAULT_REQUIREMENTS,
  parseRequirementLines,
  parseRequirements,
  REQUIREMENT_MAX,
  requirementsOrDefault,
  requirementsToLines,
  sanitizeRequirements,
  serializeRequirements,
} from "@/lib/productRequirements";

/**
 * The requirement list is per product and stored as text, so what matters is
 * what survives a round trip and what a page does when the column holds
 * nothing usable — a storefront must never go blank over it.
 */
describe("sanitizeRequirements", () => {
  it("keeps a row with both halves, drops one missing either", () => {
    expect(
      sanitizeRequirements([
        { label: "CPU", value: "AVX" },
        { label: "Nền tảng", value: "   " },
        { label: "", value: "Steam" },
        { label: " Hỗ trợ ", value: " Windows 10, 11 " },
      ]),
    ).toEqual([
      { label: "CPU", value: "AVX" },
      { label: "Hỗ trợ", value: "Windows 10, 11" },
    ]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: REQUIREMENT_MAX + 3 }, (_, i) => ({
      label: `L${i}`,
      value: "v",
    }));
    expect(sanitizeRequirements(many)).toHaveLength(REQUIREMENT_MAX);
  });
});

describe("parseRequirementLines", () => {
  it("splits each line at its first colon", () => {
    expect(
      parseRequirementLines(
        "Yêu cầu thêm: UEFI bios, secure boot: tắt\nNền tảng: Steam\n\nChỉ nhãn",
      ),
    ).toEqual([
      { label: "Yêu cầu thêm", value: "UEFI bios, secure boot: tắt" },
      { label: "Nền tảng", value: "Steam" },
    ]);
  });

  it("round-trips through the text the box shows", () => {
    const list = parseRequirementLines("CPU: AVX\nRAM: 8 GB");
    expect(parseRequirementLines(requirementsToLines(list))).toEqual(list);
  });
});

describe("stored column", () => {
  it("serialises and parses back", () => {
    const list = [{ label: "CPU", value: "AVX" }];
    expect(parseRequirements(serializeRequirements(list))).toEqual(list);
  });

  it("stores an empty list as null and reads garbage as not set", () => {
    expect(serializeRequirements([])).toBeNull();
    expect(parseRequirements("{not json")).toEqual([]);
    expect(parseRequirements(null)).toEqual([]);
  });

  it("falls back to the shop default when a product has none", () => {
    expect(requirementsOrDefault([])).toBe(DEFAULT_REQUIREMENTS);
    const own = [{ label: "CPU", value: "AVX" }];
    expect(requirementsOrDefault(own)).toBe(own);
  });
});
