import { describe, expect, it } from "vitest";

import { softwareBuyable, softwareStockLabel } from "@/lib/softwareStock";

const tier = [{ price: 450000 }];

describe("softwareBuyable / softwareStockLabel", () => {
  it("is buyable on the shelf, unlocked, with a tier", () => {
    const s = { inStock: true, softwareStatus: "UNDETECTED", packages: tier };
    expect(softwareBuyable(s)).toBe(true);
    expect(softwareStockLabel(s)).toBe("Còn hàng");
  });

  it("is not buyable while sales are locked (detected or updating)", () => {
    for (const status of ["DETECTED", "UPDATING"]) {
      const s = { inStock: true, softwareStatus: status, packages: tier };
      expect(softwareBuyable(s)).toBe(false);
      expect(softwareStockLabel(s)).toBe("Tạm khóa mua");
    }
  });

  it("is not buyable with no tier set up", () => {
    const s = { inStock: true, softwareStatus: null, packages: [] };
    expect(softwareBuyable(s)).toBe(false);
    expect(softwareStockLabel(s)).toBe("Chưa mở bán");
  });

  it("is not buyable off the shelf, whatever else holds", () => {
    const s = { inStock: false, softwareStatus: "DETECTED", packages: [] };
    expect(softwareBuyable(s)).toBe(false);
    expect(softwareStockLabel(s)).toBe("Tạm hết hàng");
  });

  it("stays buyable for a risky tool, which the shop still sells", () => {
    expect(softwareBuyable({ inStock: true, softwareStatus: "RISKY", packages: tier })).toBe(true);
  });
});
