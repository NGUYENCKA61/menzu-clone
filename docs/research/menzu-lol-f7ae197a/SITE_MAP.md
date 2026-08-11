# menzu.lol — Site Map & Data Model (authenticated discovery)

Extracted while logged in as `abcxyz123` (test account, balance 0đ, UID 10049).

## Route inventory (56 links found on `/`)

| Group | Routes | Status |
|---|---|---|
| Home | `/` | ✅ cloned |
| Commerce | `/categories`, `/category/[slug]`, `/account/[code]`, `/trade` | ⏳ in progress |
| Services | `/services`, `/services/dvfb`, `/services/riotgames`, `/services/rutvts`, `/services/valorantpoint-ph`, `/services/valorantpoint-vn`, `/services/ytb` | pending |
| Auth/User | `/login`, `/profile` | pending |
| Tools | `/2fa`, `/checkwc` | pending |
| Content | `/news`, `/docs`, `/feedback`, `/bio`, `/app/download` | pending |
| **Excluded** | ~~`/build`~~, ~~`/checkskin`~~, ~~`/hub`, `/hub/crosshair`, `/hub/free-drop`, `/hub/lfg`, `/hub/lineups`~~ | user asked to skip |

Dynamic segments observed:
- `/account/[code]` — 20 codes seen (`VLR2028`, `VLR2030`, `MENZU725`, …)
- `/category/[slug]` — 9 slugs (`account-valorant-tu-chon`, `random-acc-tft`,
  `acc-tft-pet-tim`, `acc-tft-san-tim`, `acc-tft-hang-hieu`,
  `random-valorant-20k-oi-thong-tin`, `random-smuft-ban-rank-oi-thong-tin`,
  `random-valorant-tren-lv-20-oi-thong-tin`, `random-valorant-tren-lv-20-nfa`)

## `/categories`

Container `w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-6 lg:py-10 space-y-8 animate-fade-up`.
Backdrop wrapper here is `fixed inset-0 z-[-1]` (homepage uses `h-[100vh]`).

1. Breadcrumb — two variants:
   - desktop `hidden sm:inline-flex items-center flex-wrap gap-x-3 gap-y-2 px-4 py-2.5 bg-[#111111]/80 border border-white/10 hover:border-white/20 shadow-lg rounded-full text-xs font-black uppercase tracking-widest text-neutral-300 leading-normal backdrop-blur-md transition-all group/nav w-fit mb-6`
   - mobile `flex sm:hidden flex-wrap items-center gap-x-2 gap-y-2.5 text-[10px] font-black uppercase tracking-widest leading-normal transition-all w-fit mb-6`
   - crumb link `hover:text-white transition-colors flex items-center gap-1.5 shrink-0`; current page
     `text-indigo-400 hover:text-indigo-300 transition-colors font-black max-w-[300px] md:max-w-[400px]`
2. Page header `flex items-center justify-between mb-8 pb-3 border-b border-indigo-500/20`
   with `h1.text-2xl sm:text-3xl font-black uppercase tracking-wider text-white` = `DANH SÁCH DANH MỤC`
3. **Empty state (live site is genuinely empty right now)**
   `w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]`
   - `text-xl font-bold text-white mb-2` → `CHƯA CÓ DANH MỤC NÀO`
   - `text-neutral-400` → `Danh sách danh mục đang trống. Vui lòng quay lại sau.`

## `/category/[slug]`

Container `max-w-[1320px] mx-auto px-4 lg:px-6 py-12` — note `py-12`, not the homepage rhythm.
docHeight ≈ 6031 for `account-valorant-tu-chon`.

Three blocks:
1. `mb-10` (h 567) — skin search / "Hot pick" filter panel *(not yet fully extracted)*
2. `flex flex-col gap-10` — the listing
   - grid `grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8`, **12 cards/page**
   - pagination `mt-10 mb-8` → **14 pages** for this category
3. `mt-16 border-t border-white/5 pt-12` — "DANH MỤC KHÁC"

### Product card (the core data model)

Link wraps whole card → `/account/[code]`.
`a.h-full.w-full.group.flex.flex-col.bg-neutral-900.border.border-neutral-800.rounded-3xl.overflow-hidden.hover:border-neutral-600`

