# Category page specification (`/category/[slug]`, `/categories`)

Source: `https://menzu.lol/category/account-valorant-tu-chon` (docHeight 6031 @800px).

## Page shell

Container: `max-w-[1320px] mx-auto px-4 lg:px-6 py-12` — note `py-12`, **not** the
homepage's `py-6 lg:py-10 space-y-12`.

Backdrop wrapper on inner pages is `fixed inset-0 z-[-1] overflow-hidden pointer-events-none`
(homepage uses `h-[100vh]`).

Three blocks:
1. `div.mb-10` — filter panel
2. `div.flex.flex-col.gap-10` — grid + pagination
3. `div.mt-16.border-t.border-white/5.pt-12` — `DANH MỤC KHÁC` (4 cards)

## Breadcrumb (shared with `/categories`)

Desktop `hidden sm:inline-flex items-center flex-wrap gap-x-3 gap-y-2 px-4 py-2.5 bg-[#111111]/80 border border-white/10 hover:border-white/20 shadow-lg rounded-full text-xs font-black uppercase tracking-widest text-neutral-300 leading-normal backdrop-blur-md transition-all group/nav w-fit mb-6`

Mobile `flex sm:hidden flex-wrap items-center gap-x-2 gap-y-2.5 text-[10px] font-black uppercase tracking-widest leading-normal transition-all w-fit mb-6`

- link: `hover:text-white transition-colors flex items-center gap-1.5 shrink-0` (home icon 12px + label)
- current: `text-indigo-400 hover:text-indigo-300 transition-colors font-black max-w-[300px] md:max-w-[400px]`
- separator: chevron svg 12px between items

## Filter panel — `div.mb-10`

```
div.flex.flex-col.gap-3.w-full
├─ div.flex.flex-col.md:flex-row.gap-2.5              (h 50)  ← search row
│  ├─ div.flex-[6].relative.min-w-0                           ← skin search
│  ├─ div.flex-[4].relative.min-w-0                           ← accessory search
│  └─ button.hidden.md:flex.bg-[#7C3AED].hover:bg-[#6D28D9].active:scale-95.text-white.font-black.rounded-xl.px-6.transition.items-center.gap-2.shrink-0
├─ div.bg-neutral-900/35.border.border-neutral-800/40.rounded-2xl.p-3.5.md:p-4.flex.flex-col.gap-4   (h 192)
│  ├─ div.flex.flex-col.xl:flex-row.xl:items-end.gap-4
│  ├─ div.h-px.bg-neutral-800/40
│  └─ div.flex.flex-col.lg:flex-row.lg:flex-wrap.lg:items-end.gap-2.5.w-full
└─ button.md:hidden.w-full.bg-[#7C3AED].hover:bg-[#6D28D9].active:scale-95.text-white.font-black.rounded-xl.py-3.5
```

### Inputs (verbatim placeholders)
| # | placeholder | class |
|---|---|---|
| 1 | `Tìm: ORA by OneTap, Forsaken, Bubblegum Deathwish......` | `flex-1 bg-transparent outline-none text-white placeholder-neutral-400 text-sm transition-colors` |
| 2 | `Tìm phụ kiện (Buddy, Card...)` | `flex-1 bg-transparent outline-none text-white placeholder-neutral-500 text-sm cursor-text` |
| 3 | `0` (price min) | `bg-transparent outline-none text-white text-sm w-full min-w-0 font-bold tabular-nums` |
| 4 | `Bất kỳ` (price max) | same as 3 |

### Filter controls (verbatim labels, in DOM order)
- submit: `Tìm kiếm` (×2 — desktop + mobile)
- price presets: `Dưới 500K`, `500K - 1M`, `1M - 2M`, `2M - 3M`, `3M - 5M`, `5M+ trở lên`
- sort: `Mới nhất`, `Giá ↑`, `Giá ↓`
- source: `Tất cả`, `DROP`, `MENZU`
- rank: `Rank: Bất kỳ`
- flags: `LOL Free`, `TFT Free`
- extra: `Trình chiếu` with hint `Ctrl + ` + backtick

**This defines the product query API:**
`?q=&accessory=&priceMin=&priceMax=&sort=newest|price_asc|price_desc&source=all|drop|menzu&rank=&lolFree=&tftFree=&page=`

## Product grid

`grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8` — **12 per page**.
Pagination `mt-10 mb-8` → `1 2 … 14` (14 pages for this category).

## ProductCard

Whole card is an `<a href="/account/[code]">`:
`h-full w-full group flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-neutral-600 transition-colors`

