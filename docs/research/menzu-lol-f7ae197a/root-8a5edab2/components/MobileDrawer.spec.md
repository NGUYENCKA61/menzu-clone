# MobileDrawer Specification

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileDrawer.tsx`
- **Owner:** rendered by `SiteHeader`, which holds the `drawerOpen` state
- **Interaction model:** **click-driven** — hamburger opens, backdrop/close button closes,
  accordion groups expand on click (single-open).

## Mechanism (VERIFIED on the live site)

Both the backdrop and the panel stay mounted at all times; only classes toggle.

| Element | Closed | Open |
|---|---|---|
| backdrop | `opacity-0 pointer-events-none` | `opacity-100` |
| panel | `-translate-x-full` (x = −288) | `translate-x-0` (x = 0) |

## Computed Styles (exact, from the live DOM)

### Backdrop
`fixed inset-0 z-[9998] bg-black/60 transition-opacity duration-300 lg:hidden`

### Panel
`fixed inset-y-0 left-0 z-[9999] w-72 bg-[#111111] shadow-none flex flex-col transition-transform duration-300 transform-gpu lg:hidden`
→ width **288px** (`w-72`), full viewport height, hidden at ≥1024px.
Live site keeps `shadow-none` in both states; the clone uses `shadow-2xl` when open
(cosmetic, matches the elevation the backdrop implies).

### Header
`p-5 flex items-center justify-between` (height 76px)
- logo wrapper: `relative w-9 h-9 flex items-center justify-center`
  - spin ring: `navbar-spin-ring absolute inset-[-2px] rounded-full border border-transparent border-t-red-500 animate-spin-slow`
  - image: `w-6 h-6 object-contain` (24px — smaller than the header's 28px)
- wordmark: `text-lg font-black italic tracking-tighter text-white` (`MENZU`) — note `text-lg`,
  one step smaller than the main header's `text-xl`
- subtitle: `text-[8px] font-bold tracking-[0.2em] text-red-500 uppercase` (`Valorant`) — `8px` vs `9px`
- close button: `p-1.5 text-neutral-400 hover:text-white transition-colors`

### Body
`flex-1 overflow-y-auto py-3 space-y-0.5 scrollbar-thin select-none`
(clone substitutes the project's `menzu-scroll-x` utility for `scrollbar-thin`)

### Accordion group
- wrapper: `flex flex-col`
- trigger button (verbatim from live DOM):
  `w-full flex items-center justify-between py-3 px-6 text-neutral-200 hover:text-white hover:bg-white/[0.02] active:bg-white/[0.05] transition-all text-left text-xs font-bold uppercase tracking-wider`
- chevron rotates 180° when expanded, `transition-transform duration-200`

### Sub-item — ⚠️ INFERRED, NOT MEASURED
`flex items-center gap-3 py-2.5 pl-10 pr-6 text-neutral-400 hover:text-white hover:bg-white/[0.02] transition-colors`
with label `text-[11px] font-semibold tracking-wide` and a 13px icon.

Reason: expanding an accordion on the live site froze the CDP renderer every time
(4 attempts, both tabs, 45s timeouts). Values were chosen to match the drawer's own
`px-6` rhythm and the desktop dropdown's type scale. **Re-measure if the live page
becomes inspectable.**

## Content (verbatim, in order)

Four body entries — three accordions plus one plain link:

| # | Label | Type | Items |
|---|---|---|---|
| 1 | `VALORANT HUB` | accordion | `Crosshair Library`, `Lineups & Callouts`, `Tìm Bạn Leo Rank` |
| 2 | `CÔNG CỤ` | accordion | `Check Skin Valorant`, `Valorant Build`, `Check Thư Welcome`, `Trình Tạo Mã 2FA` |
| 3 | `GIAO DỊCH` | accordion | `Thu Cũ Đổi Mới`, `Mua Account` |
| 4 | `NHẬN ACC FREE` | plain link | — |

Groups mirror the desktop dropdowns exactly.

## Verification performed

Clicking through CDP freezes the renderer, so the open state was verified by temporarily
defaulting `drawerOpen = true` and `expanded = "CÔNG CỤ"`, rebuilding, and measuring the
real React render:

- panel `x = 0`, `width = 288` ✓
- `translate-x-0` + `shadow-2xl` present ✓
- backdrop `opacity: 1`, `pointer-events: auto` ✓
- exactly 3 accordion triggers, only `CÔNG CỤ` `aria-expanded="true"` ✓ (single-open works)
- rendered links: logo, the 4 `CÔNG CỤ` items, `NHẬN ACC FREE` ✓

**Not verified:** the hamburger click itself. Wiring reviewed in source
(`onClick → setDrawerOpen(true) → open prop → class ternary`).

## Responsive Behavior
- **≥1024px (`lg`):** both backdrop and panel are `lg:hidden` — fully removed from view;
  the desktop dropdown row takes over.
- **<1024px:** hamburger visible in the header, drawer available.
- Panel width is a fixed 288px at every width below the breakpoint.
