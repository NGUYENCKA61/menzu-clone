# UtilitiesHub Specification (section 10)

## Overview
- **Target file:** `src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/UtilitiesHub.tsx`
- **Interaction model:** **static** + hover. No JS, no state.
- Measured 760×315 at top 6059.

## DOM Structure

```
div.w-full
└─ div.w-full.relative.z-10.my-3
   ├─ div.hidden.lg:grid.grid-cols-12.gap-3.items-stretch      ← DESKTOP (≥1024px)
   │  ├─ div.lg:col-span-8 …  ← main panel
   │  └─ div.lg:col-span-4 …  ← trade panel
   └─ div.grid.lg:hidden.grid-cols-2.gap-2                     ← MOBILE (<1024px)
```

## Computed Styles (exact)

### Panel shells
- 8-col: `lg:col-span-8 relative overflow-hidden rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-[#0d0d12] py-3.5 px-4 flex flex-col justify-between transition-all duration-300`
- 4-col: same but `lg:col-span-4` and adds `gap-3`

Each panel opens with a background-art layer `div.absolute.inset-0.z-0` holding a filled image
at `object-cover opacity-[0.07]`, then a `relative z-10` content wrapper.

### Main panel content
wrapper `relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch`
- eyebrow: `text-[8.5px] font-black text-indigo-400 uppercase tracking-[0.12em]`
- paragraph: `text-[11.5px] text-neutral-400 leading-normal max-w-[95%]`
- CTA anchor: `group inline-flex items-center justify-center gap-1.5 self-start w-32 h-7 rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white transition-colors duration-200`
- right-column label: `text-[8.5px] font-black uppercase tracking-[0.12em] text-indigo-400`
- link row anchor: `flex items-center gap-2 w-full h-full group/item`
  - title: `block text-[9.5px] font-bold text-neutral-200 group-hover/slider:text-indigo-400 tracking-wide uppercase transition-colors duration-200 truncate`
  - desc: `text-[9.5px] text-neutral-400 group-hover/slider:text-neutral-300 transition-colors duration-200 leading-tight truncate`

> Quirk preserved verbatim: the anchor declares `group/item` but the child spans key off
> `group-hover/slider:`. The wrapping row div must therefore carry `group/slider` for the
> hover to resolve.

## States & Behaviors
| Target | Property | A → B | Transition |
|---|---|---|---|
| panel | border | `white/[0.06]` → `white/[0.12]` | `transition-all duration-300` |
| CTA | gradient | `indigo-500→600` → `indigo-400→500` | `transition-colors duration-200` |
| CTA arrow | transform | `0` → `translateX(2px)` | `transition-transform` |
| link title | colour | `neutral-200` → `indigo-400` | `duration-200` |
| link desc | colour | `neutral-400` → `neutral-300` | `duration-200` |

## Content (verbatim)

### Main panel
- eyebrow `VALORANT UTILITIES HUB`
- paragraph: `Nơi tổng hợp tất cả các công cụ và tài nguyên hữu ích hỗ trợ game thủ tối ưu hóa trải nghiệm chơi game và leo rank Valorant hiệu quả hơn.`
- CTA `Khám Phá Ngay`
- right label `TIỆN ÍCH CHƠI GAME`, then 3 rows:

| # | title | desc | icon |
|---|---|---|---|
| 1 | `CHECK SKIN VALO` | `Kiểm tra chi tiết thông tin và súng của tài khoản` | Crosshair |
| 2 | `NHẬN ACC FREE` | `Phát tài khoản và code game miễn phí hàng ngày` | Gift |
| 3 | `TÂM NGẮM PRO` | `Sao chép mã tâm ngắm chuẩn tuyển thủ chuyên nghiệp` | Target |

### Trade panel
- eyebrow `THU CŨ ĐỔI MỚI`
- paragraph `Định giá nhanh chóng sát thị trường dựa trên skin thực tế.`
- CTA `Trade ngay`

## Assets
- Main panel art: `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/images/valorant-hero.png`
- Trade panel art: `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/external/cmsassets-rgpub-io/0c67438c8b3a418b5ca28f9f234506745493ae42-854x484.png`

Both images appear **twice** in the live DOM — once in the desktop grid, once in the mobile grid.

## Responsive Behavior
- **≥1024px (`lg`):** 12-col desktop grid visible (8 + 4), mobile grid hidden
- **<1024px:** desktop grid hidden, 2-column compact tile grid visible
- Within the desktop main panel the inner grid is `grid-cols-1` below 768px and
  `md:grid-cols-2` at ≥768px (only ever rendered ≥1024px, but the classes are kept verbatim)
