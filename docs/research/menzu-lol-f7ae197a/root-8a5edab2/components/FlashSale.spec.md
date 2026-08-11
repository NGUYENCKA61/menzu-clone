# FlashSale Specification (section 2)

## Overview
- **Target files:**
  - `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/flashSaleData.ts`
  - `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FlashSaleCard.tsx`
  - `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FlashSaleSection.tsx`
- **Screenshot:** `docs/design-references/menzu-lol-f7ae197a/root-8a5edab2/00-hero-viewport-800.jpg` (bottom edge)
- **Interaction model:** **native scroll-snap carousel** (`overflow-x-auto` + `snap-x snap-mandatory`)
  with click-driven prev/next arrow buttons, plus a **time-driven countdown**.

> The track is a real horizontally-scrollable element, NOT a transform-based slider.
> Arrows scroll it; the user can also drag/swipe. Do not build a translateX carousel.

## Section-scoped CSS (verbatim from the live `<style>` block)

```css
.fs-realism-container {
  border-radius: 24px;
  color: #fff;
  background: radial-gradient(ellipse 60% 60% at 80% -50%, #3a3a3a, #0f1111);
  border: 5px solid #2a2a2a;
  margin-bottom: 3rem;
  position: relative;
  overflow: hidden;
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

## DOM Structure

```
div.mb-12.lg:mb-16                                                       (760×624)
└─ div.fs-realism-container.p-4.sm:p-6.sm:py-8                           (760×576)
   ├─ div.absolute.inset-0.z-0.pointer-events-none.opacity-10            ← faint bg art
   │  └─ img.object-cover.object-center                                  ← behance/f945cb242281183.696998e170840.png
   └─ div.relative.z-20
      ├─ HEADER div.flex.flex-col.lg:flex-row.items-center.justify-between.mb-8.gap-4.border-b.border-white/10.pb-4
      │  ├─ div.flex.items-center.gap-3.w-full.lg:w-auto.justify-center.lg:justify-start   ← bolt icon + h2
      │  └─ div.flex.flex-col.sm:flex-row.items-center.gap-1.5.sm:gap-2.5.w-full.lg:w-auto.justify-center  ← countdown
      └─ CAROUSEL div.relative.group/flashsale
         ├─ button  ← prev arrow
         ├─ div     ← scroll track (20 cards)
         └─ button  ← next arrow
