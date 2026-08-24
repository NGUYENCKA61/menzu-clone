/**
 * Package durations, stored in hours and read back in whichever unit the shop
 * meant.
 *
 * Hours are the storage unit because a tool sells by the hour as readily as by
 * the month, and a day column cannot hold "3 giờ" at all. Nothing is stored
 * about which unit was typed: a whole number of days reads back as days,
 * anything else as hours, which is the same answer the shop entered in every
 * case a shop actually enters.
 */

/** Hours in a day — spelled out because the arithmetic below is otherwise mute. */
const HOURS_PER_DAY = 24;

export type DurationUnit = "hour" | "day";

/** The fact printed next to a tier: "7 ngày", "3 giờ", or a lifetime key. */
export function formatDuration(hours: number | null): string {
  if (hours === null || hours <= 0) return "Vĩnh viễn";
  if (hours % HOURS_PER_DAY === 0) return `${hours / HOURS_PER_DAY} ngày`;
  return `${hours} giờ`;
}

/** The same, lower-cased for the middle of a sentence. */
export function formatDurationInline(hours: number | null): string {
  const text = formatDuration(hours);
  return text === "Vĩnh viễn" ? "vĩnh viễn" : text;
}

/**
 * Splits a stored duration back into the number and unit an edit form shows.
 * A blank number is a lifetime key, so `null` comes back as an empty box
 * rather than as a zero the shop would have to clear.
 */
export function splitDuration(hours: number | null): {
  value: string;
  unit: DurationUnit;
} {
  if (hours === null || hours <= 0) return { value: "", unit: "day" };
  if (hours % HOURS_PER_DAY === 0) {
    return { value: String(hours / HOURS_PER_DAY), unit: "day" };
  }
  return { value: String(hours), unit: "hour" };
}

/**
 * What a form sends: the typed number in the chosen unit, as hours. A blank or
 * junk number means the shop left the field alone, which is how they say
 * "vĩnh viễn".
 */
export function toHours(value: string, unit: DurationUnit): number | null {
  const number = Number(value.replace(/\D/g, ""));
  if (!Number.isFinite(number) || number <= 0) return null;
  return unit === "day" ? number * HOURS_PER_DAY : number;
}
