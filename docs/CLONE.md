# menzu.lol clone — setup and state

A working clone of [menzu.lol](https://menzu.lol) (Vietnamese Valorant account
shop): Next.js 16 App Router + Postgres via Prisma 7.

The UI was reverse-engineered from the live site; every CSS value in the
components came from `getComputedStyle()` rather than estimation. The backend
was then designed from what the UI actually does, which is why several schema
decisions look unusual — see [Schema notes](#schema-notes).

## Setup

Requires Postgres running locally.

```bash
createdb -U postgres menzu_clone          # or create it in pgAdmin

cp .env.example .env                      # then fill in your password
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/menzu_clone?schema=public"

npm install
npx prisma migrate dev                    # creates the tables
npx tsx prisma/seed.ts                    # loads the captured data
npm run dev
```

`npm run check` runs lint, typecheck, tests and build together.

### Making an admin

There is no self-service path — admin is granted server-side only:

```bash
npx tsx prisma/make-admin.ts <username>
```

Then visit `/admin`. Nothing in the storefront links there, and non-admins get
a 404 rather than a 403, so the area is not discoverable.

### Maintenance scripts

| Script | Purpose |
|---|---|
| `prisma/seed.ts` | Load the captured catalogue, services and reviews |
| `prisma/make-admin.ts <user>` | Grant admin |
| `prisma/reset-demo.ts <user>` | Delete a test user, their orders and ledger; return bought products to AVAILABLE |
| `prisma/reset-product.ts <CODE>` | Delete a product so the seed can recreate it |
| `prisma/reset-voucher.ts <CODE>` | Delete a voucher (refuses if any order references it) |

## Routes

| Group | Routes |
|---|---|
| Storefront | `/` `/categories` `/category/[slug]` `/account/[code]` `/services` `/services/[slug]` |
| Auth | `/login` `/register` |
| Account | `/profile` `/wallet` `/transactions` `/orders` `/service-orders` `/security` |
| Admin | `/admin` `/admin/products` `/admin/orders` `/admin/vouchers` |
| Content | `/feedback` + 7 placeholders (see below) |

The six account routes are **separate routes, not tabs** — the live sidebar
looks like a tab bar but each entry navigates. Modelling them as tabs would
have produced the wrong route tree.

## What works end to end

Register → log in → top up wallet → buy an account → see it in purchase
history and the ledger. Verified over HTTP including the failure paths:
insufficient balance 402, below-minimum top-up 400, double purchase 409,
wrong password 401, expired voucher 400.

Payment is **wallet-based**. The live checkout has no card step: it shows
"Số dư ví hiện tại" and "Cần nạp thêm", so a purchase is a debit against
`users.balance` and topping up is a separate flow.

The purchase runs as one transaction with `SELECT … FOR UPDATE` on the product
row. Without that lock two concurrent buyers can both read AVAILABLE and both
be charged for the same account.

## Schema notes

Three decisions that would be wrong if taken from the UI at a glance:

- **`product_skins` has a `SkinKind` enum**, not a single `skins` count. The
  card headline "42 Skins" counts weapon skins *only*; buddies, agents, cards
  and sprays are four separate totals on the detail page.
- **`transactions` stores `balanceAfter`** alongside the signed delta, because
  `/transactions` renders "Biến động & Số dư" in one column. Storing only the
  delta would mean replaying the whole ledger to render a page.
- **`orders` stores `listPrice`, `discountPct`, `voucherCut` and `total`**
  separately. The checkout dialog itemises all four, and recomputing a
  historical total from today's product price would drift.

Money is `BigInt` throughout — VND is whole units, never a float.

## Deliberately not built

These are gaps on purpose, not oversights:

- **7 content pages** (`/news` `/docs` `/bio` `/trade` `/2fa` `/checkwc`
  `/app/download`) render the real site chrome over an explicit "đang được xây
  dựng" block. Their live markup was never captured, and inventing articles or
  a fake 2FA tool would be indistinguishable from a finished clone.
- **Cọc/Góp, Thu cũ đổi mới, Tiêu trước trả sau** show a notice pointing at
  Zalo instead of acting. Their real terms were never captured and guessing at
  deposit amounts or instalment rules means inventing financial terms.
- **`/build`, `/checkskin`, `/hub/*`** were excluded at the owner's request.
  Links whose labels point at them keep `href="#"` rather than 404ing.
- **The homepage ticker** falls back to captured sample rows until real paid
  orders exist. Seeding fake purchases would put invented rows in the ledger
  and corrupt real balances.
- **Per-skin icons** are not in the live listing markup at all; inventory tiles
  are placeholders until an API supplies them.
- **`users.points` and `MemberTier`** are stored and displayed but nothing
  awards or promotes — the live earning rules were never captured.

## Known limitations

- Source images are 1.5–3.9 MB PNGs. Served sizes are fine (~93 KB per card
  thanks to `sizes`), but the *first* request for each has to decode and
  re-encode the original, so a cold page load leaves frames empty for a moment.
  Re-encoding the sources would fix it; that was declined in favour of keeping
  the originals byte-for-byte.
- `HEADINGNOWTRIAL_47EXTRABOLD.ttf` is a **trial** commercial typeface. Fine
  for local work, replace before any public deployment.
- Assets under `public/sites/` are copied from menzu.lol and include customer
  avatars and product screenshots. Keep the repository private.
- Admin UI is intentionally plain rather than styled like the storefront —
  that area does not exist on menzu.lol, and dressing it in the site's design
  would blur which parts were cloned and which were invented.

## Research artifacts

`docs/research/menzu-lol-f7ae197a/` holds the extraction record: `SITE_MAP.md`
(routes, data model, auth-gated flows), `root-8a5edab2/BEHAVIORS.md` (verified
scroll/hover/timing behaviour, keyframes copied verbatim) and 12 component
specs. Each spec says which values were measured and which were inferred.
