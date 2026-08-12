/**
 * Fills the user table with believable customers, for trying the admin
 * screen's filters and paging against something the size of a real shop.
 *
 * Every account it makes carries an "@seed.local" email. That is the handle
 * for removing them again — matching on the username would mean keeping a list
 * somewhere, and a marker inside the row cannot be lost.
 *
 *   npx tsx --env-file=.env scripts/seed-users.ts          # add 120
 *   npx tsx --env-file=.env scripts/seed-users.ts 40       # add 40
 *   npx tsx --env-file=.env scripts/seed-users.ts --clean  # remove them all
 *
 * Real accounts are never touched: nobody signing up through the site can end
 * up with an @seed.local address, because registration stores what the
 * customer typed and this domain does not resolve.
 */

import { db } from "@/lib/db";

const SEED_DOMAIN = "@seed.local";

const FAMILY = [
  "nguyen", "tran", "le", "pham", "hoang", "phan", "vu", "dang",
  "bui", "do", "ho", "ngo", "duong", "ly",
];
const GIVEN = [
  "anh", "bao", "chi", "dung", "giang", "hai", "hieu", "hoa", "huy", "khoa",
  "lam", "linh", "long", "mai", "minh", "nam", "nga", "ngoc", "nhung", "phuc",
  "quan", "quynh", "son", "tam", "thao", "thu", "tien", "trang", "trung", "tuan",
  "vy", "yen",
];

const TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;
const BLOCK_REASONS = [
  "Chargeback sau khi nhận acc",
  "Nghi ngờ dùng thẻ cào giả",
  "Spam đơn hàng",
  "Yêu cầu của chính chủ",
];

/**
 * A tiny seeded generator.
 *
 * Deterministic on purpose: running this twice gives the same shape of data,
 * so a filter that looked wrong can be looked at again on the same numbers.
 */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function clean() {
  const doomed = await db.user.findMany({
    where: { email: { endsWith: SEED_DOMAIN } },
    select: { id: true },
  });
  const ids = doomed.map((u) => u.id);

  // Anything pointing at them first, or the delete is refused by the foreign
  // keys that exist precisely to stop a customer's history vanishing.
  await db.session.deleteMany({ where: { userId: { in: ids } } });
  await db.announcementRecipient.deleteMany({ where: { userId: { in: ids } } });
  await db.topUp.deleteMany({ where: { userId: { in: ids } } });
  await db.transaction.deleteMany({ where: { userId: { in: ids } } });
  const removed = await db.user.deleteMany({ where: { id: { in: ids } } });

  console.log(`Đã xóa ${removed.count} tài khoản thử.`);
}

async function seed(count: number) {
  const random = makeRandom(20260813);
  const now = Date.now();

  const existing = await db.user.count({ where: { email: { endsWith: SEED_DOMAIN } } });
  let made = 0;
  let skipped = 0;

  for (let i = 0; i < count; i += 1) {
    const family = FAMILY[Math.floor(random() * FAMILY.length)]!;
    const given = GIVEN[Math.floor(random() * GIVEN.length)]!;
    // The suffix keeps names unique without making them look generated.
    const username = `${family}${given}${existing + i + 1}`;

    // Spread over roughly a year so the newest-first ordering has something to
    // order, and the date column is not a wall of the same day.
    const createdAt = new Date(now - Math.floor(random() * 365) * DAY_MS);
    const tier = TIERS[Math.floor(random() * TIERS.length)]!;
    // Most people are not blocked, and almost nobody is an admin — a filter
    // tested against an even split does not tell you much.
    const blocked = random() < 0.08;
    const admin = random() < 0.03;

    try {
      await db.user.create({
        data: {
          username,
          email: `${username}${SEED_DOMAIN}`,
          role: admin ? "ADMIN" : "MEMBER",
          tier,
          balance: BigInt(Math.floor(random() * 40) * 50_000),
          points: Math.floor(random() * 900),
          createdAt,
          blockedAt: blocked ? new Date(createdAt.getTime() + DAY_MS) : null,
          blockedReason: blocked
            ? BLOCK_REASONS[Math.floor(random() * BLOCK_REASONS.length)]!
            : null,
          lastLoginAt: random() < 0.7 ? new Date(now - Math.floor(random() * 30) * DAY_MS) : null,
        },
      });
      made += 1;
    } catch {
      // A username collision with a real account. Skipping is the safe
      // direction — the alternative is touching a row that is not ours.
      skipped += 1;
    }
  }

  const total = await db.user.count();
  console.log(
    `Đã tạo ${made} tài khoản thử${skipped ? ` (bỏ qua ${skipped} do trùng tên)` : ""}.`,
  );
  console.log(`Tổng số người dùng hiện tại: ${total}.`);
  console.log(`Xóa hết: npx tsx --env-file=.env scripts/seed-users.ts --clean`);
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--clean") {
    await clean();
    return;
  }
  const count = Number(arg ?? 120);
  if (!Number.isFinite(count) || count < 1 || count > 2000) {
    console.error("Số lượng phải nằm trong khoảng 1–2000.");
    process.exitCode = 1;
    return;
  }
  await seed(Math.floor(count));
}

void main();
