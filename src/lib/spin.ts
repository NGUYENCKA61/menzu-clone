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
 * NOTHING, POINTS, BALANCE and VOUCHER settle themselves inside the spin's own
 * transaction — the last by minting a discount code on the spot. ITEM cannot:
 * no column in the account holds a mousepad, so the spin writes a row the shop
 * works from and tells the winner it is coming.
 */
export type PrizeKind = "NOTHING" | "POINTS" | "BALANCE" | "ITEM" | "VOUCHER";

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
  /** A sentence about it, where there is room for one. "" draws nothing. */
  description?: string;
  kind: PrizeKind;
  /** Points for POINTS, đồng for BALANCE, ignored for NOTHING and ITEM. */
  amount: number;
  /**
   * Optional picture, as a path this server serves (e.g. "/prizes/pad.webp").
   * Drawn in the wedge above the label and full-size in the result card; a
   * prize without one simply shows its label, so the wheel never waits on art.
   */
  image?: string;
  /** What the wedge is painted. Absent means the wheel decides, which is what
   *  it did before the shop could choose. */
  color?: string;
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
export const DEFAULT_PRIZES: readonly Prize[] = [
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

/** The running total a roll is measured against. */
export function totalWeight(prizes: readonly Prize[]): number {
  return prizes.reduce((sum, prize) => sum + prize.weight, 0);
}

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
  /** Where the label's baseline curves, as a radius from the hub. Out at the
   *  rim, where a wedge is widest — the band that was empty. */
  titleR: 44,
  /** Where a picture, or the kind's glyph, sits on the spoke. Further in than
   *  the label, which now has the rim to itself. */
  imageR: 28,
  imageSize: 12,
  /** The glyph a wedge without a picture carries, so a bare wedge is not a
   *  wedge with nothing in it. */
  glyphSize: 8,
} as const;

/** A wedge is a chord of the circle: `2·r·sin(180°/n)` across at height `y`. */
export function wedgeWidthAt(y: number, sliceCount: number): number {
  return 2 * (50 - y) * Math.sin(Math.PI / sliceCount);
}

/**
 * How long a label may be, in viewBox units.
 *
 * The label follows the rim, so what it has is the wedge's own arc — `2πr/n` —
 * and not the chord across it. At the same radius an arc is longer than the
 * chord it subtends, and the rim was the empty part of the wedge besides.
 *
 * A shade is taken off each end so a full-length label does not run into the
 * spoke beside it.
 */
export function labelArc(sliceCount: number): number {
  const arc = (2 * Math.PI * WHEEL.titleR) / Math.max(MIN_SLICES, sliceCount);
  return arc * 0.94;
}

/**
 * Picks a slice from a number in [0, 1).
 *
 * The random value is a parameter rather than read inside, so a test can name
 * the outcome instead of spinning until it appears, and so the caller decides
 * where the randomness comes from.
 */
export function drawPrize(
  roll: number,
  prizes: readonly Prize[],
): { index: number; prize: Prize } {
  // A roll outside the range would otherwise fall off the end of the walk and
  // silently award the last, rarest slice.
  const clamped = Number.isFinite(roll) ? Math.min(0.999999999, Math.max(0, roll)) : 0;
  let ticket = clamped * totalWeight(prizes);

  for (const [index, prize] of prizes.entries()) {
    ticket -= prize.weight;
    if (ticket < 0) return { index, prize };
  }

  // Unreachable while every weight is positive; still answers with a real
  // slice rather than throwing in the middle of a paid spin.
  return { index: prizes.length - 1, prize: prizes[prizes.length - 1]! };
}

/** What the wheel is worth per spin, for the odds note under it. */
export function expectedValueInPoints(prizes: readonly Prize[]): number {
  const total = prizes.reduce((sum, prize) => {
    if (prize.kind === "POINTS") return sum + prize.amount * prize.weight;
    // Money is not points and the two are not exchangeable, so it is left out
    // of this figure rather than converted at an invented rate.
    return sum;
  }, 0);
  return total / totalWeight(prizes);
}

// ---------------------------------------------------------------------------
// Editing the table
// ---------------------------------------------------------------------------

/**
 * How many slices the wheel is allowed to carry.
 *
 * Under four and it is not a wheel; over twelve and the wedges are too narrow
 * for a Vietnamese label at any legible size. The picture and the odds are the
 * same table, so a limit on one is a limit on the other.
 */
/** Long enough to say what the thing is, short enough to read in a card. */
export const DESCRIPTION_MAX = 200;

