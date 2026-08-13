/**
 * Fills the order table so the admin screen's filters and paging can be tried
 * against something the size of a real shop.
 *
 * Orders are only ever attached to accounts seeded by scripts/seed-users.ts —
 * the ones carrying an @seed.local email. A fake order on a real customer
 * would show up in their order count, their lifetime spend and the shop's own
 * revenue figures, and there is no way to tell afterwards which of those
 * numbers were real.
 *
 *   npx tsx --env-file=.env scripts/seed-orders.ts          # add 300
 *   npx tsx --env-file=.env scripts/seed-orders.ts 80       # add 80
 *   npx tsx --env-file=.env scripts/seed-orders.ts --clean  # remove them all
 *
 * Products are referenced but never modified. Marking one SOLD to make the
 * order look real would take it off the shop front.
 */

import { db } from "@/lib/db";

const SEED_DOMAIN = "@seed.local";
const SEED_USER = { user: { email: { endsWith: SEED_DOMAIN } } } as const;

const STATUSES = ["PAID", "PAID", "PAID", "PAID", "PENDING", "CANCELLED", "REFUNDED"] as const;
const METHODS = ["BUY_NOW", "BUY_NOW", "BUY_NOW", "DEPOSIT", "TRADE_IN", "PAY_LATER"] as const;

/** Deterministic, so a filter that looked wrong can be looked at again. */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function makeCode(random: () => number): string {
  let body = "";
  for (let i = 0; i < 6; i += 1) {
    body += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return `DH${body}`;
}

async function clean() {
  const removed = await db.order.deleteMany({ where: SEED_USER });
  console.log(`Đã xóa ${removed.count} đơn hàng thử.`);
}

async function seed(count: number) {
  const [users, products] = await Promise.all([
    db.user.findMany({
      where: { email: { endsWith: SEED_DOMAIN } },
      select: { id: true },
    }),
    db.product.findMany({ select: { id: true, price: true } }),
  ]);

  if (users.length === 0) {
    console.error(
      "Chưa có tài khoản thử nào. Chạy scripts/seed-users.ts trước — đơn hàng " +
        "chỉ được gắn vào tài khoản thử để không làm sai lịch sử của khách thật.",
    );
    process.exitCode = 1;
    return;
  }
  if (products.length === 0) {
    console.error("Chưa có sản phẩm nào để tạo đơn.");
    process.exitCode = 1;
    return;
  }

  const random = makeRandom(20260814);
  const now = Date.now();
  let made = 0;
  let skipped = 0;

  for (let i = 0; i < count; i += 1) {
    const user = users[Math.floor(random() * users.length)]!;
    const product = products[Math.floor(random() * products.length)]!;
    const status = STATUSES[Math.floor(random() * STATUSES.length)]!;
    const method = METHODS[Math.floor(random() * METHODS.length)]!;

    const listPrice = product.price;
    // Whole percentages, as a shop would actually advertise them.
    const discountPct = [0, 10, 15, 20, 25, 30, 45, 60][Math.floor(random() * 8)]!;
    const total = (listPrice * BigInt(100 - discountPct)) / BigInt(100);

    // Spread over three months, so the date filter and the newest-first
    // ordering both have something to work on.
    const createdAt = new Date(now - Math.floor(random() * 90 * DAY_MS));

    try {
      await db.order.create({
        data: {
          code: makeCode(random),
          userId: user.id,
          productId: product.id,
          method,
          status,
          listPrice,
          discountPct,
          voucherCut: BigInt(0),
          total,
          createdAt,
        },
      });
      made += 1;
    } catch {
      // A code collision. Skipping one order out of hundreds is not worth
      // retrying for.
      skipped += 1;
    }
  }

  const total = await db.order.count();
  console.log(`Đã tạo ${made} đơn hàng thử${skipped ? ` (bỏ qua ${skipped} do trùng mã)` : ""}.`);
  console.log(`Tổng số đơn hiện tại: ${total} — ${Math.ceil(total / 20)} trang.`);
  console.log("Xóa hết: npx tsx --env-file=.env scripts/seed-orders.ts --clean");
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--clean") {
    await clean();
    return;
  }
  const count = Number(arg ?? 300);
  if (!Number.isFinite(count) || count < 1 || count > 5000) {
    console.error("Số lượng phải nằm trong khoảng 1–5000.");
    process.exitCode = 1;
    return;
  }
  await seed(Math.floor(count));
}

void main();
