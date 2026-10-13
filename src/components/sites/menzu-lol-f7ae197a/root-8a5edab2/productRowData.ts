// Shared types for the menzu.lol product-row sections — "Sản Phẩm Nổi Bật",
// "Đấu Trường Chân Lý", "Dịch Vụ Game" and "Dịch Vụ Khác".
//
// The card data itself comes from the database via src/lib/homeRows.ts. The
// hand-written fixtures that used to live here were dead once that landed, and
// are gone rather than kept in sync with a schema nothing reads them through.

export interface ProductStat {
  label: string;
  value: string;
}

export interface ProductCard {
  image: string;
  title: string;
  /**
   * One or two lines under the title. Optional because the service rows share
   * this shape and carry no such line — a tile without one closes up rather
   * than reserving the space.
   */
  description?: string | null;
  stats: [ProductStat, ProductStat];
  /** Where the tile leads — a category or a service page. */
  href: string;
  /**
   * "PC" / "MOBILE" / "SPOOFER" for a category the shop has tagged, so the
   * game-list row can filter its tiles by chip. Absent on service tiles and
   * on categories nobody has tagged yet.
   */
  platform?: string | null;
  /**
   * The cheapest paid price in the category, in đồng, for a "Chỉ từ 39.000đ"
   * line on the tile (the owner, 13/10/2026); null when nothing paid is on
   * sale. A free tool's 1đ placeholder tier is not a price.
   */
  fromPrice?: number | null;
  /** How many products the category has on sale; null on service tiles. */
  count?: number | null;
}
