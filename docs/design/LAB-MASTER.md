# LAB-MASTER: the "Launcher" direction

Branch `lab` only (worktree `D:\my-website-lab`, port 3200, database `menzu_clone_lab`).
Round one covers the home page, a tool page, the account overview (`/profile`)
and, added on the owner's word the same day, the purchase history (`/orders`).
Written 16/10/2026 with the `frontend-design` and `ui-ux-pro-max` skills.

## 1. Brief, in one paragraph

**Subject:** THICHTHIHACK rents game-hack tools by the day or month and sells game
accounts. **Audience:** Vietnamese gamers, mostly 16 to 30, on Windows PCs and
mid-range Android phones, who already live inside game launchers (Steam, Riot,
Garena). **Primary job:** find your game, see whether its tool is working and what
it costs, pay from the wallet in a few taps.

## 2. Concept

The shop reads like the launcher the customer already knows. The catalogue is a
**library shelf** of game covers, a tool page is a **store page with a buy panel**,
the account overview is a **player profile** with a rank. Words are plain,
sentence case, Vietnamese first.

**The one memorable element:** the *notched cover*. Every game cover (library
tiles, the month's picks, the hero art, the tool gallery) sits in a frame with
one 14px chamfered corner, like a HUD readout. Nothing else on the page is cut;
panels are plainly rounded, so the notch always means "this is a game".

## 3. Tokens

### Colour (dark only)

| Name | Hex | Role |
|------|-----|------|
| Graphite | `#07090D` | page ground (cool, launcher-like, not neutral black) |
| Gunmetal | `#0D1015` | header, footer, big panels |
| Steel | `#141820` | raised cards, inputs, chips, secondary buttons |
| Line | `#1F242D` | hairlines and borders (strong: `#2C323D`) |
| Frost | `#E8ECF2` | primary text (secondary `#A6AEBB`, tertiary `#727B8B`) |
| Signal red | `#E13D3F` | the brand and the single primary action per screen |

The surfaces were first one step lighter (#0B0E13, #12161D, #1A1F28, lines
#252B36/#343B48); the owner asked for them darker ("hạ độ sáng cho nó thử").

Functional only: online `#3DD68C`, notice `#F2B544`, error stays red. The tier
metals keep their own colours. Tailwind's `neutral-*` scale is re-pointed to a cool
steel scale so the whole site follows without hunting every class.

### Type

- **Display:** Chakra Petch 600/700 (Vietnamese subset). Game names, section
  titles, prices, figures, rank. Its angled terminals echo the notch.
- **Interface and body:** Be Vietnam Pro 400/500/600/700, drawn for Vietnamese
  diacritics. Body 15 to 16px, line-height 1.55 to 1.65, lines under 75 characters.
- **Scale (px):** 12, 13, 14, 16, 20, 24, 32, 44 (hero 52 on desktop).
- **Case:** sentence case for labels, buttons, headings. No tracked all-caps.
  Game and product names that arrive in capitals from the catalogue go through
  `sentenceCase` (src/lib/displayCase.ts), which keeps CS2, ESP, OBV, PUBG and
  the shop's other acronyms; the typed name stays in tooltips and the page title.

### Shape, depth, motion

- Notch: 14px chamfer, top-right corner, covers only.
- Radius: 10px for controls (inputs, chips, buttons), 16px for panels.
- Depth by surface steps (Graphite, Gunmetal, Steel), not shadows. One shadow,
  only under the hero art.
- Motion: hover lifts the cover image brightness and nudges the tile name; no
  entrance animations on sections; everything honours `prefers-reduced-motion`.
- Spacing on a 4px grid: 4, 8, 12, 16, 24, 32, 48, 64. Sections 64px apart on
  desktop, 40px on phones.

## 4. Layout (ASCII)

Container 1280px, 16px gutters on phones, 24px on desktop. Everything left aligned.

```
HOME
+--------------------------------------------------------------------------+
| header: logo | Các loại hack v  Shop acc v  Nạp tiền v  Đổi thưởng | ... |
+--------------------------------------------------------------------------+
| THICHTHIHACK.COM            (Chakra 52)    | +--------------------------\ |
| Bản hack ổn định ...        (16/1.6)       | |  hero art, notched        | |
| [Xem sản phẩm] [Xem hướng dẫn]             | |                           | |
| 21.300 đơn    8.400 khách    4,9/5         | +---------------------------+ |
+--------------------------------------------------------------------------+
| Hot trending tháng này                                                   |
| [#1 cover\ ][#2 cover\ ][#3 cover\ ]  ->  name under, "từ 39.000đ"      |
+--------------------------------------------------------------------------+
| Danh sách hack game   22 tựa              [ Tìm một tựa game ......... ] |
| (Tất cả) (PC) (Mobile) (Spoofer)                                         |
| [cover\ ][cover\ ][cover\ ][cover\ ]   name                              |
|  Hack CS2 - Counter Strike 2           từ 39.000đ, 6 sản phẩm            |
|                    [ Xem thêm (10) ]                                     |
+--------------------------------------------------------------------------+

TOOL PAGE
| breadcrumb                                                               |
| +-------------------------------\  | ● Đang hoạt động                    |
| | gallery 16:9, notched          | | TITLE (Chakra 30/600)               |
| +--------------------------------+ | summary                             |
| [thumbs]                           | Gói: [1 ngày 39.000đ] [30 ngày ...] |
| Chính sách bảo hành   Xem ngay     | 39.000đ (Chakra 40)   Còn hàng      |
|                                    | Số lượng [-][1][+]                  |
|                                    | [ Mua ngay ]   [ Thêm vào giỏ ]     |
|                                    | 4 facts as an icon list             |
| Mô tả sản phẩm (readable column, 72ch)                                   |

ACCOUNT OVERVIEW: same structure as master (approved by the owner), restyled:
cover band, avatar, name in Chakra, rank as a notched badge in the tier's
metal, doors in sentence case, figures in Chakra.

PURCHASE HISTORY: panel head in Chakra; day headings as a display date with a
plain count; each order a Steel card with the cover in a small notched frame,
the name in the display face (one line, full name in the tooltip), tier and
status chips in sentence case, the price as a display figure, "Chi tiết"
without a chevron. The shared search and filter bar follows.
```

## 5. Review against the generic page

The `ui-ux-pro-max` generator, asked for "gaming digital goods store dark",
returned *3D & Hyperrealism* with a neon purple + rose palette and Russo One /
Chakra Petch. Checked against the brief:

- **Purple palette: rejected.** The logo and every brand surface are red; a purple
  primary would fight the mark. Neon-on-black is also the commonest gaming default.
  We keep Signal red and change the *ground* instead (cool Graphite), which is
  where the current site reads generic (`#050508` / `#111` near-black).
- **Russo One: rejected.** It has no Vietnamese subset (checked in
  `data/google-fonts.csv`); diacritics would fall back to another face. Chakra
  Petch (which has one) keeps the display role; Be Vietnam Pro replaces Inter for
  everything else because it is drawn for Vietnamese.
- **3D, WebGL, parallax: rejected.** The style row lists `cost:high` and
  `risk:high` accessibility; the audience is on mid-range PCs and phones.
- **What a generic page would do here:** overlay the name on a darkened cover,
  tracked caps on every label, a red bar before every heading, rounded cards with
  one radius everywhere, a stats strip with four big numbers. **What we do
  instead:** the name sits under the cover in a calm caption with the price, the
  notch marks covers only, headings are plain Chakra sentence case, the shop's
  figures become one quiet line inside the hero.

## 6. Rules carried from the skills (Quick Reference)

`color-contrast` 4.5:1 for text, `focus-states` visible on every control,
`touch-target-size` 44px on phones, `primary-action` one red action per view,
`number-tabular` for prices and figures, `truncation-strategy` ellipsis plus the
full text in a tooltip, `line-length` under 75 characters, `reduced-motion`
respected, `no-emoji-icons` (Lucide only), `heading-hierarchy` one h1 per page.

## 7. Hard rules that survive the lab (the owner's)

Vietnamese copy in sentence case, no em dash in site text, dark site first, real
content from the database, never promise a tool is undetectable, nothing deployed
from this branch, every link, form and state on the three pages keeps working.

No middle-dot meta strings ("A · B · C") in new UI: separate facts with space or a
thin divider, as `frontend-design` lists the dotted string as template chrome.
