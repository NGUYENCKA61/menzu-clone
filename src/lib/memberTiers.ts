/**
 * "Cấp bậc thành viên" — the five member tiers, what earns them, and what
 * they are worth. Classic is where every account starts; Bronze and
 * Signature still exist as database enum values (Postgres cannot drop one)
 * but nothing writes them and they read as Classic.
 *
 * A tier is earned by what an account has ever paid INTO its wallet —
 * completed top-ups, all time — and is only ever raised: the shop promised
 * nobody drops. The top-up credit path lifts the account the moment a
 * deposit is confirmed; the admin desk can still set a tier by hand (a
 * hand-set tier above the earned one stays, one below is lifted again on
 * the next top-up).
 *
 * The perk is a percentage off software — accounts are one-off goods
 * priced by hand and are left alone — taken before any voucher, so a code
 * prices what the member actually pays. Wholesale (đại lý) is already the
 * deal and does not stack with this.
 */

export const MEMBER_TIERS = [
  "CLASSIC",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
  "ELITE",
] as const;

export type MemberTierValue = (typeof MEMBER_TIERS)[number];

export interface TierRule {
  label: string;
  /** Lifetime completed top-ups, in đ, from which the tier is earned. */
  minTopUp: number;
  /** Off every software line, in percent — fractions allowed (1.5). */
  discountPercent: number;
}

export const TIER_RULES: Record<MemberTierValue, TierRule> = {
  CLASSIC: { label: "Classic", minTopUp: 0, discountPercent: 0 },
  GOLD: { label: "Gold", minTopUp: 1_500_000, discountPercent: 1 },
  PLATINUM: { label: "Platinum", minTopUp: 5_000_000, discountPercent: 3 },
  DIAMOND: { label: "Diamond", minTopUp: 15_000_000, discountPercent: 8 },
  ELITE: { label: "Elite", minTopUp: 30_000_000, discountPercent: 10 },
};

/** Each tier keeps its metal wherever it is printed. */
export const TIER_STYLE: Record<
  MemberTierValue,
  { text: string; bar: string; tile: string }
> = {
  CLASSIC: {
    text: "text-neutral-300",
    bar: "bg-neutral-300",
    tile: "border-neutral-300/30 bg-neutral-300/10 text-neutral-200",
  },
  GOLD: {
    text: "text-amber-300",
    bar: "bg-amber-400",
    tile: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  PLATINUM: {
    text: "text-cyan-300",
    bar: "bg-cyan-400",
    tile: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  },
  DIAMOND: {
    text: "text-violet-300",
    bar: "bg-violet-400",
    tile: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  },
  ELITE: {
    text: "text-rose-300",
    bar: "bg-rose-400",
    tile: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  },
};

/** Anything the database or a payload might hold; unknown — and a retired
 *  value — reads as Classic, the first rung. */
export function readMemberTier(value: unknown): MemberTierValue {
  return (MEMBER_TIERS as readonly string[]).includes(String(value))
    ? (value as MemberTierValue)
    : "CLASSIC";
}

export function tierRank(tier: MemberTierValue): number {
  return MEMBER_TIERS.indexOf(tier);
}

/** The highest tier whose threshold this much topped-up money has reached. */
export function tierForTopUp(toppedUp: number): MemberTierValue {
  let earned: MemberTierValue = "CLASSIC";
  for (const tier of MEMBER_TIERS) {
    if (toppedUp >= TIER_RULES[tier].minTopUp) earned = tier;
  }
  return earned;
}

export function nextTier(tier: MemberTierValue): MemberTierValue | null {
  return MEMBER_TIERS[tierRank(tier) + 1] ?? null;
}

/**
 * Where an account stands between its tier and the next: the threshold it
 * is climbing to, how far it still has to go, and that as a percentage for
 * the bar. A hand-set tier above the deposits reads as 0% along, never
 * negative; the top tier reads as 100% with nothing left to reach.
 */
export function tierProgress(
  toppedUp: number,
  tier: MemberTierValue,
): {
  next: MemberTierValue | null;
  from: number;
  to: number | null;
  remaining: number;
  percent: number;
} {
  const next = nextTier(tier);
  const from = TIER_RULES[tier].minTopUp;
  if (next === null) return { next, from, to: null, remaining: 0, percent: 100 };
  const to = TIER_RULES[next].minTopUp;
  const percent = Math.min(100, Math.max(0, ((toppedUp - from) / (to - from)) * 100));
  return { next, from, to, remaining: Math.max(0, to - toppedUp), percent };
}

/** What the tier takes off a software line. Integer đ, rounded down; the
 *  percent is carried as basis points so 1.5% stays exact in bigint. */
export function tierDiscountFor(lineTotal: bigint, tier: MemberTierValue): bigint {
  const basisPoints = BigInt(Math.round(TIER_RULES[tier].discountPercent * 100));
  return (lineTotal * basisPoints) / 10_000n;
}

/** "1,5" for 1.5 — the decimal comma Vietnamese prints, no trailing zeros. */
export function formatTierPercent(percent: number): string {
  return String(percent).replace(".", ",");
}