export const MIN_SLICES = 4;
export const MAX_SLICES = 12;

export const PRIZE_KINDS: readonly PrizeKind[] = [
  "NOTHING",
  "POINTS",
  "BALANCE",
  "VOUCHER",
  "ITEM",
];

/** How long a won code lasts when the prize names no figure of its own. */
export const VOUCHER_DAYS_DEFAULT = 7;

/** Days a won code is good for, or the default. Capped at a year: a discount
 *  nobody can retire is not a promotion, it is a price cut. */
export function readVoucherDays(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 365) return VOUCHER_DAYS_DEFAULT;
  return n;
}

/** What each kind is called on the desk, and what its `amount` means there. */
export const PRIZE_KIND_LABEL: Record<PrizeKind, { label: string; unit: string | null }> = {
  NOTHING: { label: "Trượt", unit: null },
  POINTS: { label: "Điểm", unit: "điểm" },
  BALANCE: { label: "Tiền vào ví", unit: "đ" },
  VOUCHER: { label: "Mã giảm giá", unit: "%" },
  ITEM: { label: "Quà tặng", unit: null },
};

/**
 * The longest `short` that still fits a wedge, given how many there are.
 *
 * Read from the same numbers the drawing uses, so a retune of the type or the
 * geometry cannot leave the editor promising room the wheel does not have.
 *
 * `hasImage` costs nothing now: the picture sits further in along the spoke and
 * the words keep the whole rim. The parameter stays because every caller passes
 * it, and the day the layout changes back is the day it would have to be
 * threaded through again.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function maxShortLength(sliceCount: number, _hasImage: boolean): number {
  return Math.max(1, Math.floor(labelArc(sliceCount) / WHEEL.charWidth));
}

/** A prize as the editor sends it, before anything has been checked. */
export interface PrizeDraft {
  id?: unknown;
  label?: unknown;
  short?: unknown;
  description?: unknown;
  kind?: unknown;
  amount?: unknown;
  image?: unknown;
  color?: unknown;
  weight?: unknown;
  exchangePoints?: unknown;
}

/**
 * One prize, checked.
 *
 * Every refusal names the slice it is about, because the editor saves the
 * whole wheel at once and "Nhãn quá dài" over a list of nine is not an
 * answerable message.
 */
export function readPrize(
  draft: PrizeDraft,
  sliceCount: number,
): { ok: true; prize: Prize } | { ok: false; error: string } {
  const id = typeof draft.id === "string" ? draft.id.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9-]{1,31}$/.test(id)) {
    return {
      ok: false,
      error: "Mã phần quà chỉ gồm chữ thường, số và dấu gạch ngang (2–32 ký tự).",
    };
  }

  const label = typeof draft.label === "string" ? draft.label.trim() : "";
  if (!label || label.length > 60) {
    return { ok: false, error: `"${id}": tên phần quà từ 1 đến 60 ký tự.` };
  }

  const kind = draft.kind;
  if (typeof kind !== "string" || !PRIZE_KINDS.includes(kind as PrizeKind)) {
    return { ok: false, error: `"${id}": loại phần quà không hợp lệ.` };
  }

  const image =
    typeof draft.image === "string" && draft.image.trim()
      ? draft.image.trim()
      : undefined;

  const short = typeof draft.short === "string" ? draft.short.trim() : "";
  const room = maxShortLength(sliceCount, image !== undefined);
  if (!short || short.length > room) {
    return {
      ok: false,
      error: `"${id}": chữ trên bánh xe tối đa ${room} ký tự với ${sliceCount} ô.`,
    };
  }

  const weight = Number(draft.weight);
  if (!Number.isInteger(weight) || weight < 1 || weight > 1000) {
    return { ok: false, error: `"${id}": tỉ lệ phải là số nguyên từ 1 đến 1000.` };
  }

  const amount = Number(draft.amount ?? 0);
  if (!Number.isInteger(amount) || amount < 0) {
    return { ok: false, error: `"${id}": giá trị phải là số nguyên không âm.` };
  }
  // A points or money slice worth nothing is a losing slice wearing a winner's
  // label, and the customer who lands on it will say so.
  if ((kind === "POINTS" || kind === "BALANCE") && amount <= 0) {
    return { ok: false, error: `"${id}": phần quà có giá trị thì phải lớn hơn 0.` };
  }
  // A percentage, not a sum: 120% off is the shop paying the customer to shop.
  if (kind === "VOUCHER" && (amount < 1 || amount > 100)) {
    return { ok: false, error: `"${id}": mã giảm giá phải từ 1% đến 100%.` };
  }

  // Never refused, only corrected: a colour that is not one is the shop's
  // wheel drawn wrong, not a save worth blocking over.
  const color = readWedgeColor(draft.color);

  // Capped rather than refused: a shop that typed a paragraph meant a
  // sentence, and losing the whole save over it helps nobody.
  const description =
    typeof draft.description === "string"
      ? draft.description.trim().slice(0, DESCRIPTION_MAX)
      : "";

  return {
    ok: true,
    prize: {
      id,
      label,
      short,
      ...(description ? { description } : {}),
      kind: kind as PrizeKind,
      amount,
      weight,
      color,
      ...(image ? { image } : {}),
    },
  };
}

