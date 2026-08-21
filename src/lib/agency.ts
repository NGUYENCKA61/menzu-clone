/**
 * Đại lý pricing helpers.
 *
 * There is deliberately NO flat rate here: every agency's percent is a
 * private number the admin types when granting the role (User.agencyPercent),
 * negotiated per partner and published nowhere.
 */

/** The range an admin may grant. */
export const AGENCY_PERCENT_MIN = 1;
export const AGENCY_PERCENT_MAX = 90;

/** Whatever the row says, never trust it past the grantable range. */
export function clampAgencyPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(AGENCY_PERCENT_MAX, Math.max(0, Math.floor(value)));
}

/** The wholesale cut of a line total in đồng, floored. */
export function agencyCutFor(lineTotal: bigint, percent: number): bigint {
  return (lineTotal * BigInt(clampAgencyPercent(percent))) / 100n;
}
