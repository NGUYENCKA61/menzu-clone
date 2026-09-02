import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRIZES,
  labelArc,
  drawPrize,
  maxShortLength,
  MAX_SLICES,
  MIN_SLICES,
  CLAIM_NOTE_MAX,
  readDelivery,
  PRIZE_KINDS,
  readVoucherDays,
  readWheel,
  VOUCHER_DAYS_DEFAULT,
  winFanfare,
  type Prize,
  RECIPIENT_MAX,
  SPIN_COST,
  totalWeight,
  wedgeWidthAt,
  WHEEL,
} from "@/lib/spin";

/** The table the shop spins on until it edits one of its own. */
const PRIZES = DEFAULT_PRIZES;
const TOTAL_WEIGHT = totalWeight(PRIZES);

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

      expect(drawPrize(start, PRIZES).index).toBe(index);
      expect(drawPrize(justInside, PRIZES).index).toBe(index);
    }
  });

  it("never falls off either end", () => {
    expect(drawPrize(0, PRIZES).index).toBe(0);
    expect(drawPrize(0.9999999, PRIZES).index).toBe(PRIZES.length - 1);
    // Math.random() cannot produce these, but a caller mistake should not
    // hand out the rarest prize by accident.
    for (const roll of [-1, 1, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { index } = drawPrize(roll, PRIZES);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PRIZES.length);
    }
  });

  it("hands out the rare slices at roughly their stated odds", () => {
    const counts = new Array(PRIZES.length).fill(0);
    const runs = 200_000;
    for (let i = 0; i < runs; i++) counts[drawPrize(i / runs, PRIZES).index]++;

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
    expect(PRIZES.every((p: { weight: number }) => p.weight > 0)).toBe(true);
    expect(new Set(PRIZES.map((p: { id: string }) => p.id)).size).toBe(PRIZES.length);
    expect(SPIN_COST).toBeGreaterThan(0);

    // Measured from the same constants the wheel draws with, so a retune of
    // either the table or the type cannot silently outgrow a wedge. A label
    // under a picture sits closer to the hub and has the least room, so that
    // is the case each label is held to.
    for (const prize of PRIZES) {
      expect(prize.short.length * WHEEL.charWidth).toBeLessThanOrEqual(
        labelArc(PRIZES.length),
      );
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

/**
 * The table is the shop's to edit now, so these are about what the editor is
 * allowed to save. Every rule here is one the wheel would otherwise break in a
 * way nobody sees until a customer is looking at it: a label wider than its
 * wedge, a slice that can never come up, a "+0đ" prize wearing a winner's
 * label.
 */
describe("readWheel", () => {
  const slice = (over: Record<string, unknown> = {}) => ({
    id: "cash-2k",
    label: "+2.000đ",
    short: "+2.000đ",
    kind: "BALANCE",
    amount: 2000,
    weight: 10,
    ...over,
  });
  /** A legal wheel of `n` slices, each with its own id. */
  const wheel = (n: number, over: Record<string, unknown> = {}) =>
    Array.from({ length: n }, (_, i) => slice({ id: `slice-${i}`, ...over }));

  it("takes a wheel the shop could actually spin", () => {
    const read = readWheel(wheel(6));
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.prizes).toHaveLength(6);
  });

  it("keeps the slice count where a reader can still tell them apart", () => {
    expect(readWheel(wheel(MIN_SLICES - 1)).ok).toBe(false);
    expect(readWheel(wheel(MAX_SLICES + 1)).ok).toBe(false);
    expect(readWheel(wheel(MIN_SLICES)).ok).toBe(true);
    expect(readWheel(wheel(MAX_SLICES)).ok).toBe(true);
  });

  it("refuses a label wider than the wedge it has to sit in", () => {
    const room = maxShortLength(6, false);
    const fits = wheel(6);
    fits[0] = slice({ id: "slice-0", short: "x".repeat(room) });
    expect(readWheel(fits).ok).toBe(true);

    const spills = wheel(6);
    spills[0] = slice({ id: "slice-0", short: "x".repeat(room + 1) });
    expect(readWheel(spills).ok).toBe(false);
  });

  it("leaves less room the more slices there are", () => {
    // Same fact the drawing works from: more wedges, shorter arcs.
    expect(maxShortLength(MAX_SLICES, false)).toBeLessThan(
      maxShortLength(MIN_SLICES, false),
    );
  });

  it("gives every wheel more room than the old straight label had", () => {
    // The reason for curving the words: they used to lie across the wedge at a
    // radius of 36, where the chord was all a label had. The rim is further out
    // and its arc beats that chord at every slice count.
    const OLD_LABEL_RADIUS = 36;
    for (const n of [MIN_SLICES, 8, 9, MAX_SLICES]) {
      expect(labelArc(n)).toBeGreaterThan(wedgeWidthAt(50 - OLD_LABEL_RADIUS, n));
    }
  });

  it("costs a label nothing to carry a picture", () => {
    // The picture sits further in along the spoke now, so the words keep the
    // whole rim either way.
    expect(maxShortLength(8, true)).toBe(maxShortLength(8, false));
  });

  it("refuses two slices with the same id", () => {
    const dupes = [
      slice({ id: "aa" }),
      slice({ id: "bb" }),
      slice({ id: "aa" }),
      slice({ id: "cc" }),
    ];
    const read = readWheel(dupes);
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.error).toMatch(/trùng/);
  });

  it("refuses a weight that would make a slice unwinnable", () => {
    // A zero-weight slice is drawn on the wheel and can never come up, which
    // is the one outcome a player would call rigged.
    expect(readWheel(wheel(5, { weight: 0 })).ok).toBe(false);
    expect(readWheel(wheel(5, { weight: -3 })).ok).toBe(false);
    expect(readWheel(wheel(5, { weight: 2.5 })).ok).toBe(false);
  });

  it("refuses a prize worth nothing that claims to be worth something", () => {
    expect(readWheel(wheel(5, { kind: "BALANCE", amount: 0 })).ok).toBe(false);
    expect(readWheel(wheel(5, { kind: "POINTS", amount: 0 })).ok).toBe(false);
    // NOTHING and ITEM carry no amount and are fine at zero.
    expect(
      readWheel(wheel(5, { kind: "NOTHING", amount: 0, short: "Trượt" })).ok,
    ).toBe(true);
  });

  it("refuses a kind the payout code does not know how to settle", () => {
    expect(readWheel(wheel(5, { kind: "MOTORBIKE" })).ok).toBe(false);
  });

  it("refuses an id that is not an id", () => {
    expect(readWheel(wheel(5, { id: "" })).ok).toBe(false);
    expect(readWheel(wheel(5, { id: "Có Dấu" })).ok).toBe(false);
    expect(readWheel(wheel(5, { id: "a" })).ok).toBe(false);
  });

  it("refuses a body that is not a list of slices", () => {
    expect(readWheel(null).ok).toBe(false);
    expect(readWheel("cash-2k").ok).toBe(false);
    expect(readWheel({ 0: slice() }).ok).toBe(false);
  });

  it("lowercases and trims what it stores", () => {
    const read = readWheel(wheel(5, { id: "  CASH-2K  " }).map((s, i) => ({
      ...s,
      id: i === 0 ? "  CASH-2K  " : `slice-${i}`,
      label: i === 0 ? "  +2.000đ  " : s.label,
    })));
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.prizes[0]!.id).toBe("cash-2k");
      expect(read.prizes[0]!.label).toBe("+2.000đ");
    }
  });

  it("keeps a picture only when there is one", () => {
    const withImage = readWheel(wheel(5, { image: "/prizes/pad.webp", short: "Pad" }));
    expect(withImage.ok).toBe(true);
    if (withImage.ok) expect(withImage.prizes[0]!.image).toBe("/prizes/pad.webp");

    const blank = readWheel(wheel(5, { image: "   " }));
    expect(blank.ok).toBe(true);
    if (blank.ok) expect(blank.prizes[0]!.image).toBeUndefined();
  });
});