```

## Computed Styles (exact)

### Heading
`h2` — `text-lg min-[360px]:text-xl sm:text-2xl md:text-3xl font-black text-white uppercase drop-shadow-md text-center whitespace-nowrap`
Text: `FLASHSALE HÔM NAY`. Preceded by a lightning-bolt icon in a rounded badge.

### Countdown
Label `Kết thúc trong`, then three numeric segments separated by literal `.` characters,
suffixed `h`, `m`, `s`. Wrapper `flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5`.

### Arrow buttons (both, 44×44)
prev: `hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-11 h-11 bg-neutral-800 text-indigo-400 border-2 border-neutral-700 rounded-full …`
next: identical but `right-0 … translate-x-4`
→ hidden below 640px; circular; offset half-outside the track.

### Scroll track
`flex overflow-x-auto gap-4 sm:gap-6 pb-2 hide-scrollbar relative z-10 -mx-4 sm:mx-0 px-4 sm:px-0 scroll-px-4 sm:scroll-px-0 snap-x snap-mandatory cursor-grab`

### Card outer (slide)
`w-[calc(50%-6px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] shrink-0 snap-start`
→ **2 per view** <768px, **3 per view** 768–1279px, **4 per view** ≥1280px.

### Card body
`a.group.relative.w-full.h-full.flex.flex-col.bg-neutral-900.border.rounded-[14px].p-2.transition-[border-color,background-color].duration-200.shadow-md.border-neutral-*`

**Discount ribbon** (top-left overlay):
`absolute top-2 left-2 w-[44px] h-[44px] sm:w-[64px] sm:h-[64px] z-30 pointer-events-none` containing an inline SVG ribbon, with the % text absolutely placed:
`absolute w-[56px] sm:w-[80px] text-center text-[#FFE5A0] font-black text-[9px] sm:text-[12px] drop-shadow-md top-[6px] -left-[10px] sm:top-[11px] sm:-left-[15px]`

**Thumbnail**: `relative aspect-[4/3] w-full overflow-hidden bg-neutral-900 rounded-[10px]`
- img: `absolute inset-0 w-full h-full object-cover object-[85%_center] md:group-hover:scale-105 transition-transform duration-500`
- bottom fade: `absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none`
- code chip: `absolute bottom-0 left-0 bg-neutral-900 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-tr-lg`

**Footer**: `mt-auto pt-2.5 flex flex-col gap-2`

1. Stats row — `flex w-full items-stretch bg-neutral-900/60 border border-neutral-700/50 rounded-lg overflow-hidden shadow-sm shrink-0`
   - skin count cell: `flex items-center justify-center min-w-[28px] sm:min-w-[40px] gap-0.5 sm:gap-1 px-1 sm:px-2 py-1 bg-neutral-800 text-white font-black text-[9px] sm:text-[11px]` (icon + number)
   - tiers cell: `flex-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 sm:gap-4 px-1 py-1 sm:px-2 overflow-hidden`
     - each tier: `flex items-center gap-0.5 text-[8px] sm:text-[11px] font-bold text-<color>-400` — **the 4th and later tiers add `hidden sm:flex`**
     - tier icon img: `w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 object-contain shrink-0`

2. Price / CTA bar — `relative w-full bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-500/30 text-[#FFE5A0] rounded-lg flex items-center px-1 sm:px-2 hover:from-indigo-600 hover:to-indigo-700 transition-colors duration-150 group h-[38px] sm:h-[44px]`
   - left icon slot: `absolute left-2 sm:left-3 shrink-0 hidden sm:flex items-center justify-center`
   - text column: `flex-1 flex flex-col items-center justify-center sm:pl-4 w-full`
     - old price span: `text-[8px] sm:text-[10px] text-[#FFE5A0]/70 line-through font-semibold leading-none mb-0.5 truncate max-w-full`
     - new price span: `text-[10px] min-[360px]:text-[11px] sm:text-[15px] font-black leading-none tracking-tighter sm:tracking-tight drop-shadow-md truncate max-w-full`

## States & Behaviors

| Behavior | Trigger | A → B | Transition |
|---|---|---|---|
| Card thumb zoom | hover (≥768px only, `md:group-hover:`) | `scale(1)` → `scale(1.05)` | `transition-transform duration-500` |
| CTA bar | hover | `from-indigo-500 to-indigo-600` → `from-indigo-600 to-indigo-700` | `transition-colors duration-150` |
| Card border | hover | `border-neutral-*` shifts | `transition-[border-color,background-color] duration-200` |
| Carousel | click prev/next | scrolls track by ~one page | native smooth scroll |
| Countdown | 1s interval | h/m/s decrement | — |

## Tier colour → Valorant content-tier icon map

| Colour class | Tier | Asset filename |
|---|---|---|
| `text-yellow-400` | Ultra | `e046854e-406c-37f4-6607-19a9ba8426fc.png` |
| `text-orange-400` | Exclusive | `411e4a55-4e59-7757-41f0-86a53f101bb5.png` |
| `text-pink-400` | Premium | `60bca009-4182-7998-dee7-b8a2558dc369.png` |
| `text-cyan-400` | Deluxe | `0cebb8be-46d7-c12a-d306-e9907bfc5a25.png` |
| `text-blue-400` | Select | `12683d76-48d7-84a3-4e09-6985794f0445.png` |

Base path: `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/valorant-api/contenttiers/`

## Per-Card Content (all 20, verbatim, in DOM order)

Account images live at `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/<CODE>.png`.

| # | code | discount | old price | new price | skins | tiers (colour:count) |
|---|---|---|---|---|---|---|
| 1 | MENZU725 | -40% | 3.300.000 VND | 1.980.000 VND | 25 | orange:9, pink:2, cyan:3, blue:11 |
| 2 | VLR2116 | -15% | 2.100.000 VND | 1.785.000 VND | 18 | orange:3, pink:5, cyan:5, blue:5 |
| 3 | VLR2117 | -35% | 4.100.000 VND | 2.665.000 VND | 45 | yellow:1, orange:10, pink:3, cyan:10, blue:21 |
| 4 | MENZU727 | -55% | 5.800.000 VND | 2.610.000 VND | 82 | yellow:2, orange:7, pink:14, cyan:20, blue:39 |
| 5 | VLR2028 | -30% | 3.000.000 VND | 2.100.000 VND | 71 | yellow:1, orange:6, pink:5, cyan:15, blue:44 |
| 6 | VLR2121 | -45% | 7.100.000 VND | 3.905.000 VND | 56 | yellow:6, orange:16, pink:4, cyan:8, blue:22 |
| 7 | MENZU732 | -30% | 2.100.000 VND | 1.470.000 VND | 25 | orange:2, pink:6, cyan:5, blue:12 |
| 8 | VLR2124 | -50% | 6.300.000 VND | 3.150.000 VND | 114 | orange:13, pink:11, cyan:33, blue:57 |
| 9 | MENZU733 | -51% | 6.000.000 VND | 2.970.000 VND | 64 | orange:19, pink:5, cyan:14, blue:26 |
| 10 | VLR2127 | -45% | 6.800.000 VND | 3.740.000 VND | 54 | yellow:4, orange:14, pink:3, cyan:11, blue:22 |
| 11 | MENZU736 | -50% | 5.700.000 VND | 2.850.000 VND | 66 | orange:11, pink:10, cyan:12, blue:33 |
| 12 | MENZU737 | -50% | 4.900.000 VND | 2.450.000 VND | 61 | yellow:1, orange:14, pink:2, cyan:14, blue:30 |
| 13 | VLR2134 | -55% | 6.600.000 VND | 2.970.000 VND | 47 | orange:14, pink:5, cyan:11, blue:17 |
| 14 | VLR2133 | -45% | 8.300.000 VND | 4.565.000 VND | 100 | yellow:3, orange:20, pink:10, cyan:23, blue:44 |
| 15 | VLR2135 | -20% | 1.800.000 VND | 1.440.000 VND | 38 | yellow:1, orange:5, pink:3, cyan:11, blue:18 |
| 16 | MENZU742 | -45% | 4.200.000 VND | 2.310.000 VND | 55 | orange:7, pink:11, cyan:15, blue:22 |
| 17 | VLR2136 | -60% | 17.200.000 VND | 6.880.000 VND | 184 | yellow:4, orange:39, pink:15, cyan:40, blue:86 |
| 18 | MENZU743 | -60% | 9.900.000 VND | 3.960.000 VND | 138 | yellow:2, orange:23, pink:11, cyan:34, blue:68 |
| 19 | VLR2137 | *(none)* | *(none)* | 850.000 VND | 4 | orange:1, pink:2, blue:1 |
| 20 | MENZU744 | -45% | 5.300.000 VND | 2.915.000 VND | 48 | yellow:1, orange:10, pink:8, cyan:12, blue:17 |

Card 19 has **no discount ribbon and no old price** — render only the new price.

## Assets
- Background art: `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/behance/f945cb242281183.696998e170840.png`
- 20 account thumbnails (see table)
- 5 content-tier icons (see map)

## Responsive Behavior
- **≥1280px (`xl`):** 4 cards per view, gap 24px
- **768–1279px (`md`/`lg`):** 3 cards per view, gap 24px
- **640–767px (`sm`):** 2 cards per view, gap 24px, arrows visible
- **<640px:** 2 cards per view, gap 16px, **arrows hidden**, track bleeds edge-to-edge
  (`-mx-4 px-4 scroll-px-4`), tiers beyond the 3rd hidden, CTA bar 38px tall (vs 44px)
- Header stacks vertically below 1024px (`flex-col lg:flex-row`); countdown stacks below 640px.
