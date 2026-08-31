import "server-only";

import { db } from "@/lib/db";
import {
  readMemberTier,
  tierForTopUp,
  tierRank,
  type MemberTierValue,
} from "@/lib/memberTiers";

/**
 * The tier side of a top-up: what an account has ever paid into its wallet,
 * and the lift that follows.
 *
 * Completed top-ups only — a pending or refused request is not money in.
 * Admin credits made by hand are not top-ups and do not count.
 */
export async function totalToppedUp(userId: string): Promise<number> {
  const row = await db.topUp.aggregate({
    _sum: { amount: true },
    where: { userId, status: "COMPLETED" },
  });
  return Number(row._sum.amount ?? 0n);
}

/**
 * Raises the account to the tier its top-ups have earned, and only raises:
 * the shop promised nobody drops, and a tier set higher by hand stays.
 * Returns the new tier when one was reached, null otherwise.
 *
 * Called after a top-up is credited, outside that transaction on purpose —
 * a rank bump must never roll a credit back.
 */
export async function liftTierFor(userId: string): Promise<MemberTierValue | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { tier: true } });
  if (!user) return null;
  const earned = tierForTopUp(await totalToppedUp(userId));
  if (tierRank(earned) <= tierRank(readMemberTier(user.tier))) return null;
  await db.user.update({ where: { id: userId }, data: { tier: earned } });
  return earned;
}
