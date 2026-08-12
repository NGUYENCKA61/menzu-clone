/**
 * Arithmetic behind the admin overview.
 *
 * Pure on purpose: these are the numbers a shop owner makes decisions on, and
 * a chart that plots the wrong week or a percentage that flatters last month
 * is worse than no figure at all. None of it needs a database to be checked.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Vietnamese weekday initials, indexed by JS getUTCDay() on the shifted date. */
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export interface DayBucket {
  /** Inclusive start of the day, as a UTC instant. */
  start: Date;
  /** Exclusive end — the next day's start, so no row lands in two buckets. */
  end: Date;
  /** "T2" … "CN", for the axis. */
  label: string;
}

/**
 * The last `count` days ending with the one `now` falls in, oldest first.
 *
 * Built from a day start rather than by subtracting 24 hours repeatedly, so a
 * chart drawn at 23:50 and the same chart drawn ten minutes later cover the
 * same days instead of sliding by a fraction.
 */
export function lastDays(startOfToday: Date, count = 7): DayBucket[] {
  const out: DayBucket[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(startOfToday.getTime() - i * DAY_MS);
    // Read in Vietnam's offset, which is where the day boundary was drawn.
    const local = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    out.push({
      start,
      end: new Date(start.getTime() + DAY_MS),
      label: WEEKDAYS[local.getUTCDay()]!,
    });
  }
  return out;
}

/**
 * Change from one period to the next, as a percentage.
 *
 * Null when there is nothing to compare against: growth from zero is not
 * "+100%", it is undefined, and printing a number there tells the shop it
 * doubled when it started.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** "+12,8%" / "-4,1%", in the Vietnamese decimal convention. */
export function formatPercent(value: number): string {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  return `${value >= 0 ? "+" : "-"}${rounded.toFixed(1).replace(".", ",")}%`;
}

/**
 * Turns a series into SVG polyline coordinates inside a `width` × `height` box.
 *
 * The vertical scale runs from zero rather than from the lowest value: a week
 * of 9.8m, 10m, 10.2m plotted against its own range looks like a mountain
 * range, and the shop reads a rally that did not happen.
 *
 * A flat series sits on the floor of the box, not halfway up it, so "nothing
 * happened this week" looks like nothing happened.
 */
export function linePoints(
  values: number[],
  width: number,
  height: number,
  padding = 4,
): string {
  if (values.length === 0) return "";

  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const peak = Math.max(0, ...values);
  const step = values.length > 1 ? usableW / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const ratio = peak > 0 ? value / peak : 0;
      // SVG y grows downward, so the tallest value is nearest the top.
      const y = padding + usableH - ratio * usableH;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** What a transaction row's status reads as, and how it is tinted. */
export type TxState = "SUCCESS" | "PENDING" | "FAILED";

export const TX_STATE_LABELS: Record<TxState, string> = {
  SUCCESS: "Thành công",
  PENDING: "Đang chờ",
  FAILED: "Thất bại",
};

/**
 * Collapses the two ledgers onto one vocabulary.
 *
 * A top-up and an order have separate status enums that mean the same three
 * things to somebody reading a list of transactions. Expired is a failure from
 * the reader's side — no money arrived — even though the shop still honours a
 * late transfer.
 */
export function txState(kind: "topup" | "order", status: string): TxState {
  if (kind === "topup") {
    if (status === "COMPLETED") return "SUCCESS";
    if (status === "PENDING") return "PENDING";
    return "FAILED";
  }
  if (status === "PAID") return "SUCCESS";
  if (status === "PENDING") return "PENDING";
  return "FAILED";
}