- thumb `relative aspect-[4/3] bg-neutral-950 w-full overflow-hidden`
  - img `object-cover transition-transform duration-500 group-hover:scale-105 object-[85%_center]`
- rank badge (top-left) `glass px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap` → e.g. `DIAMOND 1`
- code chip (top-right) `px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-sm bg-neutral-950/95 text-neutral-300 border border-neutral-700` → `#VLR2030`
- body `flex-1 flex flex-col p-5`
- skin count cell `flex items-center gap-1 px-2.5 py-1 bg-neutral-800 text-white font-black text-[11px] border-r border-neutral-700` → `42`
- tier counts — same 5-colour scheme as the homepage flash sale:
  `text-orange-400` 10 · `text-pink-400` 8 · `text-cyan-400` 8 · `text-blue-400` 16
- tag pill `px-2 py-1 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold` → `DROP MAIL`
- skin thumbnail carousel — track `flex gap-2 transition-transform duration-700 ease-in-out`,
  tiles `w-16 h-12 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 p-1 tooltip-trigger`,
  overflow chip `w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700/50` → `+ 11`
  (22 `<img>` total per card)
- price: old `4.800.000 ₫` (`text-[10px] sm:text-xs text-neutral-500 line-through`),
  discount `-38%`, new `2.990.000đ`

```ts
interface ProductCard {
  code: string            // "VLR2030"
  rank: string            // "DIAMOND 1"
  skinCount: number       // 42
  tiers: { color: "yellow"|"orange"|"pink"|"cyan"|"blue"; count: number }[]
  tags: string[]          // ["DROP MAIL"]
  skinThumbs: string[]    // 21 icon urls
  extraSkins: number      // 11  -> "+11" chip
  oldPrice: string
  discountPct: string     // "-38%"
  price: string
}
```

## `/account/[code]` — product detail

Sampled `/account/VLR2030`. docHeight 3246.
`<title>` = `Menzu Valorant | Mã VLR2030 - VLR#2030 | Giá bán: 2.990.000đ`
Container `max-w-[1320px] mx-auto px-4 lg:px-6`.

1. Breadcrumb (both variants) → `Trang chủ / ACCOUNT VALORANT TỰ CHỌN / Mã VLR2030`
2. `w-full max-w-[1320px] mx-auto flex flex-col`
   - `grid grid-cols-1 lg:grid-cols-2 gap-12` — gallery (`space-y-4`) | buy panel (`flex flex-col`)
   - `w-full mt-12 bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-6` — skin
     inventory, tabbed, has its own `@keyframes skin-tab-enter { from { opacity: 0 } … }`
3. `mt-20 border-t border-white/5 pt-12` — `Tài Khoản Tương Tự` (related accounts)

Gallery shows `Phóng to chi tiết` and a live viewer count (`6 người đang xem` /
`8 người đang xem` — it changes between loads, so it is server- or socket-driven).
Also links `Chính Sách Bảo Hành`.

### Buy panel — stat rows (verbatim labels)
| Label | Value seen |
|---|---|
| `Rank` | `Unranked`, sub `LAST: DIAMOND 1 (V26 // ACT III)` |
| `TRACKER.GG` | link `xem profile` |
| `Skins` | `42 Skins` |
| `Level` | `91` |
| `VP` | `301` |
| `RP` | `0` |
| `KC` | `1.833` |
| tag | `DROP MAIL` / `Mail gốc` + `TÌM HIỂU` link |
| price | `-38%`, old `4.800.000₫`, sale `2.990.000 VND` |

### Purchase actions (the checkout entry points)
- `Cọc / Góp` — sub-label `từ 299.000đ` (deposit / instalment)
- `Mua Ngay` (buy now)
- `Thu cũ đổi mới` (trade-in)
- `Tiêu trước trả sau` (buy now, pay later)

The buy panel embeds `@keyframes dialogIn` — the purchase flow opens a modal.
That modal is **click-revealed and therefore not yet captured** (CDP click freeze).

```ts
interface AccountDetail {
  code: string; rank: string; lastRank: string | null; trackerUrl: string | null
  skins: number; level: number; vp: number; rp: number; kc: number
  tags: string[]; mailType: string            // "Mail gốc"
  oldPrice: number; price: number; discountPct: number
  depositFrom: number                          // 299000
  viewersNow: number                           // live
  gallery: string[]; skinInventory: Skin[]
}
```

