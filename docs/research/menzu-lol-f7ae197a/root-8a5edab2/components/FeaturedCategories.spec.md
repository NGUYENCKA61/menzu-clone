# FeaturedCategories Specification (section 3)

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FeaturedCategories.tsx`
- **Interaction model:** **static** + hover-driven. No scroll, no click state.
- This is the **only** section that uses the `headingNow` font
  (`font-[family-name:var(--font-headingnow)]`, already wired in `layout.tsx`).

## DOM Structure

```
section.w-full.mb-12                                                     (760×1232)
├─ div.flex.flex-col.items-center.justify-center.mb-10.text-center       ← heading block
│  ├─ h2  "SẢN PHẨM NỔI BẬT"
│  └─ div.flex.items-center.justify-center.gap-2.mt-3.opacity-60         ← diamond divider
│     ├─ div.w-16.h-px.bg-gradient-to-l.from-indigo-500.to-transparent
│     ├─ div.w-2.h-2.rotate-45.border.border-indigo-400.bg-indigo-500/50
│     └─ div.w-16.h-px.bg-gradient-to-r.from-indigo-500.to-transparent
└─ div.grid.grid-cols-2.lg:grid-cols-4.gap-4.lg:gap-6                    ← 4 cards
   └─ a.group.relative.w-full.pt-16.flex.flex-col.items-center           ×4
      └─ div.relative.w-full.aspect-[3/4].flex.flex-col.items-center.justify-end.p-2.pb-2.sm:p-4.transition-all.duration-300
         │   style="--theme-hover:#6366f1;--theme-border:#4748af"
         ├─ [1] octagon border layer
         ├─ [2] octagon inner fill + backcard image + overlay
         ├─ [3] agent artwork layer (mobile + desktop copies)
         └─ [4] text block (title lines + CTA)
```

The `pt-16` on the anchor gives the agent artwork room to overflow above the card.

## Computed Styles (exact)

### Heading
`h2`: `text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider md:tracking-widest text-white whitespace-nowrap px-2`

### Card CSS custom properties
Every one of the 4 cards carries the **same** inline style:
`--theme-hover:#6366f1; --theme-border:#4748af`

### [1] Octagon border layer
`absolute inset-0 bg-[var(--theme-border)] group-hover:bg-[var(--theme-hover)] transition-colors duration-500 [clip-path:polygon(16px_0,calc(100%-16px)_0,100%_16px,100%_calc(100%-16px),calc(100%-16px)_100%,16px_100%,0_calc(100%-16px),0_16px)]`

### [2] Octagon inner fill
`absolute inset-[1.5px] overflow-hidden [clip-path:polygon(15px_0,calc(100%-15px)_0,100%_15px,100%_calc(100%-15px),calc(100%-15px)_100%,15px_100%,0_calc(100%-15px),0_15px)] bg-[#0d0d12]`
- child img `object-cover` → `backcard.png`
- child `div.absolute.inset-0` (tint overlay)

### [3] Agent artwork layer
`absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-[130%] pointer-events-none z-20 group-hover:scale-105 transition-transform duration-500 origin-bottom flex items-end justify-center`
- mobile copy: `div.relative.w-full.h-full.sm:hidden.block` → img `object-contain object-bottom`
- desktop copy: `div.relative.w-full.h-full.hidden.sm:block` → img `object-contain object-bottom`
- **both copies use the SAME image file** — they exist only to swap `next/image` sizing.

### [4] Text block
`relative z-30 flex flex-col items-center w-full text-center mt-auto pb-0 sm:pb-1`

Title group: `mb-3 sm:mb-4 flex flex-col items-center w-full font-[family-name:var(--font-headingnow)]`
- line 1: `text-[18px] sm:text-[22px] lg:text-[28px] font-black uppercase tracking-normal leading-none mb-1 whitespace-nowrap`
- line 2: `text-[36px] sm:text-[48px] lg:text-[64px] font-black uppercase tracking-normal leading-[0.9]`

CTA wrapper: `relative w-fit min-w-[100px] sm:min-w-[140px] mb-0 sm:mb-2 cursor-pointer mt-1 sm:mt-2`
- outer: `relative w-full p-[2px] transition-all duration-300 group-hover:scale-[1.05] group-hover:drop-shadow-[0_0_15px_var(--theme-hover)] [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)] bg-[var(--theme-border)]`
- inner: `relative w-full h-full bg-transparent group-hover:bg-white transition-colors duration-300 flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 [clip-path:polygon(11px_0,100%_0,100%_calc(100%-11px),calc(100%-11px)_100%,0_100%,0_11px)]`
- label: `XEM CHI TIẾT`

## States & Behaviors

| Target | Property | State A | State B | Transition |
|---|---|---|---|---|
| octagon border | background | `#4748af` | `#6366f1` | `transition-colors duration-500` |
| agent artwork | transform | `scale(1)` | `scale(1.05)` | `transition-transform duration-500`, `origin-bottom` |
| CTA outer | transform | `scale(1)` | `scale(1.05)` | `transition-all duration-300` |
| CTA outer | drop-shadow | none | `0 0 15px #6366f1` | same |
| CTA inner | background | `transparent` | `white` | `transition-colors duration-300` |

All driven by a single `group` on the card anchor. No scroll or click behavior.

## Per-Card Content (verbatim, in DOM order)

| # | line 1 | line 2 | agent art |
|---|---|---|---|
| 1 | `ACC TỰ CHỌN` | `VALORANT` | `clove.png` |
| 2 | `CHECK SKIN KHO ĐỒ` | `VALORANT` | `omen.png` |
| 3 | `BUILD KHO ĐỒ` | `VIP` | `jett.png` |
| 4 | `DỊCH VỤ` | `VALORANT` | `neon.png` |

CTA label on all four: `XEM CHI TIẾT`
Section heading: `SẢN PHẨM NỔI BẬT`

## Assets
- Card back: `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/images/backcard.png`
- Agents (base `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload/`):
  `clove.png`, `omen.png`, `jett.png`, `neon.png`

## Responsive Behavior
- **≥1024px (`lg`):** 4 columns, gap 24px; title lines 28px / 64px
- **640–1023px (`sm`/`md`):** 2 columns, gap 16px; title lines 22px / 48px; card padding 16px
- **<640px:** 2 columns, gap 16px; title lines 18px / 36px; card padding 8px;
  the `sm:hidden` agent-art copy is used; CTA `min-w-[100px]`, padding `px-3 py-2`
- **Breakpoints:** grid switches at **1024px**; typography/padding step at **640px**.
- Card aspect ratio is fixed `3/4` at every width.