/**
 * The parcel form. Written to be forgiving about how a Vietnamese phone number
 * is spelled and strict about an address being an address — the shop finds out
 * a week later either way, and only one of those is recoverable.
 */
describe("readDelivery", () => {
  const good = {
    recipient: "Nguyễn Văn A",
    phone: "0912 345 678",
    address: "123 Nguyễn Trãi, Phường 7, Quận 5, TP.HCM",
    note: "Gọi trước khi giao",
  };

  it("takes a filled-in form", () => {
    const read = readDelivery(good);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.delivery.recipient).toBe("Nguyễn Văn A");
      expect(read.delivery.note).toBe("Gọi trước khi giao");
    }
  });

  it("accepts a phone however it was written", () => {
    for (const phone of ["0912345678", "+84912345678", "091.234.5678", "091 234 5678"]) {
      expect(readDelivery({ ...good, phone }).ok).toBe(true);
    }
  });

  it("refuses a number that is not one", () => {
    for (const phone of ["", "0912", "khong co", "0912345678901234"]) {
      expect(readDelivery({ ...good, phone }).ok).toBe(false);
    }
  });

  it("refuses an address a courier could not find", () => {
    // "Hà Nội" is a city, not a doorstep.
    expect(readDelivery({ ...good, address: "Hà Nội" }).ok).toBe(false);
    expect(readDelivery({ ...good, address: "" }).ok).toBe(false);
  });

  it("refuses a missing name", () => {
    expect(readDelivery({ ...good, recipient: "" }).ok).toBe(false);
    expect(readDelivery({ ...good, recipient: "x".repeat(RECIPIENT_MAX + 1) }).ok).toBe(
      false,
    );
  });

  it("treats an empty note as no note", () => {
    const read = readDelivery({ ...good, note: "   " });
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.delivery.note).toBeNull();
  });

  it("caps a long note instead of refusing the whole form", () => {
    // The address is the part a parcel cannot go without; a chatty note is not
    // worth losing it over.
    const read = readDelivery({ ...good, note: "x".repeat(CLAIM_NOTE_MAX + 50) });
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.delivery.note).toHaveLength(CLAIM_NOTE_MAX);
  });

  it("refuses a body that is not a form", () => {
    expect(readDelivery(null).ok).toBe(false);
    expect(readDelivery("Nguyễn Văn A").ok).toBe(false);
  });
});

