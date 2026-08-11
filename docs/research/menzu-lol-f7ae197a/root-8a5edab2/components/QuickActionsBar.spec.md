# QuickActionsBar Specification

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/QuickActionsBar.tsx`
- **Screenshot:** `docs/design-references/menzu-lol-f7ae197a/root-8a5edab2/00-hero-viewport-800.jpg`
  (the dark pill bar with 5 icons, below the sub-banners)
- **Interaction model:** **hover-driven** only

## DOM Structure

```
div.w-full.mt-4.mb-6.sm:mt-10.sm:mb-14                                   (760×105 @800px)
└─ div.w-full.relative.z-10
   └─ div.w-full.max-w-3xl.mx-auto.px-0
      └─ div.relative.rounded-[1.25rem].sm:rounded-[2rem].bg-gradient-to-b.from-white/[0.06].to-transparent.p-[1px].shadow-2xl
         └─ div.w-full.bg-[#0d0d12]/95.border.border-white/[0.06].rounded-[1.25rem].sm:rounded-[2rem]
              .px-1.5.py-3.sm:px-8.sm:py-4.flex.items-center.justify-around.relative.overflow-hidden
              .transform-gpu.backdrop-blur-md
            └─ a (×5)
               ├─ div  ← icon box
               │  └─ span → svg
               └─ span ← label
```

The `p-[1px]` gradient wrapper is a **1px gradient border trick** — an outer div with
`bg-gradient-to-b from-white/[0.06] to-transparent` and 1px padding, holding the solid inner
card. Reproduce both layers exactly.

## Computed Styles (exact)

### Outer spacing
`mt-4 mb-6 sm:mt-10 sm:mb-14` → margin-top 16px→40px, margin-bottom 24px→56px at ≥640px

### Width constraint
`max-w-3xl mx-auto px-0` → max-width **768px**, centred

### Gradient border wrapper
`relative rounded-[1.25rem] sm:rounded-[2rem] bg-gradient-to-b from-white/[0.06] to-transparent p-[1px] shadow-2xl`
→ radius **20px**, **32px** at ≥640px

### Inner card (measured 758×103)
`w-full bg-[#0d0d12]/95 border border-white/[0.06] rounded-[1.25rem] sm:rounded-[2rem] px-1.5 py-3 sm:px-8 sm:py-4 flex items-center justify-around relative overflow-hidden transform-gpu backdrop-blur-md`
→ background `#0d0d12` at 95% alpha; padding 6px/12px → 32px/16px at ≥640px;
`justify-around` distributes the 5 items

### Item anchor
`group relative flex flex-col items-center gap-1 sm:gap-1.5 outline-none` (measured 67×69)

### Icon box (measured 48×48 at 800px)
`relative flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/[0.07] text-neutral-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-all duration-300 group-hover:-translate-y-0.5`
→ 36×36 below `sm`, **48×48** at ≥640px; radius 12px → 16px

### Icon sizing span
`[&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-5 sm:[&_svg]:h-5` → svg 16px → **20px** at ≥640px

### Label (measured 67×15)
`text-[7.5px] sm:text-[10px] font-bold tracking-normal sm:tracking-wider uppercase text-neutral-500 whitespace-nowrap group-hover:text-indigo-400 transition-colors duration-300`

## States & Behaviors

### Hover (per item, driven by `group` on the anchor)
| Target | Property | State A | State B | Transition |
|---|---|---|---|---|
| icon box | color | `text-neutral-400` | `text-indigo-400` | `transition-all duration-300` |
| icon box | background | `bg-white/[0.04]` | `bg-indigo-500/10` | same |
| icon box | border | `border-white/[0.07]` | `border-indigo-500/30` | same |
| icon box | transform | `translateY(0)` | `translateY(-2px)` (`-translate-y-0.5`) | same |
| label | color | `text-neutral-500` | `text-indigo-400` | `transition-colors duration-300` |

No scroll or click behavior.

## Per-State Content

5 items, left → right. Labels are stored in title case and rendered uppercase by CSS:

| # | Label (verbatim) | Renders as | Suggested lucide icon |
|---|---|---|---|
| 1 | `Check Skin` | CHECK SKIN | `Crosshair` |
| 2 | `Feedback` | FEEDBACK | `MessageSquareHeart` |
| 3 | `Build Kho Đồ` | BUILD KHO ĐỒ | `PackageSearch` |
| 4 | `Thu Acc` | THU ACC | `Flame` |
| 5 | `Valo Hub` | VALO HUB | `Compass` |

## Assets
None — icons only (lucide-react).

## Responsive Behavior
- **Desktop (≥640px `sm`):** icon boxes 48×48, radius 16px, svg 20px, label 10px with
  `tracking-wider`, card padding `32px / 16px`, card radius 32px, outer margins 40px/56px.
- **Mobile (<640px):** icon boxes 36×36, radius 12px, svg 16px, label 7.5px with
  `tracking-normal`, card padding `6px / 12px`, card radius 20px, outer margins 16px/24px.
  All 5 items stay on one row (`justify-around`, `whitespace-nowrap`) — it does **not** wrap
  or scroll.
- **Breakpoint:** every change happens at **640px** (`sm`). Nothing changes at md/lg/xl.
