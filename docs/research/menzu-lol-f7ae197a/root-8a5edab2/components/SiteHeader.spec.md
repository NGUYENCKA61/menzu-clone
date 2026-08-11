# SiteHeader Specification

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader.tsx`
- **Screenshot:** `docs/design-references/menzu-lol-f7ae197a/root-8a5edab2/00-hero-viewport-800.jpg`
- **Interaction model:** **static** (does NOT react to scroll) + **hover-driven dropdowns**

> VERIFIED: computed styles are byte-identical at `scrollY` 0 / 400 / 1200. The
> `transition-all duration-300` class is inert on this page. Do **not** implement a
> shrink/blur/shadow-on-scroll header.

## DOM Structure

```
nav.fixed.top-0.left-0.right-0.z-[100].transition-all.duration-300.flex.flex-col.bg-[#1a1a1a]   (h=104)
├─ TOP BAR  div.flex.w-full.h-[40px].border-b.border-white/5.bg-[#1a1a1a]
│  └─ div.max-w-[1320px].w-full.mx-auto.px-4.lg:px-6.h-full.flex.items-center.justify-between
│     ├─ div.lg:hidden.flex.items-center.h-full.relative        ← mobile-only slot (<1024px)
│     ├─ div.hidden.lg:flex.items-center.gap-5.h-full           ← 5 quick links
│     └─ div.flex.items-center.text-[9px].tracking-wider.select-none.h-full.text-neutral-500
│                                                                ← 2 domain links + "⇄" divider
└─ MAIN ROW div.max-w-[1320px].w-full.mx-auto.px-4.lg:px-6.h-16.flex.items-center.justify-between
   ├─ div.flex.items-center.gap-8.h-full
   │  ├─ div.flex.items-center.w-auto        ← hamburger (<lg) + logo lockup
   │  └─ div.hidden.lg:flex.items-center.gap-5.h-full   ← 2 dropdown buttons + 1 link
   └─ div.flex.items-center.gap-4            ← login button
```

## Computed Styles (exact)

### `nav` root
- position: `fixed`; top/left/right: 0; zIndex: `100`
- display: `flex`; flexDirection: `column`
- backgroundColor: `rgb(26, 26, 26)` (`#1a1a1a`)
- height: `104px`; backdropFilter: `none`; boxShadow: `none`
- transition: `all 0.3s` (present but never triggered)

### Top bar
- height: `40px`; background `#1a1a1a`; borderBottom: `1px solid rgb(255 255 255 / 0.05)`
- inner container: `max-width: 1320px; margin-inline: auto; padding-inline: 16px` (`lg:` → `24px`)

**Quick links** (`hidden lg:flex gap-5`) — 5 anchors, each:
`text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors`

**Domain switcher** (right): wrapper `text-[9px] tracking-wider select-none text-neutral-500`;
each anchor `hover:text-white/95 transition-colors duration-200 lowercase`

### Main row
- height: `64px` (`h-16`); container identical max-width/padding to top bar
- left group gap: `32px` (`gap-8`); right group gap: `16px` (`gap-4`)

**Hamburger** (`lg:hidden`, 28×28): `p-1.5 text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-white/5`

**Logo lockup** — `a.flex.items-center.gap-3.group`
- `img` 28×28: `w-7 h-7 object-contain transition-transform duration-500 group-hover:scale-110`
  - src `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/logos/menzu-logo.png` (intrinsic 1769×1906)
- `span` "MENZU": `text-xl font-black italic tracking-tighter text-white`
- `span` "Valorant": `text-[9px] font-bold tracking-[0.2em] text-red-500 uppercase`
- decorative ring (inside logo group): `navbar-spin-ring absolute inset-[-2px] rounded-full border border-transparent border-t-red-500 transition-transform duration-1000 group-hover:scale-110 animate-spin-slow`
  → `@keyframes spin-slow` 4s linear infinite (already in `globals.css` as `.animate-spin-slow`)

**Nav buttons** (`hidden lg:flex gap-5`), each:
`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest transition-all text-neutral-*`

**Login button** — `a`, rendered 137×36:
`flex items-center gap-2 h-9 px-3.5 sm:px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors duration-200 border border-purple-500/30 shrink-0`
- child `svg` 16×16 (user icon)
- child `span`: `text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white whitespace-nowrap`

## States & Behaviors

### Dropdown menus (hover-driven)
- **Trigger:** hover on the parent nav `<button>` (CSS `group` / `group-hover`)
- **Panel:** `absolute top-full left-0 pt-1 transition-all duration-300 z-[110] w-56`
- **State A (closed):** `opacity-0`, translated down slightly, `pointer-events-none`
- **State B (open):** `opacity-100`, `translate-y-0`, `pointer-events-auto`
- **Transition:** `transition-all duration-300`
- **Menu item:** `flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group/item`
  - label span: `text-[10px] font-bold text-neutral-300 group-hover/item:text-white uppercase tracking-wider`

### Hover states
- quick links / nav buttons: `text-neutral-400` → `text-white`, `transition-colors`
- login button: `bg-[#7C3AED]` → `bg-[#6D28D9]`, `transition-colors duration-200`
- logo image: `scale(1)` → `scale(1.1)`, `transition-transform duration-500`
- hamburger: adds `bg-white/5`

### Scroll
N/A — verified unchanged at every scroll position.

## Per-State Content

### Top-bar quick links (verbatim, in order)
`TIN TỨC` · `LIÊN HỆ` · `WIKI & HƯỚNG DẪN` · `GÓP Ý` · `CỘNG ĐỒNG`

### Domain switcher (verbatim)
`menzu.lol` ⇄ `menzuvalorant.com`

### Main nav
1. **`VALORANT HUB`** (dropdown) → `Crosshair Library`, `Lineups & Callouts`,
   `Tìm Bạn Leo Rank`, `Check Skin Valorant`, `Valorant Build`, `Check Thư Welcome`,
   `Trình Tạo Mã 2FA`
2. **`GIAO DỊCH`** (dropdown) → `Thu Cũ Đổi Mới`, `Mua Account`
3. **`NHẬN ACC FREE`** (plain link) — `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest`

### Logo / login
- Logo: `MENZU` + `Valorant`
- Login button label: `Đăng nhập` (renders uppercase via `uppercase`)

## Assets
- `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/logos/menzu-logo.png`
- Icons needed (inline SVG, 16px, `stroke-width:2`, lucide-style): user, menu (hamburger),
  chevron-down, plus one small icon per dropdown item and per nav button.
  Use `lucide-react` equivalents.

## Responsive Behavior
- **Desktop (≥1024px, `lg`):** top-bar quick links visible; main nav links visible;
  hamburger hidden; container padding `24px`.
- **Tablet/Mobile (<1024px):** `hidden lg:flex` groups disappear → both the 5 top-bar quick
  links and the 3 main nav items are hidden; `lg:hidden` mobile slot in the top bar appears;
  hamburger button appears left of the logo; container padding `16px`.
- **<640px (`sm`):** login button padding `px-3.5` (vs `px-4`), label `text-[10px]` (vs `11px`).
- **Breakpoint:** the single structural switch is at **1024px** (`lg`).
- Height stays `104px` at every width.