### Auth gate on purchase — VERIFIED

Clicking `Mua Ngay` while logged **out** does not open a modal. It navigates to:

```
/login?next=%2Faccount%2FVLR2030
```

So the purchase flow is `product → (guest) /login?next=<return path> → back to product`.
The `next` query param must be honoured by the cloned `/login`. The purchase modal
(`@keyframes dialogIn`) only renders for an authenticated session, so it is still uncaptured —
capturing it needs a logged-in session **and** a click.

### Purchase modal — CAPTURED (authenticated)

Overlay `fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 overlay-enter`
Dialog `bg-[#111111] border border-white/10 rounded-[28px] w-full sm:max-w-md max-h-[90vh] overflow-hidden relative shadow-none flex flex-col dialog-enter` (448×604)

Sections: mobile drag handle (`flex justify-center pt-3 pb-1 sm:hidden`) · close button
(`absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white p-2 rounded-full`) ·
header (`flex flex-col items-center pt-4 pb-2 relative px-6`) ·
scroll body (`px-5 py-1.5 overflow-y-auto flex-1 min-h-0 space-y-2.5`).

Content, verbatim:

| Row | Value |
|---|---|
| title `text-lg font-bold text-white mb-2` | `Xác Nhận Mua Tài Khoản` |
| `Mã số` | `#VLR2030` (`text-xs font-bold text-yellow-500`) |
| `≡ Danh Mục:` | `ACCOUNT VALORANT TỰ CHỌN` (`text-violet-400 font-bold uppercase`) |
| `Giá Gốc` | `4.800.000 ₫` |
| `Giảm Giá` | `38%` |
| `Mã Giảm Giá / Voucher` | input `Nhập mã voucher...` + button `Áp dụng` |
| `Tổng tiền` | `2.990.000 ₫` |
| `TỔNG THANH TOÁN` | `2.990.000 ₫` |
| `Quyền Lợi & Bảo Hành` | (section) |
| `Số dư ví hiện tại:` | `0 ₫` |
| `Cần nạp thêm:` | `2.990.000 ₫` |

**This settles the payment model: purchases are paid from a wallet balance, not a
card at checkout.** The flow is `top-up → wallet → purchase`. When the balance is
short the dialog shows `Cần nạp thêm` instead of a confirm button.

Backend consequences:
- `users.balance` is the payment source; every purchase is a debit against it
- `topups` is a separate flow that credits the wallet
- `vouchers` exist and apply at checkout, so `orders` needs a discount/voucher column
- an order must record: product, list price, discount %, voucher, final total

### Skin inventory tabs — VERIFIED

Tab bar `flex items-center gap-3 sm:gap-6 lg:gap-0 lg:justify-between overflow-x-auto hide-scrollbar whitespace-nowrap`,
tab button `flex-shrink-0 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base px-4 sm:px-6 py-2.5 rounded-2xl font-black uppercase …`

Five tabs for `VLR2030` — the counts are per-account data:

| Tab | Count |
|---|---|
| `Weapon Skins` | 42 |
| `Buddies` | 40 |
| `Agents` | 26 |
| `Cards` | 51 |
| `Sprays` | 49 |

Note the card's "42 Skins" headline equals the **Weapon Skins** tab only — the other
four inventory types are not counted in it.

Panel: `flex flex-col min-h-[400px]`, with a `.valorant-scrollbar` webkit scrollbar style.

Section-scoped CSS (verbatim):
```css
@keyframes skin-tab-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes card-appear {
  0%   { opacity: .2; transform: translateY(20px) scale(.95); filter: blur(1px); }
  100% { opacity: 1;  transform: translateY(0) scale(1);      filter: blur(0);   }
}
.skin-tab-enter  { animation: skin-tab-enter 0.38s cubic-bezier(.22,1,.36,1) both; will-change: opacity; }
.card-item-appear{ animation: card-appear    0.5s  cubic-bezier(.22,1,.36,1) both; }
```

```ts
interface AccountInventory {
  weaponSkins: number; buddies: number; agents: number; cards: number; sprays: number
}
```

## Header — authenticated variant

Replaces the `Đăng nhập` button in `nav > [1] > [1]` (`flex items-center gap-4`):

