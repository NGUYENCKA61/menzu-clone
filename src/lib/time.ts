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
