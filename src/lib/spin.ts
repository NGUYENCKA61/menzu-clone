/**
 * The reward wheel: what it can land on, and how the landing is decided.
 *
 * Kept apart from the route so the odds are a plain function of a random
 * number — testable, and readable by whoever has to answer "is this rigged".
 * The route never picks: it calls `drawPrize` inside the same transaction that
 * takes the points, so a spin cannot be replayed for a better result.
 */

/** Points one spin costs. */
export const SPIN_COST = 100;

/**
 * NOTHING and POINTS and BALANCE settle themselves inside the spin's own
 * transaction. ITEM cannot: no column in the account holds a mousepad, so the
 * spin writes a row the shop works from and tells the winner it is coming.
 */
export type PrizeKind = "NOTHING" | "POINTS" | "BALANCE" | "ITEM";

export interface Prize {
  /** Stable id, stored in the ledger description and sent to the wheel. */
  id: string;
  label: string;
  /**
   * What the wedge is allowed to print.
   *
   * A wedge is `2·r·sin(180°/n)` wide, so with nine slices the band the label
   * sits in is about 17 units across — nine characters at the size it is set.
   * The full label goes on the odds table and in the result card, where there
   * is room for it.
   */
  short: string;
  kind: PrizeKind;
  /** Points for POINTS, đồng for BALANCE, ignored for NOTHING and ITEM. */
  amount: number;
  /**
   * Optional picture, as a path this server serves (e.g. "/prizes/pad.webp").
   * Drawn in the wedge above the label and full-size in the result card; a
   * prize without one simply shows its label, so the wheel never waits on art.
   */
  image?: string;
  /**
   * Relative chance. Not percentages: the draw divides by the running total,
   * so a slice can be added or retuned without every other number having to
   * be corrected to keep a sum of 100.
   */
  weight: number;
}

/**
 * The wheel draws one equal wedge per entry, so this table IS the picture:
 * adding a slice here adds it to the wheel, and nothing has to be kept in
 * step by hand.
 *
 * The weights are deliberately house-favouring and deliberately visible: at
 * 100 points a spin, the expected return is a little under a third of the
 * cost, which is what makes the wheel a bonus on top of shopping rather than
 * a way to farm the shop.
 */
export const PRIZES: readonly Prize[] = [
  { id: "miss-1", label: "Chúc may mắn lần sau", short: "May mắn lần sau", kind: "NOTHING", amount: 0, weight: 30 },
  { id: "points-50", label: "+50 điểm", short: "+50 điểm", kind: "POINTS", amount: 50, weight: 22 },
  { id: "cash-2k", label: "+2.000đ", short: "+2.000đ", kind: "BALANCE", amount: 2_000, weight: 16 },
  { id: "miss-2", label: "Chúc may mắn lần sau", short: "May mắn lần sau", kind: "NOTHING", amount: 0, weight: 14 },
  { id: "points-150", label: "+150 điểm", short: "+150 điểm", kind: "POINTS", amount: 150, weight: 9 },
  { id: "cash-5k", label: "+5.000đ", short: "+5.000đ", kind: "BALANCE", amount: 5_000, weight: 5 },
  { id: "cash-20k", label: "+20.000đ", short: "+20.000đ", kind: "BALANCE", amount: 20_000, weight: 3 },
  {
    id: "item-mousepad",
    label: "Pad chuột THICHTHIHACK",
    short: "Pad chuột",
    kind: "ITEM",
    amount: 0,
    weight: 2,
    image: "/prizes/pad-chuot.webp",
  },
  { id: "cash-100k", label: "+100.000đ", short: "+100.000đ", kind: "BALANCE", amount: 100_000, weight: 1 },
] as const;

const TOTAL_WEIGHT = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);

/**
 * The wheel's own measurements, in the 100-unit box it is drawn in.
 *
 * Here rather than in the component because a label that outgrows its wedge is
 * a fact about this table, and the test that guards it should read the same
 * numbers the drawing uses. Note what drawing the wheel bigger does and does
 * not buy: the box is fixed at 100 units, so a wider wheel scales the type
 * with it and fits no more characters — what fits more characters is a smaller
 * `fontSize`, and a wider wheel is what keeps that size legible.
 */
export const WHEEL = {
  /** Label size in viewBox units. */
  fontSize: 2.8,
  /** About one character's width at that size — Vietnamese, mixed case. */
  charWidth: 1.4,
  /** Where a picture sits, and how big. */
  imageY: 9,
  imageSize: 12,
  /** Label height with a picture above it — the tightest case a label meets. */
  labelYWithImage: 25,
  /** Label height when the wedge carries nothing else. */
  labelY: 14,
} as const;

/** A wedge is a chord of the circle: `2·r·sin(180°/n)` across at height `y`. */
export function wedgeWidthAt(y: number): number {
  return 2 * (50 - y) * Math.sin(Math.PI / PRIZES.length);
}

/**
 * Picks a slice from a number in [0, 1).
 *
 * The random value is a parameter rather than read inside, so a test can name
 * the outcome instead of spinning until it appears, and so the caller decides
 * where the randomness comes from.
 */
export function drawPrize(roll: number): { index: number; prize: Prize } {
  // A roll outside the range would otherwise fall off the end of the walk and
  // silently award the last, rarest slice.
  const clamped = Number.isFinite(roll) ? Math.min(0.999999999, Math.max(0, roll)) : 0;
  let ticket = clamped * TOTAL_WEIGHT;

  for (const [index, prize] of PRIZES.entries()) {
    ticket -= prize.weight;
    if (ticket < 0) return { index, prize };
  }

  // Unreachable while every weight is positive; still answers with a real
  // slice rather than throwing in the middle of a paid spin.
  return { index: PRIZES.length - 1, prize: PRIZES[PRIZES.length - 1]! };
}

/** What the wheel is worth per spin, for the odds note under it. */
export function expectedValueInPoints(): number {
  const total = PRIZES.reduce((sum, prize) => {
    if (prize.kind === "POINTS") return sum + prize.amount * prize.weight;
    // Money is not points and the two are not exchangeable, so it is left out
    // of this figure rather than converted at an invented rate.
    return sum;
  }, 0);
  return total / TOTAL_WEIGHT;
}
