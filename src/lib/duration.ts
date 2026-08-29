/**
 * Package durations, stored in hours and read back in whichever unit the shop
 * meant.
 *
 * Hours are the storage unit because a tool sells by the hour as readily as by
 * the year, and a day column cannot hold "3 giờ" at all. Nothing is stored
 * about which unit was typed: the largest unit that divides the stored hours
 * evenly is the one read back, which is the same answer the shop entered in
 * every case a shop actually enters.
 */

/** Spelled out because the arithmetic below is otherwise mute. */
const HOURS_PER_DAY = 24;
const HOURS_PER_WEEK = 7 * HOURS_PER_DAY;
/** A selling month is 30 days — a shop sells round numbers, not calendars. */
const HOURS_PER_MONTH = 30 * HOURS_PER_DAY;
const HOURS_PER_YEAR = 365 * HOURS_PER_DAY;

export type DurationUnit = "hour" | "day" | "week" | "month" | "year";

/**
 * What the unit picker on a tier form offers. "forever" is its own choice
 * rather than a blank number meaning it: a lifetime key must be something the
 * shop said out loud, never something a skipped field produced.
 */
export type DurationChoice = DurationUnit | "forever";

const UNIT_HOURS: Record<DurationUnit, number> = {
  hour: 1,
  day: HOURS_PER_DAY,
  week: HOURS_PER_WEEK,
  month: HOURS_PER_MONTH,
  year: HOURS_PER_YEAR,
};

const UNIT_NAMES: Record<DurationUnit, string> = {
  hour: "giờ",
  day: "ngày",
  week: "tuần",
  month: "tháng",
  year: "năm",
};

/**
 * Largest unit first, so 720 hours reads back as "1 tháng" rather than as
 * "30 ngày" — the shop typed the month.
 */
const READ_ORDER: DurationUnit[] = ["year", "month", "week", "day", "hour"];

/** The fact printed next to a tier: "7 ngày", "1 tháng", or a lifetime key. */
export function formatDuration(hours: number | null): string {
  if (hours === null || hours <= 0) return "Vĩnh viễn";
  for (const unit of READ_ORDER) {
    if (hours % UNIT_HOURS[unit] === 0) {
      return `${hours / UNIT_HOURS[unit]} ${UNIT_NAMES[unit]}`;
    }
  }
  return `${hours} giờ`;
}

/** The same, lower-cased for the middle of a sentence. */
export function formatDurationInline(hours: number | null): string {
  const text = formatDuration(hours);
  return text === "Vĩnh viễn" ? "vĩnh viễn" : text;
}

/**
 * Splits a stored duration back into what an edit form shows. A lifetime key
 * opens with the picker on "vĩnh viễn" and the number box empty.
 */
export function splitDuration(hours: number | null): {
  value: string;
  unit: DurationChoice;
} {
  if (hours === null || hours <= 0) return { value: "", unit: "forever" };
  for (const unit of READ_ORDER) {
    if (hours % UNIT_HOURS[unit] === 0) {
      return { value: String(hours / UNIT_HOURS[unit]), unit };
    }
  }
  return { value: String(hours), unit: "hour" };
}

/**
 * Whether a form's duration is something the shop actually said.
 *
 * "forever" needs no number; every other unit needs one. A blank number under
 * "giờ" or "ngày" is a field somebody skipped, not a lifetime key — it used to
 * mean vĩnh viễn, and a skipped box quietly selling lifetime access is exactly
 * the accident this refuses.
 */
export function durationValid(value: string, unit: DurationChoice): boolean {
  if (unit === "forever") return true;
  const number = Number(value.replace(/\D/g, ""));
  return Number.isFinite(number) && number > 0;
}

/** What a form sends: the chosen duration as hours, null being "vĩnh viễn". */
export function toHours(value: string, unit: DurationChoice): number | null {
  if (unit === "forever") return null;
  const number = Number(value.replace(/\D/g, ""));
  if (!Number.isFinite(number) || number <= 0) return null;
  return number * UNIT_HOURS[unit];
}

/**
 * The name a tier gets when the shop does not type one: "7 ngày", "1 tháng",
 * "Vĩnh viễn". The duration is what a customer is buying, so it is what the
 * tier is called — the shop only types a name to say something the duration
 * does not.
 */
export function autoLabel(value: string, unit: DurationChoice): string {
  if (unit === "forever") return "Vĩnh viễn";
  const number = Number(value.replace(/\D/g, ""));
  if (!Number.isFinite(number) || number <= 0) return "";
  return `${number} ${UNIT_NAMES[unit]}`;
}
