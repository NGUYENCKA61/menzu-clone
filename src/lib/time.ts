/**
 * Day boundaries in the shop's own timezone.
 *
 * Vietnam is UTC+7 year-round — no daylight saving — so a fixed offset is
 * correct here and avoids pulling in a timezone database for one number.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Midnight in Vietnam, expressed as a UTC instant.
 *
 * Using UTC midnight instead would mis-file everything between 00:00 and 07:00
 * local into the previous day: the shop would open each morning to a "today"
 * figure that already contained seven hours of the night before, and an
 * evening sale at 23:00 local would land in tomorrow.
 */
export function startOfDayVn(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + VN_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - VN_OFFSET_MS);
}

/**
 * The instants bounding one calendar day named as "YYYY-MM-DD".
 *
 * That string is what an `<input type="date">` submits, and it names a day in
 * the reader's calendar, not a moment. Reading it with `new Date()` alone
 * parses it as UTC midnight, which in Vietnam is 07:00 — so a filter for the
 * 13th would return the last seven hours of the 12th and miss the evening of
 * the day the admin actually asked for.
 *
 * Returns null for anything that is not a real date, so a hand-edited URL
 * cannot turn into an Invalid Date in a query.
 */
export function dayRangeVn(day: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  if (!match) return null;

  const [, y, m, d] = match;
  const utcMidnight = Date.UTC(Number(y), Number(m) - 1, Number(d));
  const start = new Date(utcMidnight - VN_OFFSET_MS);
  if (!Number.isFinite(start.getTime())) return null;

  // Round-trip check: "2026-02-31" parses without complaint and silently
  // becomes March, which would quietly filter the wrong day.
  const back = new Date(utcMidnight);
  if (
    back.getUTCFullYear() !== Number(y) ||
    back.getUTCMonth() !== Number(m) - 1 ||
    back.getUTCDate() !== Number(d)
  ) {
    return null;
  }

  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
