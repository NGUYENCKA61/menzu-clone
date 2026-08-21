/**
 * The referral programme's one number and its one calculation.
 *
 * Pure and import-safe from anywhere: the settle path uses the math, the
 * pages print the percent, and both must mean the same thing.
 */

/** Percent of every referred top-up the referrer earns. */
export const REFERRAL_PERCENT = 3;

/** The referrer's cut of an amount in đồng, floored — BigInt division never
 *  invents dong. */
export function commissionFor(amount: bigint): bigint {
  return (amount * BigInt(REFERRAL_PERCENT)) / 100n;
}
