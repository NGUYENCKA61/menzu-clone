import { isSalesLocked } from "@/lib/softwareStatus";

/**
 * Whether a tool can be bought right now, by one rule for every place that
 * says so: the buy panel's stock line and the Product markup a crawler reads.
 *
 * Three things stand in the way: the product is off the shelf, the shop has
 * locked sales while the tool is detected or updating, or no tier has been
 * set up yet. The markup used to read only the first, so a locked tool was
 * InStock to Google while its page said "tạm khóa mua key", and the stock
 * line under that sentence still said "Còn hàng" (the owner's SEO review,
 * 13/10/2026).
 */
export interface SoftwareStockInput {
  inStock: boolean;
  softwareStatus: string | null | undefined;
  packages: readonly unknown[];
}

export function softwareBuyable(software: SoftwareStockInput): boolean {
  return (
    software.inStock &&
    !isSalesLocked(software.softwareStatus) &&
    software.packages.length > 0
  );
}

/** The stock line's words, in the same order of reasons as above. */
export function softwareStockLabel(software: SoftwareStockInput): string {
  if (!software.inStock) return "Tạm hết hàng";
  if (isSalesLocked(software.softwareStatus)) return "Tạm khóa mua";
  if (software.packages.length === 0) return "Chưa mở bán";
  return "Còn hàng";
}