/**
 * What the shop offers instead of posting a parcel, in points.
 *
 * Null is the honest default: a prize with no figure simply cannot be traded
 * back, and the winner is told so rather than offered a number the shop never
 * agreed to. Only an ITEM can carry one — points for points is not a trade,
 * and money is already in the wallet by the time anybody could ask.
 */
export function readExchangePoints(value: unknown, kind: PrizeKind): number | null {
  if (kind !== "ITEM") return null;
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/** The whole wheel, checked — the shape the save route stores or refuses. */
export function readWheel(
  drafts: unknown,
): { ok: true; prizes: Prize[] } | { ok: false; error: string } {
  if (!Array.isArray(drafts)) {
    return { ok: false, error: "Dữ liệu vòng quay không hợp lệ." };
  }
  if (drafts.length < MIN_SLICES || drafts.length > MAX_SLICES) {
    return {
      ok: false,
      error: `Vòng quay phải có từ ${MIN_SLICES} đến ${MAX_SLICES} ô.`,
    };
  }

  const prizes: Prize[] = [];
  const seen = new Set<string>();
  for (const draft of drafts) {
    const read = readPrize(draft as PrizeDraft, drafts.length);
    if (!read.ok) return read;
    if (seen.has(read.prize.id)) {
      return { ok: false, error: `Mã "${read.prize.id}" bị trùng.` };
    }
    seen.add(read.prize.id);
    prizes.push(read.prize);
  }
  return { ok: true, prizes };
}

// ---------------------------------------------------------------------------
// Wedge colours
// ---------------------------------------------------------------------------

/**
 * What a wedge may be painted.
 *
 * `auto` is the wheel as it was before the shop could choose: alternating dark
 * fills, with the rare slices in violet so the good outcome is visibly the
 * small one. It stays the default, so a shop that never opens this picker sees
 * exactly what it saw.
 *
 * Every colour is one value, used twice: the SVG `fill` the wedge is painted
 * and the swatch the desk picks from. It used to be two — a translucent fill
 * and an opaque Tailwind class — and they did not look alike, because 40%%
 * violet over a near-black wheel is not violet-600. A picker that shows a
 * colour the wedge will not be is worse than no picker.
 *
 * `WEDGE_GROUND` is the dark the wedges are drawn on, so a swatch can be
 * composited over the same ground and come out the same colour.
 */
export const WEDGE_GROUND = "#141419";
export const WEDGE_COLORS = {
  auto: { label: "Tự động", fill: null },
  violet: { label: "Tím", fill: "rgb(124 58 237 / 0.45)" },
  red: { label: "Đỏ", fill: "rgb(255 49 88 / 0.45)" },
  orange: { label: "Cam", fill: "rgb(249 115 22 / 0.45)" },
  amber: { label: "Vàng", fill: "rgb(245 158 11 / 0.45)" },
  lime: { label: "Xanh nõn", fill: "rgb(132 204 22 / 0.45)" },
  emerald: { label: "Xanh lá", fill: "rgb(16 185 129 / 0.45)" },
  teal: { label: "Xanh ngọc", fill: "rgb(20 184 166 / 0.45)" },
  sky: { label: "Xanh dương", fill: "rgb(14 165 233 / 0.45)" },
  indigo: { label: "Xanh tím", fill: "rgb(99 102 241 / 0.45)" },
  pink: { label: "Hồng", fill: "rgb(236 72 153 / 0.45)" },
  slate: { label: "Xám", fill: "rgb(100 116 139 / 0.45)" },
} as const;

/**
 * A swatch that comes out the colour the wedge will be.
 *
 * The fill is translucent, so painting it on a white page shows one colour and
 * on the wheel another. Compositing it over the wheel's own ground here is
 * what makes the picker honest — and it is one function, so the two can never
 * drift apart again.
 *
 * "Auto" has no single colour to show, so it shows both of its faces: the dark
 * a common slice gets and the violet a rare one does.
 */
export function wedgeSwatch(color: WedgeColor): React.CSSProperties {
  const fill = WEDGE_COLORS[color].fill;
  return fill
    ? {
        backgroundColor: WEDGE_GROUND,
        backgroundImage: `linear-gradient(${fill}, ${fill})`,
      }
    : {
        backgroundColor: WEDGE_GROUND,
        backgroundImage:
          "linear-gradient(135deg, #1c1c22 0 50%, rgb(124 58 237 / 0.45) 50% 100%)",
      };
}

export type WedgeColor = keyof typeof WEDGE_COLORS;

export const WEDGE_COLOR_KEYS = Object.keys(WEDGE_COLORS) as WedgeColor[];

export const DEFAULT_WEDGE_COLOR: WedgeColor = "auto";

/** The stored name as a colour, falling back rather than drawing nothing. */
export function readWedgeColor(value: unknown): WedgeColor {
  return typeof value === "string" && value in WEDGE_COLORS
    ? (value as WedgeColor)
    : DEFAULT_WEDGE_COLOR;
}

// ---------------------------------------------------------------------------
// Claiming a parcel
// ---------------------------------------------------------------------------

export const RECIPIENT_MAX = 60;
export const PHONE_MAX = 20;
export const ADDRESS_MIN = 15;
export const ADDRESS_MAX = 300;
export const CLAIM_NOTE_MAX = 200;

export interface Delivery {
  recipient: string;
  phone: string;
  address: string;
  note: string | null;
}

/**
 * The address a parcel is going to, or the sentence to show instead.
 *
 * Deliberately loose about the phone: Vietnamese numbers are written 0912…,
 * +84912…, with dots, with spaces, and a shop that refuses one of those forms
 * is refusing a customer who typed their own number correctly. Digits are
 * counted, not matched — nine to eleven of them is a phone number and anything
 * else is a typo worth catching.
 *
 * The address has a floor because "Hà Nội" is not somewhere a parcel can be
 * delivered, and the shop finding that out a week later helps nobody.
 */
export function readDelivery(
  input: unknown,
): { ok: true; delivery: Delivery } | { ok: false; error: string } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const recipient = text(raw.recipient);
  if (!recipient || recipient.length > RECIPIENT_MAX) {
    return { ok: false, error: `Tên người nhận từ 1 đến ${RECIPIENT_MAX} ký tự.` };
  }

  const phone = text(raw.phone);
  const digits = phone.replace(/\D/g, "").length;
  if (phone.length > PHONE_MAX || digits < 9 || digits > 11) {
    return { ok: false, error: "Số điện thoại không hợp lệ." };
  }

  const address = text(raw.address);
  if (address.length < ADDRESS_MIN) {
    return {
      ok: false,
      error: `Địa chỉ cần đầy đủ hơn — ít nhất ${ADDRESS_MIN} ký tự, kèm số nhà và phường/xã.`,
    };
  }
  if (address.length > ADDRESS_MAX) {
    return { ok: false, error: `Địa chỉ tối đa ${ADDRESS_MAX} ký tự.` };
  }

  const note = text(raw.note).slice(0, CLAIM_NOTE_MAX);
  return { ok: true, delivery: { recipient, phone, address, note: note || null } };
}

// ---------------------------------------------------------------------------
// How loudly to celebrate
// ---------------------------------------------------------------------------

/**
 * A prize this rare is worth confetti.
 *
 * Read off the wheel's own weights rather than a list of ids, because the shop
 * tunes those weights and rarity is exactly what it is saying when it does: a
 * slice it made hard to land on is a slice it considers a prize. Eight percent
 * is about one spin in twelve — often enough that the animation is not wasted
 * work, rare enough that it still means something when it fires.
 */
export const RARE_SHARE = 0.08;

export type WinFanfare = "none" | "small" | "big";

/**
 * How much noise a spin's outcome has earned.
 *
 * A parcel is always "big" whatever its odds: the shop is posting a physical
 * thing, which is the most it ever gives away, and a mousepad the wheel hands
 * out often is still a mousepad arriving in the post.
 */
export function winFanfare(
  prize: Pick<Prize, "kind" | "weight">,
  prizes: readonly Prize[],
): WinFanfare {
  if (prize.kind === "NOTHING") return "none";
  if (prize.kind === "ITEM") return "big";
  const total = totalWeight(prizes);
  if (total > 0 && prize.weight / total <= RARE_SHARE) return "big";
  return "small";
}