- thumb `relative aspect-[4/3] bg-neutral-950 w-full overflow-hidden`
  - img `object-cover transition-transform duration-500 group-hover:scale-105 object-[85%_center]`
  - rank badge (top-left, `absolute top-4 left-4 flex flex-col items-start gap-2 max-w-[80%] z-20`)
    → `glass px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap`
  - code chip (top-right, `absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5`)
    → `px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-sm bg-neutral-950/95 text-neutral-300 border border-neutral-700`
- body `flex-1 flex flex-col p-5`
  - stats row: skin cell `flex items-center gap-1 px-2.5 py-1 bg-neutral-800 text-white font-black text-[11px] border-r border-neutral-700`,
    then tier counts `flex items-center gap-1 text-[11px] font-bold text-{color}-400`
    (colours reuse the homepage map: yellow=Ultra, orange=Exclusive, pink=Premium, cyan=Deluxe, blue=Select)
  - tag pill `px-2 py-1 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold`
  - skin carousel `flex items-center gap-2 mb-6 h-12 overflow-hidden relative hide-scrollbar w-full`
    → track `flex gap-2 transition-transform duration-700 ease-in-out`
    → tile `w-16 h-12 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 p-1 tooltip-trigger`
    → overflow chip `w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700/50 flex items-center justify-center shrink-0`
  - price: old `text-[10px] sm:text-xs text-neutral-500 line-through`, discount `-38%`, sale price large `font-black`

`.glass` is a site utility — approximate with
`bg-white/10 backdrop-blur-md border border-white/15 text-white`.

## Real product data — 12 items, page 1 of `account-valorant-tu-chon`

Images already downloaded to
`/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/<CODE>.png`.

| code | rank | skins | tiers (y/o/p/c/b) | tag | +extra | old | sale |
|---|---|---|---|---|---|---|---|
| VLR2077 | GOLD 1 | 61 | 1/13/7/12/28 | DROP MAIL | +11 | 7.200.000₫ | 3.960.000 |
| VLR2079 | DIAMOND 3 | 71 | 1/6/11/16/37 | DROP MAIL | +11 | 4.200.000₫ | 2.520.000 |
| VLR2030 | DIAMOND 1 | 42 | –/10/8/8/16 | DROP MAIL | +11 | 4.800.000₫ | 2.990.000 |
| VLR1610 | PLATINUM 2 | 14 | –/5/7/–/2 | DROP MAIL | +8 | 3.100.000₫ | 2.175.000 |
| VLR1546 | Unranked | 75 | –/17/4/19/35 | DROP MAIL | +11 | 6.100.000₫ | 3.965.000 |
| MENZU720 | BRONZE 2 | 43 | –/10/5/10/18 | *(none)* | +11 | 4.200.000₫ | 2.310.000 |
| VLR1524 | Unranked | 46 | –/9/2/11/24 | DROP MAIL | +7 | 3.300.000₫ | 2.640.000 |
| VLR1919 | PLATINUM 2 | 52 | 2/11/6/9/24 | DROP MAIL | +11 | 6.050.000₫ | 3.920.000 |
| VLR1640 | SILVER 1 | 81 | –/15/6/19/41 | DROP MAIL | +11 | 6.100.000₫ | 3.355.000 |
| VLR1587 | DIAMOND 3 | 94 | –/11/9/21/53 | DROP MAIL | +11 | 4.900.000₫ | 3.675.000 |
| VLR1500 | Unranked | 170 | 2/27/14/44/83 | DROP MAIL | +11 | 10.600.000₫ | 6.360.000 |
| VLR1453 | Unranked | 57 | 1/17/1/13/25 | DROP MAIL | +11 | 5.500.000₫ | 3.575.000 |

Discount % is derivable: `round((1 - sale/old) * 100)`.

## `/categories`

Same shell, `space-y-8 animate-fade-up` container, and currently an **empty state**:
`w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]`
- `text-xl font-bold text-white mb-2` → `CHƯA CÓ DANH MỤC NÀO`
- `text-neutral-400` → `Danh sách danh mục đang trống. Vui lòng quay lại sau.`
Page header: `flex items-center justify-between mb-8 pb-3 border-b border-indigo-500/20`
with `h1.text-2xl sm:text-3xl font-black uppercase tracking-wider text-white`.

## Responsive
- grid: 1 col <640, 2 cols 640–1023, 3 cols ≥1024, gap 16→24px, `xl:gap-8` at ≥1280
- filter search row stacks below 768 (`md`), submit button swaps to the full-width mobile one
- filter box inner rows stack below 1280 (`xl`) / 1024 (`lg`)
- breadcrumb swaps pill → plain text at 640 (`sm`)
