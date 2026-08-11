# menzu.lol — Page Topology (`/`)

- **Site key:** `menzu-lol-f7ae197a`
- **Page key:** `root-8a5edab2`
- **Title:** `Menzu Valorant | Shop Account Valorant Uy Tín`
- **Stack detected:** Next.js (App Router, Turbopack build) + Tailwind CSS + Radix/shadcn primitives + Sonner toasts
- **Theme:** dark-only. `<html class="... dark">`, `<body class="min-h-full flex flex-col">`
- **Measured at:** viewport 800×940 (extension viewport could not be resized; all breakpoint data
  below is read from Tailwind responsive variants in the DOM, which is authoritative)
- **Document height:** 6865px @ 800px wide
- **Smooth-scroll library:** NONE (no `.lenis`, no Locomotive; `scroll-behavior: auto`)

## Root layout

```
body
├─ div                                    (portal host, h0)
├─ div.min-h-screen.flex.flex-col.text-white.overflow-x-clip
│  │   selection:bg-indigo-500/30 transition-colors duration-300
│  ├─ [0] div.w-full.shrink-0                     h=104   ← spacer matching fixed nav
│  ├─ [1] nav.fixed.top-0.left-0.right-0.z-[100]  h=104   ← SiteHeader (2 rows)
│  ├─ [2] main.flex-1.relative.z-20.w-full.flex.flex-col
│  │   ├─ div.w-full
│  │   │  ├─ div.fixed.top-0.left-0.w-full.h-[100vh].z-[-1].overflow-hidden.pointer-events-none
│  │   │  │     └─ img.object-cover.object-center.transition-all.duration-700   ← PageBackdrop
│  │   │  │     └─ div.absolute.inset-0.bg-[#0a0a0d]/70                          ← dim overlay
│  │   │  └─ div.w-full.max-w-[1320px].mx-auto.px-4.lg:px-6.py-6.lg:py-10.space-y-12
│  │   │        └─ div.w-full.flex.flex-col.space-y-6.sm:space-y-12   ← 11 sections
│  │   └─ footer.relative.z-10.w-full.bg-[#050508].border-t.border-white/10.mt-auto
│  ├─ [3] div.fixed.left-0.top-1/2.-translate-y-1/2.z-50                ← ToolsRail (CÔNG CỤ)
│  ├─ [4] div (h0, 3 kids)                                             ← portals / drawers
│  └─ [5] nav.sm:hidden.fixed…                                         ← MobileBottomNav
└─ section (h0) + scripts
```

Container rhythm: every section sits inside `max-w-[1320px] mx-auto px-4 lg:px-6`, and the
section list uses `space-y-6 sm:space-y-12` for vertical gaps.

## Section inventory (visual order, top offsets @800px)

| # | Working name | Selector / class | top | h | Interaction model |
|---|---|---|---|---|---|
| — | **SiteHeader** | `nav.fixed.z-[100]` | 0 | 104 | static (does NOT change on scroll — verified at 0/400/1200) |
| 0 | **HeroBanners** | `div.w-full.space-y-8` | 128 | 485 | static + marquee; desktop/mobile variants |
| 1 | **QuickActionsBar** | `div.w-full.mt-4.mb-6.sm:mt-10.sm:mb-14` | 701 | 105 | hover-driven |
| 2 | **FlashSale** | `div.mb-12.lg:mb-16` | 862 | 624 | time-driven countdown + own `<style>` block |
| 3 | **FeaturedCategories** | `section.w-full.mb-12` | 1534 | 1232 | static grid, hover-driven (uses `headingNow` font) |
| 4 | **AccountValorantRow** | `section.w-full` | 2814 | 873 | horizontal carousel |
| 5 | **TftRow** | `section.w-full` | 3735 | 777 | horizontal carousel |
| 6 | **GameServicesRow** | `section.w-full` | 4559 | 405 | horizontal carousel |
| 7 | **OtherServicesRow** | `section.w-full` | 5013 | 405 | horizontal carousel |
| 8 | **ReviewsSection** | `div.mb-12.lg:mb-16` | 5466 | 421 | carousel / rating summary |
| 9 | **TransactionTicker** | `div.w-full.overflow-hidden.mb-8.relative` | 5935 | 93 | CSS marquee (`ticker-scroll`) |
| 10 | **ValorantUtilitiesHub** | `div.w-full` | 6059 | 315 | static + hover |
| — | **SiteFooter** | `footer.bg-[#050508]` | 6398 | 467 | static + hover |

## Fixed / overlay layers (z-index order)

| Layer | z-index | Notes |
|---|---|---|
| `PageBackdrop` image + dim | `-1` | `position: fixed`, `h-[100vh]`, `pointer-events-none`, sits behind everything |
| `footer` | `10` | `relative z-10` |
| `main` | `20` | `relative z-20` |
| `ToolsRail` (CÔNG CỤ) | `50` | fixed left, vertically centred, collapsible |
| `SiteHeader` | `100` | fixed top, full width |
| `MobileBottomNav` | (own) | `sm:hidden` — mobile only |
| Sonner toasts / drawers | portal | rendered into `body > div` hosts |

## Dependencies / assembly notes

- The **104px spacer** (`div.w-full.shrink-0`) is a sibling that reserves space for the fixed
  header — the header itself is out of flow. Reproduce both.
- `PageBackdrop` is inside `main > div.w-full` but escapes with `position: fixed; z-index: -1`.
  It requires the ancestors to create no stacking context above it — `main` is `z-20`, so the
  backdrop is only visible because sections have transparent backgrounds.
- Sections 4–7 are the same "horizontal product carousel row" pattern with different data
  (headings, card shape differs between product rows and service rows).
- Section 3 is the only place `headingNow` font is used.
