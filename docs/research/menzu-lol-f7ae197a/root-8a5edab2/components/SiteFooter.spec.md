# SiteFooter Specification

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter.tsx`
- **Interaction model:** **static** + link hover states.

## Computed Styles (exact)
- root `footer`: `relative z-10 w-full bg-[#050508] border-t border-white/10 mt-auto` (measured 760×467)
- container: `max-w-[1320px] mx-auto px-4 lg:px-6 pt-12 pb-28 sm:py-12 flex flex-col`
  → note the asymmetric mobile padding `pt-12 pb-28`; the extra 112px bottom clears the fixed
  `MobileBottomNav`. Collapses to `py-12` at ≥640px.

## Structure — four stacked rows

### Row 1 — payments + social
`flex flex-col lg:flex-row items-start lg:items-center justify-between pb-8 border-b border-white/5 gap-6`
- payment chip: `bg-white px-2.5 py-1 rounded-[4px] h-[26px] flex items-center justify-center select-none shadow-sm`
  **VERIFIED:** only chip 1 uses `flex`; chips 2–6 use `hidden sm:flex` — a single chip shows on mobile.
- chips in order: `acb.png`, `momo.png`, `zalopay.png`, `vnpay.png`, `paypal.png`, `crypto.png`
  (base `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/images/`)
- social label: `THEO DÕI & KẾT NỐI`

### Row 2 — four link columns
`grid grid-cols-2 lg:grid-cols-4 gap-8 py-10 border-b border-white/5`
- column heading: `text-[11px] font-black uppercase tracking-widest text-white mb-4`
- link: `text-[12px] text-neutral-400 hover:text-white transition-colors`

| Column | Items (verbatim, in order) |
|---|---|
| `Về chúng tôi` | `Tin tức & Sự kiện`, `Liên hệ`, `Góp ý & Khiếu nại`, `Cộng đồng` |
| `Mua sắm` | `Thu cũ đổi mới`, `Acc Valorant` |
| `Công cụ` | `Check Skin Valorant`, `Valorant Build`, `Check Thư Welcome`, `Trình Tạo Mã 2FA` |
| `Valorant Hub` | `Crosshair Library`, `Lineups & Callouts`, `Tìm Bạn Leo Rank`, `Nhận Acc Free` |

### Row 3 — app promo
`flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-b border-white/5`
- logo `menzu-logo.png` 36×36
- line 1: `SĂN VOUCHER GIẢM TỚI 90%` — `text-[13px] font-black uppercase tracking-wide text-white`
- line 2: `Hãy tải ứng dụng ngay bây giờ!` — `text-[11px] text-neutral-400`
- CTA reuses the header's button style: `bg-[#7C3AED] hover:bg-[#6D28D9] … border border-purple-500/30`

### Row 4 — copyright
`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 pt-8 text-center`
Sequence (verbatim): `© 2026 MENZU VALORANT` · `•` · `ALL RIGHTS RESERVED` · `•` ·
`DESIGNED & DEVELOPED BY` · `MENZU`
The two `•` bullets are wrapped in `hidden sm:inline` so they vanish when the bar stacks.

## States & Behaviors
| Target | Property | A → B | Transition |
|---|---|---|---|
| footer link | colour | `neutral-400` → `white` | `transition-colors` |
| social icon button | bg / border / colour | `white/[0.03]`,`white/[0.06]`,`neutral-400` → `white/[0.08]`,`white/[0.12]`,`white` | `transition-colors` |
| CTA button | background | `#7C3AED` → `#6D28D9` | `transition-colors duration-200` |

## Assets
6 payment logos + `menzu-logo.png` (the live footer renders the logo 3×; only the promo row
instance is visually significant).

## Responsive Behavior
- **≥1024px (`lg`):** row 1 horizontal; link columns 4-across; container padding 24px
- **640–1023px:** row 1 stacked; link columns 2-across; container `py-12`
- **<640px:** payment chips 2–6 hidden; copyright stacks with bullets hidden; container `pt-12 pb-28`
