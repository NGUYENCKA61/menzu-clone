/**
 * Re-ranks every account from its lifetime completed top-ups.
 *
 * The credit path lifts an account the moment a top-up is confirmed, but
 * accounts that topped up before tiers were earned this way never got the
 * lift. This walks all of them once. Raise only — the shop promised nobody
 * drops, and a tier set higher by hand stays.
 *
 *   npx tsx --env-file=.env scripts/backfill-member-tiers.ts
 */

import { db } from "../src/lib/db";
import { readMemberTier, tierForTopUp, tierRank } from "../src/lib/memberTiers";

async function main() {
  const sums = await db.topUp.groupBy({
    by: ["userId"],
    where: { status: "COMPLETED" },
    _sum: { amount: true },
  });
  const users = await db.user.findMany({ select: { id: true, username: true, tier: true } });
  const toppedUp = new Map(sums.map((s) => [s.userId, Number(s._sum.amount ?? 0n)]));

  let lifted = 0;
  for (const user of users) {
    const earned = tierForTopUp(toppedUp.get(user.id) ?? 0);
    const current = readMemberTier(user.tier);
    if (tierRank(earned) <= tierRank(current)) continue;
    await db.user.update({ where: { id: user.id }, data: { tier: earned } });
    lifted += 1;
    console.log(`${user.username}: ${current} → ${earned} (đã nạp ${toppedUp.get(user.id) ?? 0})`);
  }
  console.log(`${lifted}/${users.length} tài khoản được nâng hạng.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
