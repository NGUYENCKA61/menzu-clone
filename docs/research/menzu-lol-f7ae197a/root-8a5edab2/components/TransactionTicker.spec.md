# TransactionTicker Specification (section 9)

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/TransactionTicker.tsx`
- **Interaction model:** **pure-CSS infinite marquee**. No JS, no state, no timers.

## Mechanism (VERIFIED)
The live track (`.ticker-animate`) has **40 children = 20 items rendered twice**. That doubling
is what makes the default `--ticker-width: 50%` land exactly on a seamless loop. Reproduce the
duplication; do not override the variable.

## Section CSS (verbatim from the live `<style>` block)

```css
@keyframes ticker-scroll {
  0%   { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(calc(-1 * var(--ticker-width, 50%)), 0, 0); }
}
.ticker-animate {
  animation: ticker-scroll var(--ticker-duration, 30s) linear infinite;
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  perspective: 1000px;
  -webkit-perspective: 1000px;
  contain: layout paint;
}
.ticker-item {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translate3d(0, 0, 0);
}
```

## DOM Structure

```
div.w-full.overflow-hidden.mb-8.relative                       (760×93)
├─ div.flex.items-center.gap-2.mb-3.px-1
│  ├─ span.relative.flex.h-2.w-2
│  │  ├─ span.animate-ping.absolute.inline-flex.h-full.w-full.rounded-full.bg-emerald-400.opacity-75
│  │  └─ span.relative.inline-flex.rounded-full.h-2.w-2.bg-emerald-500
│  └─ span.text-[10px].font-bold.uppercase.tracking-[0.2em].text-neutral-500  → "Giao dịch gần đây"
└─ div.relative.overflow-hidden.py-1
   └─ div.ticker-animate.flex.gap-3
      └─ div.ticker-item ×40 (20 unique, ×2)
```

## Computed Styles (exact)

### Ticker item
`ticker-item flex items-center gap-3 bg-[#0d1117] border border-neutral-800 rounded-xl px-3.5 py-2.5 shrink-0 hover:border-neutral-700 hover:bg-[#151515] transition-colors cursor-default`
- avatar box: `w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/10` → img `w-full h-full object-cover`
- text col: `flex flex-col gap-1 min-w-0`
  - row 1 `flex items-center justify-between gap-4`
    - user: `text-[11px] font-bold text-white truncate max-w-[80px] leading-normal`
    - amount: `text-[11px] font-black text-emerald-400 text-right leading-normal`
  - row 2 `flex items-center justify-between gap-4`
    - code: `text-[10px] font-semibold text-neutral-500 leading-normal`
    - time: `text-[10px] text-neutral-600 leading-normal whitespace-nowrap`

## States & Behaviors
| Target | Property | A → B | Transition |
|---|---|---|---|
| item | border | `neutral-800` → `neutral-700` | `transition-colors` |
| item | background | `#0d1117` → `#151515` | `transition-colors` |
| status dot | — | `animate-ping` halo, infinite | Tailwind `ping` |
| track | transform | `0` → `-50%` | `ticker-scroll 30s linear infinite` |

## Content — 20 entries (verbatim, in order)

Avatars: `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/valorant-api/agents/<agentId>.png`

| # | agentId | user | amount | code | time |
|---|---|---|---|---|---|
| 1 | `e370fa57-4757-3604-3648-499e1f642d3f` | user 4*** | 1.590.000đ | #vlr0089 | 24 phút trước |
| 2 | `dade69b4-4f5a-8528-247b-219e5a1facd6` | user 1*** | 230.000đ | #vlr1749 | 1 giờ 15 phút trước |
| 3 | `5f8d3a7f-467b-97f3-062c-13acf203c006` | Ke*** | 380.000đ | #vlr1272 | 2 giờ 38 phút trước |
| 4 | `cc8b64c8-4b25-4ff9-6e7f-37b4da43d235` | user 1*** | 3.740.000đ | #vlr0795 | 2 giờ 52 phút trước |
| 5 | `b444168c-4e35-8076-db47-ef9bf368f384` | user 1*** | 1.870.000đ | #vlr0318 | 4 giờ 26 phút trước |
| 6 | `f94c3b30-42be-e959-889c-5aa313dba261` | user 1*** | 20.000đ | #vlr1978 | 6 giờ 5 phút trước |
| 7 | `22697a3d-45bf-8dd7-4fec-84a9e28c69d7` | user 1*** | 300.000đ | #vlr1501 | 10 giờ 30 phút trước |
| 8 | `601dbbe7-43ce-be57-2a40-4abd24953621` | user 1*** | 5.850.000đ | #vlr1024 | 12 giờ 18 phút trước |
| 9 | `6f2a04ca-43e0-be17-7f36-b3908627744d` | ho*** | 8.000đ | #vlr0547 | 13 giờ 45 phút trước |
| 10 | `117ed9e3-49f3-6512-3ccf-0cada7e3823b` | user 1*** | 2.760.000đ | #vlr0070 | 13 giờ 56 phút trước |
| 11 | `320b2a48-4d9b-a075-30f1-1f93a9b638fa` | user 1*** | 1.040.000đ | #vlr1730 | 15 giờ 17 phút trước |
| 12 | `7c8a4701-4de6-9355-b254-e09bc2a34b72` | le*** | 4.200.000đ | #vlr1253 | 16 giờ 31 phút trước |
| 13 | `1e58de9c-4950-5125-93e9-a0aee9f98746` | user 8*** | 20.000đ | #vlr0776 | 16 giờ 55 phút trước |
| 14 | `95b78ed7-4637-86d9-7e41-71ba8c293152` | user 4*** | 1.725.000đ | #vlr0299 | 17 giờ 8 phút trước |
| 15 | `efba5359-4016-a1e5-7626-b1ae76895940` | user 1*** | 2.775.000đ | #vlr1959 | 18 giờ 24 phút trước |
| 16 | `707eab51-4836-f488-046a-cda6bf494859` | user 1*** | 8.800.000đ | #vlr1482 | 19 giờ 6 phút trước |
| 17 | `eb93336a-449b-9c1b-0a54-a891f7921d69` | user 1*** | 20.000đ | #vlr1005 | 20 giờ 20 phút trước |
| 18 | `92eeef5d-43b5-1d4a-8d03-b3927a09034b` | user 1*** | 3.710.000đ | #vlr0528 | 21 giờ 5 phút trước |
| 19 | `41fb69c1-4189-7b37-f117-bcaf1e96f1bf` | user 1*** | 1.250.000đ | #vlr0051 | 22 giờ 33 phút trước |
| 20 | `9f0d8ba9-4140-b941-57d3-a7ad57c6b417` | user 1*** | 8.000đ | #vlr1711 | 22 giờ 46 phút trước |

Label: `Giao dịch gần đây`

## Responsive Behavior
No breakpoint changes — identical at 1440 / 768 / 390. The track simply overflows and scrolls.
