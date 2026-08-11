# ReviewsSection Specification (section 8)

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ReviewsSection.tsx`
- **Interaction model:** **native scroll-snap track** (drag/swipe) + hover. No autoplay, no arrows.

## DOM Structure

```
div.mb-12.lg:mb-16
└─ div.mb-14.w-full.border-t.border-[#1b1c28].pt-12
   └─ div.grid.grid-cols-1.lg:grid-cols-12.gap-6.lg:gap-6.items-stretch
      ├─ div.lg:col-span-3.flex.flex-col.justify-center.gap-3.5.lg:gap-4.pt-0.lg:pt-0.relative.overflow-hidden
      │  ├─ div  ← giant ghost word "TRUST"
      │  ├─ div.flex.items-center.gap-2.5            ← title row
      │  └─ div.flex.flex-row.items-end.justify-between.lg:flex-col.lg:items-start.lg:gap-4.w-full.mt-1.lg:mt-0
      │        ← rating block + "Xem tất cả" link
      └─ div.lg:col-span-9.relative.min-w-0
         └─ div.flex.gap-4.overflow-x-auto.pb-4.snap-x.snap-mandatory.hide-scrollbar.overscroll-x-contain.cursor-grab.active:cursor-grabbing.select-none
            └─ review card ×5
```

`.hide-scrollbar` is defined by the FlashSale section's `<style>` block. Because this component
may render independently, use the global `.menzu-scroll-x` utility already in `globals.css`
(identical rules) **in addition to** `hide-scrollbar`.

## Computed Styles (exact)

- Ghost word: `hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 text-[100px] font-black text-white/[0.015] select-none tracking-widest uppercase pointer-events-none -z-10` → text `TRUST`
- Rating number: `text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none` → `5.0`
- Rating caption: `text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest whitespace-nowrap leading-none` → `600 ĐÁNH GIÁ THỰC`
- Track: `flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar overscroll-x-contain cursor-grab active:cursor-grabbing select-none`
- Card: `w-[280px] sm:w-[320px] lg:w-[calc((100%-32px)/3)] border border-[#25283b] p-5 rounded-2xl snap-start shrink-0 flex flex-col group relative overflow-hidden cursor-pointer`

## States & Behaviors

| Target | Property | A → B | Transition |
|---|---|---|---|
| card | border | `#25283b` → lighter | `transition-colors` |
| track | cursor | `grab` → `grabbing` | on `:active` |

No autoplay, no arrows, no IntersectionObserver.

## Content

Section title row: an accent bar + heading `ĐÁNH GIÁ KHÁCH HÀNG`
Rating: `5.0` / `600 ĐÁNH GIÁ THỰC` / link `Xem tất cả`

5 review cards (verbatim, in order). Avatars live in
`/sites/menzu-lol-f7ae197a/root-8a5edab2/images/feedback/avatar/`:

| # | name | badge | date | body | amount | avatar file |
|---|---|---|---|---|---|---|
| 1 | `Duy Anh` | `Tài khoản đã xác minh` | `23/03/2024` | `+1 uy tín đã giao dịch 4 lần` | `5.250.000đ` | `fb-avatar-3c833108-c1b0-4492-8a30-78a3db774db5.webp` |
| 2 | `Quang Lâm` | `Tài khoản đã xác minh` | `05/02/2023` | `Ut vs tận tâm nha ae` | `2.100.000đ` | `fb-avatar-57655c36-1580-45c7-a1af-e8d5e65d3c7d.webp` |
| 3 | `Phạm Thế Cường` | `Tài khoản đã xác minh` | `26/04/2026` | `Tuy mua trả góp nhg UT!` | `2.480.000đ` | `fb-avatar-5a6a7b1c-bb9f-4d15-b22c-6e1537d86b83.webp` |
| 4 | `Nguyễn Tuấn Hùng` | `Tài khoản đã xác minh` | `01/10/2024` | `+1 legit giao dịch nhanh gọn` | `2.400.000đ` | `fb-avatar-d8dfdbc4-4045-4ff7-ac86-f4d450a99ffb.webp` |
| 5 | `Nguyễn Thành Xuyên` | `Tài khoản đã xác minh` | `02/08/2025` | `+1 legit nha` | `2.000.000đ` | `fb-avatar-2d4a2ff1-693f-4a6a-b222-57f910f9866c.webp` |

Each card's amount line is prefixed by the label `Giao dịch:`.

## Responsive Behavior
- **≥1024px (`lg`):** 12-col grid — 3-col info sidebar + 9-col track; cards `calc((100%-32px)/3)`
  (3 visible); ghost "TRUST" word visible; rating block stacks vertically
- **640–1023px:** single column, info block above track; cards fixed 320px wide
- **<640px:** single column; cards fixed 280px wide; rating number 36px (vs 48px);
  rating block lays out horizontally (`flex-row items-end justify-between`)
- **Breakpoints:** 640 (`sm`) card width + type, 1024 (`lg`) layout switch
