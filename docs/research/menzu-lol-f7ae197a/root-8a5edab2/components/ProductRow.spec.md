# ProductRow Specification (sections 4, 5, 6, 7)

## Overview
- **Target files:**
  - `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/productRowData.ts`
  - `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ProductRow.tsx`
- **Interaction model:** **static grid** + hover-driven.

> IMPORTANT: despite looking like carousels, sections 4–7 are plain CSS **grids**
> (`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4`). There is no track, no arrows,
> no scroll-snap, no overflow. Do not build a carousel.

One reusable `ProductRow` renders all four sections; only the heading, "view all" link and
the card array differ.

## DOM Structure

```
section.w-full                                          (sec 4 adds `mb-12`)
├─ div.flex.flex-row.items-center.justify-between.mb-8
│  ├─ div.flex.items-center.gap-2.5
│  │  ├─ div.w-[3px].h-5.bg-[#7C3AED].rounded-full.shrink-0
│  │  └─ h2
│  └─ a  ← "view all" link
│     ├─ span.hidden.sm:inline  "XEM TẤT CẢ"
│     ├─ span.sm:hidden         "XEM THÊM"
│     └─ svg (arrow, 14×14)
└─ div.grid.grid-cols-2.md:grid-cols-3.lg:grid-cols-4.gap-4.sm:gap-6
   └─ a  ← product card ×N
      ├─ div  ← 16/9 thumbnail
      ├─ h3   ← title
      ├─ div.grid.grid-cols-2.gap-1.5.sm:gap-3.mb-3.sm:mb-4   ← 2 stat cells
      └─ div.w-full.mt-auto.relative                          ← CTA
```

## Computed Styles (exact)

### Heading row
- `h2`: `text-xl sm:text-2xl font-black uppercase tracking-wider text-white`
- accent bar: `w-[3px] h-5 bg-[#7C3AED] rounded-full shrink-0`
- view-all link: `group flex items-center gap-1 text-[10px] sm:text-xs font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest border-b border-neutral-700 hover:border-[#7C3AED]`

### Card
`group flex flex-col bg-[#12141c] rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 p-3 sm:p-4`

### Thumbnail
`relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-4 border border-indigo-500/10 group-hover:border-indigo-500/30 transition-colors`
- img: `object-cover transition-transform duration-500 group-hover:scale-110`

### Title
`text-center text-sm sm:text-base font-black uppercase text-white mb-4 group-hover:text-indigo-400 transition-colors tracking-widest drop-shadow-md`

### Stat cell
`bg-[#0a0a0d] rounded-lg p-1 sm:p-2 xl:p-2.5 flex flex-col xl:flex-row items-center justify-center xl:justify-start gap-1 xl:gap-2.5 border border-indigo-500/10 relative overflow-hidden group-hover:border-indigo-500/30`
- corner ticks (2, both `hidden sm:block`):
  - `absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-indigo-500/50 hidden sm:block`
  - `absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-indigo-500/50 hidden sm:block`
- icon box: `w-5 h-5 sm:w-7 sm:h-7 xl:w-8 xl:h-8 rounded bg-<tone>-500/10 flex items-center justify-center shrink-0 border border-<tone>-500/20`
- text col: `flex flex-col items-center xl:items-start text-center xl:text-left`
  - label: `text-[7px] sm:text-[10px] text-gray-500 font-bold uppercase mb-0 sm:mb-0.5 whitespace-nowrap`
  - value: `text-[10px] sm:text-sm font-black text-<tone> leading-none`

**Stat tone by label** (fixed mapping observed across all 4 sections):

| Label | icon box tone | value colour |
|---|---|---|
| `Đã Bán` | red | `text-red-500` |
| `Đang Bán` | green | `text-green-500` |
| `Loại SP` | indigo | `text-indigo-400` |
| `Giá từ` | amber | `text-amber-500` |
| `Báo giá` | amber | `text-amber-500` |
| `Đã xong` | green | `text-green-500` |

### CTA (clipped-corner button)
- wrapper: `w-full mt-auto relative`
- outer: `relative w-full p-[1.5px] transition-all duration-300 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] bg-indigo-500/50 group-hover:bg-indigo-500`
- inner: `relative w-full bg-[#12141c] group-hover:bg-indigo-500 transition-colors duration-300 flex items-center justify-center py-2.5 sm:py-3 [clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)]`
- label span: `text-white font-black text-[10px] sm:text-xs uppercase tracking-widest` → `XEM NGAY`
- an svg sits on each side of the label

## States & Behaviors