1. Notification bell `a.w-9.h-9.flex.items-center.justify-center.rounded-xl.bg-white/5.border.border-white/10.hover:bg-white/10.transition-colors.text-neutral-400`
   with badge `absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-[#0a0a0d]` → count
2. User menu `div.relative` > `button.flex.items-center.gap-2.sm:gap-2.5.p-1.sm:px-2.sm:py-1.5.rounded-xl.bg-white/10.border.border-white/10.hover:bg-white/15.hover:border-white/20`
   - avatar `h-7 w-7 rounded-[9px] overflow-hidden bg-black/50 shrink-0 relative z-10 border border-white/10` → img `w-full h-full object-cover`
   - text col `hidden sm:flex flex-col justify-center`
     - username `text-[11px] font-bold text-white leading-none truncate mb-[4px]`
     - balance `text-[9px] font-black uppercase tracking-widest leading-none truncate text-emerald-400`
   - dropdown menu is **conditionally rendered on click** — not in the DOM until opened
     (could not capture: clicking freezes the CDP renderer)

## `/profile`

`title` = `Menzu Valorant | Profile`. Container
`w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-8 flex flex-col min-h-screen`.

- breadcrumb `mb-6` → `Trang chủ / Tổng quan tài khoản`
- body `flex flex-col lg:flex-row gap-6 items-start`
  - sidebar `hidden lg:block w-full lg:w-[280px] shrink-0 sticky top-[88px]`
    nav: `Tổng quan`, `Nạp tiền`, `Lịch sử giao dịch`, `Lịch sử mua`, `Đơn dịch vụ`, `Bảo mật`
  - content `flex-1 w-full min-w-0`

Content of the "Tổng quan" tab, verbatim:
`Xem thông tin và hoạt động gần đây` · `Sửa ảnh` · `abcxyz123` · `MEMBER` ·
`UID: 10049` · `Đã tham gia: 11/08/2026` · `Chưa liên kết` ×2 · `Discord` ·
`Thưởng 1.000 Pts` · `Liên kết ngay` · `Số dư khả dụng` `0đ` ·
`Điểm thưởng` `0 Pts` · `Đổi điểm` · `Cấp bậc thành viên` `Bronze`

```ts
interface User {
  username: string        // "abcxyz123"
  uid: number             // 10049
  role: string            // "MEMBER"
  joinedAt: string        // "11/08/2026"
  avatarUrl: string
  balance: number         // 0
  points: number          // 0
  tier: string            // "Bronze"
  linkedAccounts: { provider: string; linked: boolean; bonus?: string }[]
}
```

## Backend surface implied by the UI

| Domain | Needed for |
|---|---|
| `users` + session auth | header variant, `/profile`, purchase flow |
| `categories` | `/categories`, `/category/[slug]`, "DANH MỤC KHÁC" |
| `products` (accounts) | listing, `/account/[code]`, flash sale, homepage rows |
| `product_skins` | skin thumbnail carousel, tier counts, skin count |
| `orders` / `purchases` | `Lịch sử mua` |
| `transactions` | `Lịch sử giao dịch`, balance |
| `service_orders` | `Đơn dịch vụ`, `/services/*` |
| `topups` | `Nạp tiền` |
| `points` / `tiers` | reward points, Bronze/…; `Đổi điểm` |
| `feedback` | `/feedback`, homepage reviews |
| `transactions_feed` | homepage ticker |

## Blockers — RESOLVED

Both environment problems cleared once Chrome was reopened in a normal window:

- ~~`.click()` through CDP freezes the renderer for 45s~~ → **fixed**. Clicks now
  return in ~1ms, so click-revealed UI is capturable again.
- ~~Viewport locked at 800px~~ → **fixed**, now 1912px. The homepage clone was
  finally diffed 1:1 against the live site at desktop width; that is how the
  missing flash-sale dot row was caught.

## Still uncaptured

- **Purchase modal** — needs an authenticated session *and* a click. Blocked only
  because the test account is currently logged out (it was logged out so `/login`
  could be captured at all).
- **Header user dropdown** — same reason.
- **Per-skin icons** in the listing card — not present in the listing markup at all;
  they must come from the API. The clone uses generic tiles rather than invented paths.
