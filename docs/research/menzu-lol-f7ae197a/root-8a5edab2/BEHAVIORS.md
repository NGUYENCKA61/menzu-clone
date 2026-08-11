# menzu.lol — Behavior Bible (`/`)

Extraction caveat: the Chrome extension viewport was locked at **800×940** and would not
resize. All layout numbers below are computed styles at 800px. **Breakpoint behavior was read
from Tailwind responsive variants present in the DOM** (`sm:`, `md:`, `lg:`, `xl:`), which is
authoritative and does not depend on the render width. Tailwind defaults apply:
`sm=640 md=768 lg=1024 xl=1280 2xl=1536`.

## Global

| Property | Value |
|---|---|
| Smooth-scroll library | **none** — no `.lenis`, no Locomotive. `scroll-behavior: auto` |
| Scroll snap | none |
| Body background | `lab(2.75381 0 0)` ≈ `#050508` |
| Body font | `Inter` (variable, weights 100–900) |
| Scrollbar | `html` has `overflow-y-scroll` (gutter always reserved) |
| Selection | `selection:bg-indigo-500/30` |
| Colour mode | dark only, `.dark` on `<html>`; no toggle present |

### Fonts actually rendered

| Family | Where | Weights |
|---|---|---|
| **Inter** | everything (2880 elements) | 100–900 variable |
| **headingNow** | section 3 category-card titles only (12 elements) | 800 (`font-black` renders 900) |
| ui-monospace stack | 46 elements (codes / IDs) | — |

Declared via `@font-face` but **not used anywhere on this page**: `Space Grotesk`, `geistSans`,
`geistMono`, `antonSC`, `sakana`. Do not wire these up unless a later page needs them.

Font files downloaded to `public/sites/menzu-lol-f7ae197a/shared/fonts/`:
- `headingnow-extrabold.ttf` (233 KB) — source `HEADINGNOWTRIAL_47EXTRABOLD`
- `anton-sc.ttf` (154 KB), `sakana.ttf` (23 KB) — captured for completeness, unused on `/`

> ⚠️ `HEADINGNOWTRIAL` is a **trial** commercial typeface. Fine for a local emulation exercise;
> replace before any public deployment.

## Keyframes (verbatim from the live stylesheet)

```css
@keyframes fadeUpIn      { 0%{opacity:0;transform:translateY(40px) scale(.98)} 100%{opacity:1;transform:translateY(0) scale(1)} }
@keyframes smoothSlideUp { 0%{opacity:0;transform:translateY(20px)}            100%{opacity:1;transform:translate(0)} }
@keyframes shimmer-sweep { 0%{transform:translate(-100%)}                      60%,100%{transform:translate(100%)} }
@keyframes heroFloat     { 0%,100%{transform:translateY(0)}                    50%{transform:translateY(-10px)} }
@keyframes bounceSubtle  { 0%,100%{transform:translateY(0)}                    50%{transform:translateY(-4px)} }
@keyframes spin-slow     { 0%{transform:rotate(0deg)}                          100%{transform:rotate(360deg)} }
@keyframes vip-text-glow {
  0%,100% { text-shadow: rgba(252,186,3,.5) 0 0 6px,  rgba(239,68,68,.2) 0 0 14px; }
  50%     { text-shadow: rgba(252,186,3,.9) 0 0 14px, rgba(239,68,68,.5) 0 0 30px; }
}
@keyframes ticker-scroll {
  0%   { transform: translate3d(0,0,0); }
  100% { transform: translate3d(calc(-1 * var(--ticker-width, 50%)), 0, 0); }
}
```

Also present from shadcn/Radix/Sonner (wire only if a component needs them): `slideUpFade`,
`drawerSlideUp`, `backdropFadeIn`, `spin`, `ping`, `pulse`, `bounce`, `enter`, `exit`,
`accordion-down`, `accordion-up`, `caret-blink`, `swipe-out-*`, `sonner-fade-*`, `sonner-spin`.

### Elements animating on load (7 total)

| Element | Animation | Duration | Easing | Iterations |
|---|---|---|---|---|
| `.navbar-spin-ring` (header avatar ring) | `spin-slow` | 4s | linear | infinite |
| `.animate-pulse` price placeholders ×2 | `pulse` | 2s | `cubic-bezier(.4,0,.6,1)` | infinite |
| ticker track | `ticker-scroll` | see section 9 | linear | infinite |

## Scroll behavior — VERIFIED

**The header does NOT change on scroll.** Measured at `scrollY` = 0, 400, 1200 — identical:

```
class: fixed top-0 left-0 right-0 z-[100] transition-all duration-300 flex flex-col bg-[#1a1a1a]
height: 104px   background: rgb(26,26,26)   backdropFilter: none   boxShadow: none
rows:  [ h-[40px] border-b border-white/5 bg-[#1a1a1a] , h-16 max-w-[1320px] px-4 lg:px-6 ]
```

The `transition-all duration-300` class is present but no state ever toggles it on this page.
**Do not build a shrink-on-scroll header.** Build it as a plain fixed bar.

No scroll-reveal (`IntersectionObserver`) entrance animations fire on this page — the
`fadeUpIn` / `smoothSlideUp` keyframes exist in the stylesheet but no element carries them at
rest. Sections are visible immediately.

## Hero (section 0) — VERIFIED

Two mutually exclusive variants rendered in the DOM:

| Variant | Class | Visible at |
|---|---|---|
| Desktop | `hidden md:block w-full` (h=453) | ≥768px |
| Mobile | `md:hidden w-full` (h=0 at 800px) | <768px |

Images do **not** auto-rotate — sampled at t=0, t+3.5s, t+7s, identical image order:
`bannermung9-7-26.png, subbanner3, subbanner4, subbanner2, subbanner1` **repeated twice**.
The duplicate set is the classic marquee doubling trick → the sub-banner strip is a CSS
marquee, not a JS carousel.

## Ticker (section 9) — CSS marquee

Uses `ticker-scroll` with a runtime-set `--ticker-width` custom property and a duplicated
track. `overflow-hidden` on the wrapper. Pure CSS, no JS scroll listener.

## Still to verify per-section

These are extracted at spec-writing time, section by section (see `components/*.spec.md`):
- hover states on cards / nav items / buttons
- FlashSale countdown tick source
- carousel arrow controls on sections 4–7
- ToolsRail collapse interaction
- MobileBottomNav contents
