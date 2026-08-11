# ToolsRail + MobileBottomNav Specification (fixed overlays)

Two independent fixed overlays that live as siblings of `<main>` in the root layout div.

---

# 1. ToolsRail

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail.tsx`
- **Interaction model:** **click-driven collapse toggle** + hover. Needs `"use client"`.
- Measured: 200×315 at top 313, `z-50`, pinned to the left edge, vertically centred.

## Root (expanded — default state)
`fixed left-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 select-none font-sans transition-all duration-300 transform-gpu bg-[#0c0d12]/95 border-r border-t border-b border-white/[0.08] p-3 rounded-r-2xl backdrop-blur-md w-[200px] translate-x-0`

## States & Behaviors

### Collapse toggle
- **Trigger:** click the header chevron button, or the handle tab on the right edge
- **State A (expanded):** `w-[200px] translate-x-0`
- **State B (collapsed):** `w-[200px] -translate-x-full`
- **Transition:** `transition-all duration-300` (already on the root)
- Only those two classes change. Emit complete literal class strings from a ternary —
  Tailwind cannot see dynamically composed names.

### Hover
| Target | A → B |
|---|---|
| item anchor | `bg-white/[0.02]`/`border-white/[0.04]` → `bg-violet-500/[0.04]`/`border-violet-500/30` |
| item icon box | `border-white/[0.04]`/`text-amber-400` → `border-violet-500/20`, `bg-violet-500/5`, `text-violet-300` |
| item title | `text-neutral-200` → `text-white` |
| item subtitle | `text-neutral-500` → `text-neutral-400` |

## Children (3, in order)

1. **Header** `flex items-center justify-between px-1 pb-2 border-b border-white/[0.05]`
   - label group `flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity`
     → compass icon `text-violet-400` + span `text-[10px] font-black uppercase tracking-[0.15em] text-white` = `CÔNG CỤ`
   - collapse button `p-1 hover:bg-white/5 hover:text-white rounded text-neutral-400 transition-colors`

2. **Items** `flex flex-col gap-2.5 h-[246px]`
   - anchor: `group relative flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-violet-500/[0.04] hover:border-violet-500/30 hover:z-10 transition-colors`
   - icon box: `w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/[0.04] group-hover:border-violet-500/20 group-hover:bg-violet-500/5 text-amber-400 group-hover:text-violet-300 transition-colors shrink-0`
   - text col: `flex flex-col items-start justify-center text-left`
     - title: `text-[10px] font-black uppercase tracking-wider text-neutral-200 group-hover:text-white transition-colors whitespace-nowrap`
     - subtitle: `text-[9px] text-neutral-500 group-hover:text-neutral-400 transition-colors whitespace-nowrap`

   | # | title (verbatim) | subtitle (verbatim) | icon |
   |---|---|---|---|
   | 1 | `Check Skin Valo` | `Kiểm tra kho đồ` | Search |
   | 2 | `Valorant Build` | `Tạo cấu hình súng` | Wrench |
   | 3 | `Tìm Bạn Chơi Game` | `Mọi mức rank` | Users |
   | 4 | `Thư Welcome` | `Check mail đăng ký` | Mail |

3. **Re-open handle** `absolute left-full top-1/2 -translate-y-1/2 w-5 h-16 bg-[#0c0d12]/95 border-r border-t border-b border-white/[0.08] hover:bg-[#161620] rounded-r-lg flex items-center justify-center text-neutral-400 hover:text-white transition-colors`

## Responsive
The live page renders the rail at 800px. Add `hidden sm:flex` to the root so it does not
collide with `MobileBottomNav` below 640px.

---

# 2. MobileBottomNav

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav.tsx`
- **Interaction model:** **static** + hover. Server component.

## Root
`sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#0a0a0d]`
→ **mobile only**, hidden at ≥640px.

## Inner
`grid grid-cols-5 h-16`

Each entry `a`: `flex flex-col items-center justify-center gap-1 text-neutral-500 hover:text-indigo-400 transition-colors`
- icon size 18
- label: `text-[9px] font-bold uppercase tracking-wider whitespace-nowrap`

| # | label (verbatim) | icon | state |
|---|---|---|---|
| 1 | `Trang Chủ` | Home | **active** → `text-indigo-400` |
| 2 | `Check Skin` | Crosshair | default |
| 3 | `Thu Acc` | Flame | default |
| 4 | `Feedback` | MessageSquareHeart | default |
| 5 | `Profile` | User | default |

## Responsive
Visible only below 640px. The footer reserves 112px (`pb-28`) so content clears it.
