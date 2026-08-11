# HeroBanners Specification

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/HeroBanners.tsx`
- **Screenshot:** `docs/design-references/menzu-lol-f7ae197a/root-8a5edab2/00-hero-viewport-800.jpg`
- **Interaction model:** **static** + hover zoom. NOT an auto-rotating carousel.

> VERIFIED: image order sampled at t=0, t+3.5s, t+7s — identical. The main banner track holds
> exactly **one** slide. Do not add autoplay, timers, or dot indicators.

## DOM Structure

```
div.w-full.space-y-8                                            (760×485 @800px)
├─ div.hidden.md:block.w-full                                   ← DESKTOP variant (≥768px)
│  ├─ div.grid.grid-cols-4.gap-4.lg:gap-6.mb-4.lg:mb-6
│  │  └─ div.col-span-4.h-[320px].lg:h-[400px].w-full.relative.rounded-2xl.overflow-hidden.group
│  │     └─ div.w-full.h-full.flex                              ← slider track (1 slide)
│  │        └─ div.w-full.h-full.flex-shrink-0.relative.overflow-hidden
│  │           └─ img.absolute.inset-0.w-full.h-full.select-none
│  └─ div.grid.grid-cols-4.gap-4.lg:gap-6.mb-6.lg:mb-12         ← 4 sub-banners
│     └─ div.relative.h-[117px].lg:h-[147px].rounded-2xl.overflow-hidden.group.cursor-pointer.bg-[#0a0a0a]   ×4
│        ├─ a.absolute.inset-0.z-20                             ← full-tile click target
│        └─ img.absolute.inset-0.w-full.h-full.group-hover:scale-105.transition-transform.duration-500.object-cover
└─ div.md:hidden.w-full                                         ← MOBILE variant (<768px)
```

## Computed Styles (exact)

### Root
`w-full space-y-8` → vertical gap 32px between desktop/mobile blocks

### Main banner
- wrapper: `col-span-4 h-[320px] lg:h-[400px] w-full relative rounded-2xl overflow-hidden group`
  → height **320px** below `lg` (1024px), **400px** at ≥1024px; border-radius `16px`
- track: `w-full h-full flex`
- slide: `w-full h-full flex-shrink-0 relative overflow-hidden`
- image: `absolute inset-0 w-full h-full select-none` (intrinsic 1920×600)

### Sub-banner grid
- `grid grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-12`
  → **4 columns at every width**; gap 16px, 24px at ≥1024px; bottom margin 24px → 48px at ≥1024px
- tile: `relative h-[117px] lg:h-[147px] rounded-2xl overflow-hidden group cursor-pointer bg-[#0a0a0a]`
  → height **117px** below lg, **147px** at ≥1024px
- link overlay: `absolute inset-0 z-20`
- image: `absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500 object-cover`
  (intrinsic 1000×500 each)

### Spacing between the two grids
first grid `mb-4 lg:mb-6` (16px → 24px)

## States & Behaviors

### Hover — sub-banner tiles
- **Trigger:** hover on tile (`group`)
- **State A:** `transform: scale(1)`
- **State B:** `transform: scale(1.05)`
- **Transition:** `transition-transform duration-500`
- Main banner has the `group` class but no hover transform on its image.

### Autoplay / rotation
**N/A — verified none.**

## Assets
All under `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload/`:
- Main banner: `bannermung9-7-26.png` (1920×600)
- Sub-banners, in this exact left→right order:
  1. `subbanner3.png`
  2. `subbanner4.png`
  3. `subbanner2.png`
  4. `subbanner1.png`

## Text Content (verbatim)
None — the section is entirely imagery. `alt` values on the live site are
`"banner"` for the main image and `"Sub Banner"` for each of the four tiles.

## Responsive Behavior
- **Desktop (≥768px `md`):** the `hidden md:block` block renders. Main banner 320px tall,
  growing to 400px at ≥1024px. Sub-banners 4-across, 117px tall → 147px at ≥1024px.
- **Mobile (<768px):** the desktop block is hidden and the `md:hidden` block renders instead.
  Build the mobile block with the same content — main banner then the 4 sub-banners — using
  `grid-cols-2 gap-3` for the sub-banners and `h-[180px]` for the main banner, keeping
  `rounded-2xl overflow-hidden` and the same hover zoom.
- **Breakpoint:** structural switch at **768px** (`md`); size step at **1024px** (`lg`).