/**
 * A discount code as a prize. The number on it is a percentage, not a sum, and
 * the wheel mints one code per win — so the rules worth testing are the two
 * that keep it a prize rather than a permanent price cut.
 */
describe("the voucher prize", () => {
  const wheelWith = (over: Record<string, unknown>) =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `slice-${i}`,
      label: "Giảm 10%",
      short: "Giảm 10%",
      kind: "VOUCHER",
      amount: 10,
      weight: 5,
      ...(i === 0 ? over : {}),
    }));

  it("takes a percentage between 1 and 100", () => {
    expect(readWheel(wheelWith({ amount: 1 })).ok).toBe(true);
    expect(readWheel(wheelWith({ amount: 100 })).ok).toBe(true);
  });

  it("refuses a discount that pays the customer to shop", () => {
    expect(readWheel(wheelWith({ amount: 120 })).ok).toBe(false);
    expect(readWheel(wheelWith({ amount: 0 })).ok).toBe(false);
  });

  it("is a kind the payout code knows", () => {
    // The route switches on this, so a kind the table allows and the route
    // does not would award nothing and say it awarded something.
    expect(PRIZE_KINDS).toContain("VOUCHER");
  });

  it("defaults the window rather than letting a code outlive the shop", () => {
    expect(readVoucherDays(undefined)).toBe(VOUCHER_DAYS_DEFAULT);
    expect(readVoucherDays("khong biet")).toBe(VOUCHER_DAYS_DEFAULT);
    expect(readVoucherDays(0)).toBe(VOUCHER_DAYS_DEFAULT);
    // A year is the ceiling: past that it is a price, not a promotion.
    expect(readVoucherDays(400)).toBe(VOUCHER_DAYS_DEFAULT);
    expect(readVoucherDays(30)).toBe(30);
  });
});

/**
 * How loudly the card celebrates. The rule reads the shop's own weights, so a
 * shop that retunes its wheel retunes the confetti with it and nobody has to
 * remember a second list.
 */
describe("winFanfare", () => {
  const wheel: Prize[] = [
    { id: "miss", label: "Trượt", short: "Trượt", kind: "NOTHING", amount: 0, weight: 60 },
    { id: "common", label: "+50 điểm", short: "+50 điểm", kind: "POINTS", amount: 50, weight: 30 },
    { id: "rare", label: "+100.000đ", short: "+100k", kind: "BALANCE", amount: 100000, weight: 5 },
    { id: "pad", label: "Pad chuột", short: "Pad", kind: "ITEM", amount: 0, weight: 5 },
  ];

  it("says nothing for a losing slice", () => {
    expect(winFanfare(wheel[0]!, wheel)).toBe("none");
  });

  it("keeps the confetti for the slices that are hard to land on", () => {
    // 30/100 is an ordinary outcome; 5/100 is one in twenty.
    expect(winFanfare(wheel[1]!, wheel)).toBe("small");
    expect(winFanfare(wheel[2]!, wheel)).toBe("big");
  });

  it("celebrates a parcel whatever its odds", () => {
    // The shop is posting a real thing. A mousepad handed out often is still a
    // mousepad arriving in the post.
    const common = { ...wheel[3]!, weight: 500 };
    expect(winFanfare(common, [...wheel, common])).toBe("big");
  });

  it("follows the shop's own tuning rather than a list of ids", () => {
    // The same prize, made common, stops being a big win — which is the shop
    // saying so, not a second table to keep in step.
    const tamed = { ...wheel[2]!, weight: 400 };
    expect(winFanfare(tamed, [wheel[0]!, wheel[1]!, tamed, wheel[3]!])).toBe("small");
  });

  it("does not divide by an empty wheel", () => {
    expect(winFanfare(wheel[1]!, [])).toBe("small");
  });
});
