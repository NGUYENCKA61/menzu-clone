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
  stats: [ProductStat, ProductStat];
  /** Where the tile leads — a category or a service page. */
  href: string;
}
