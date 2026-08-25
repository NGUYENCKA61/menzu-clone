import { describe, expect, it } from "vitest";

import { drawPrize, PRIZES, SPIN_COST, wedgeWidthAt, WHEEL } from "@/lib/spin";

const TOTAL_WEIGHT = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);

/**
 * The draw decides what the shop pays out, so the tests care about the two
 * things a wheel can get wrong: landing outside its own table, and paying the
 * rare slice more often than the table says it will.
 */
describe("drawPrize", () => {
  it("walks the table in order, boundary by boundary", () => {
    // The first slice owns [0, w0/total); the roll at its far edge belongs to
    // the next one. Off-by-one here would shift every prize by a slice.
    let cumulative = 0;
    for (const [index, prize] of PRIZES.entries()) {
      const start = cumulative / TOTAL_WEIGHT;
      cumulative += prize.weight;
      const justInside = (cumulative - 0.001) / TOTAL_WEIGHT;

      expect(drawPrize(start).index).toBe(index);
      expect(drawPrize(justInside).index).toBe(index);
    }
  });

  it("never falls off either end", () => {
    expect(drawPrize(0).index).toBe(0);
    expect(drawPrize(0.9999999).index).toBe(PRIZES.length - 1);
    // Math.random() cannot produce these, but a caller mistake should not
    // hand out the rarest prize by accident.
    for (const roll of [-1, 1, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { index } = drawPrize(roll);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PRIZES.length);
    }
  });

  it("hands out the rare slices at roughly their stated odds", () => {
    const counts = new Array(PRIZES.length).fill(0);
    const runs = 200_000;
    for (let i = 0; i < runs; i++) counts[drawPrize(i / runs).index]++;

    for (const [index, prize] of PRIZES.entries()) {
      const share = counts[index] / runs;
      const stated = prize.weight / TOTAL_WEIGHT;
      expect(Math.abs(share - stated)).toBeLessThan(0.005);
    }
  });

  it("keeps the wheel drawable and its labels inside their wedges", () => {
    // The wheel divides 360° by however many prizes there are, so the count
    // only has to stay in the range a reader can still tell apart.
    expect(PRIZES.length).toBeGreaterThanOrEqual(4);
    expect(PRIZES.length).toBeLessThanOrEqual(12);
    expect(PRIZES.every((p) => p.weight > 0)).toBe(true);
    expect(new Set(PRIZES.map((p) => p.id)).size).toBe(PRIZES.length);
    expect(SPIN_COST).toBeGreaterThan(0);

    // Measured from the same constants the wheel draws with, so a retune of
    // either the table or the type cannot silently outgrow a wedge. A label
    // under a picture sits closer to the hub and has the least room, so that
    // is the case each label is held to.
    for (const prize of PRIZES) {
      const room = wedgeWidthAt(
        prize.image ? WHEEL.labelYWithImage : WHEEL.labelY,
      );
      expect(prize.short.length * WHEEL.charWidth).toBeLessThanOrEqual(room);
    }
  });

  it("never promises to pay out a prize the account cannot hold", () => {
    // An ITEM is posted by hand. If one carried an amount, a future change to
    // the payout branch could credit a mousepad as money.
    for (const prize of PRIZES) {
      if (prize.kind === "ITEM" || prize.kind === "NOTHING") {
        expect(prize.amount).toBe(0);
      } else {
        expect(prize.amount).toBeGreaterThan(0);
      }
    }
  });

  it("stays a bonus rather than a way to farm the shop", () => {
    // Points paid back per spin, against the points a spin costs. If a retune
    // ever pushes this over 1, the wheel prints points.
    const pointsBack =
      PRIZES.reduce(
        (sum, p) => (p.kind === "POINTS" ? sum + p.amount * p.weight : sum),
        0,
      ) / TOTAL_WEIGHT;
    expect(pointsBack).toBeLessThan(SPIN_COST);
  });
});