| Target | Property | A → B | Transition |
|---|---|---|---|
| card border | colour | `indigo-500/20` → `indigo-500/50` | `transition-all duration-300` |
| thumbnail img | transform | `scale(1)` → `scale(1.1)` | `transition-transform duration-500` |
| thumbnail border | colour | `indigo-500/10` → `indigo-500/30` | `transition-colors` |
| title | colour | `white` → `indigo-400` | `transition-colors` |
| stat cell border | colour | `indigo-500/10` → `indigo-500/30` | inherited |
| CTA outer | background | `indigo-500/50` → `indigo-500` | `transition-all duration-300` |
| CTA inner | background | `#12141c` → `indigo-500` | `transition-colors duration-300` |
| view-all link | colour / border | `neutral-400`/`neutral-700` → `white`/`#7C3AED` | `transition-colors` |

No scroll or click behavior.

## Content

Image base: `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/`

### Section 4 — heading `SẢN PHẨM NỔI BẬT` (section adds `mb-12`)
| # | image | title | stat 1 | stat 2 |
|---|---|---|---|---|
| 1 | `upload/acctuchon.gif` | `ACCOUNT VALORANT TỰ CHỌN` | Đã Bán `6202` | Đang Bán `165` |
| 2 | `upload/0-5.png` | `RANDOM VALORANT 20K \| ĐỔI THÔNG TIN` | Đã Bán `1600` | Đang Bán `8` |
| 3 | `upload/prerankthumb.png` | `RANDOM SMUFT BẮN RANK \| ĐỔI THÔNG TIN` | Đã Bán `208` | Đang Bán `3` |
| 4 | `upload/rdlv20.png` | `RANDOM VALORANT TRÊN LV 20 \| ĐỔI THÔNG TIN` | Đã Bán `113` | Đang Bán `0` |
| 5 | `upload/nfarank.png` | `RANDOM VALORANT TRÊN LV 20 \| NFA` | Đã Bán `199` | Đang Bán `0` |

### Section 5 — heading `ĐẤU TRƯỜNG CHÂN LÝ`
| # | image | title | stat 1 | stat 2 |
|---|---|---|---|---|
| 1 | `account/TFT/pettim.png` | `RANDOM ACC TFT` | Loại SP `5` | Đang Bán `840` |
| 2 | `upload/petim.png` | `ACC TFT PET TÍM` | Loại SP `61` | Đang Bán `200` |
| 3 | `upload/SANTFTTUCHON.png` | `ACC TFT SÀN TÍM` | Đã Bán `0` | Đang Bán `0` |
| 4 | `upload/tfttuchon.png` | `ACC TFT HÀNG HIỆU` | Đã Bán `0` | Đang Bán `0` |

### Section 6 — heading `Dịch Vụ Game`
| # | image | title | stat 1 | stat 2 |
|---|---|---|---|---|
| 1 | `external/www-riotgames-com/riotpr-mar2023-social-twitch-1920x1080-03-17-2023.png` | `Dịch Vụ Riot Games` | Giá từ `200K ~ 800K` | Đã xong `96 đơn` |
| 2 | `upload/packvn.png` | `Nạp Valorant Point VN` | Giá từ `109K ~ 2.2M` | Đã xong `213 đơn` |
| 3 | `upload/phthumb.png` | `Nạp Valorant Point PH` | Giá từ `199K ~ 1.9M` | Đã xong `64 đơn` |

### Section 7 — heading `Dịch Vụ Khác`
| # | image | title | stat 1 | stat 2 |
|---|---|---|---|---|
| 1 | `external/cdn-prod-website-files-com/66daca61a92f146aa75284f7_66daca5bce3c8eca87e46731_vi-tra-sau-va-the-tin-dung.webp` | `Rút Ví Trả Sau` | Báo giá `Liên hệ` | Đã xong `300 đơn` |
| 2 | `external/cdn-tgdd-vn/2-110423-103232-800-resize.jpg` | `Youtube Premium Cá Nhân` | Giá từ `50K ~ 550K` | Đã xong `8 đơn` |
| 3 | `upload/mokhoafb.png` | `Dịch Vụ Mở Khóa Facebook` | Báo giá `Liên hệ` | Đã xong `43 đơn` |

View-all link text is the same in all four: `XEM TẤT CẢ` (≥640px) / `XEM THÊM` (<640px).
CTA label on every card: `XEM NGAY`.

## Responsive Behavior
- **≥1024px (`lg`):** 4 columns; stat cells go horizontal (`xl:flex-row` at ≥1280px), icon 32px
- **768–1023px (`md`):** 3 columns
- **640–767px (`sm`):** 2 columns, gap 24px, card padding 16px, title 16px, icon 28px
- **<640px:** 2 columns, gap 16px, card padding 12px, title 14px, icon 20px,
  stat label 7px, corner ticks hidden, view-all shows `XEM THÊM`
- **Breakpoints:** 640 (`sm`), 768 (`md`), 1024 (`lg`), 1280 (`xl` — stat cell axis flip)
