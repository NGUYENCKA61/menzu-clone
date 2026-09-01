/**
 * Whether a tool's detection pill — "Undetected", "Detected", "Đang cập nhật"
 * — appears on the tool's own page.
 *
 * The pill and the shop's badges share one row under the title, and two or
 * three pills competing there is one pill too many: the badge is what the shop
 * wants read first, and "Undetected" beside it is noise the storefront card
 * already carried. So the shop gets to say, per tool, and the answer it gives
 * by saying nothing is the one that keeps that row short.
 *
 * Stored as a nullable boolean rather than a plain one so "not decided" stays
 * distinct from "decided: hide". A tool whose only badge is deleted should get
 * its pill back if nobody ever chose; it should stay bare if somebody did.
 */

export const STATUS_PILL_MODES = {
  auto: "Tự động — ẩn khi có nhãn",
  show: "Luôn hiện",
  hide: "Luôn ẩn",
} as const;

export type StatusPillMode = keyof typeof STATUS_PILL_MODES;

export const STATUS_PILL_MODE_KEYS = Object.keys(
  STATUS_PILL_MODES,
) as StatusPillMode[];

export const DEFAULT_STATUS_PILL_MODE: StatusPillMode = "auto";

/** Returned when the request body never mentioned the field. */
export const PILL_ABSENT = "absent";
/** Returned when it did, and said something that is not a mode. */
export const PILL_BAD = "bad";

export type StatusPillInput =
  | boolean
  | null
  | typeof PILL_ABSENT
  | typeof PILL_BAD;

/** The stored column, as the picker in the desk shows it. */
export function statusPillMode(
  stored: boolean | null | undefined,
): StatusPillMode {
  if (stored === true) return "show";
  if (stored === false) return "hide";
  return "auto";
}

/** The picker's answer, as the column stores it. */
export function statusPillColumn(mode: unknown): boolean | null {
  if (mode === "show") return true;
  if (mode === "hide") return false;
  return null;
}

/**
 * The whole question, answered: does this tool's page draw the pill?
 *
 * `auto` is the interesting case — it defers to whether the shop has already
 * said something about this tool in a badge.
 */
export function showsStatusPill(
  stored: boolean | null | undefined,
  badgeCount: number,
): boolean {
  if (stored === true) return true;
  if (stored === false) return false;
  return badgeCount === 0;
}

/**
 * Reads the field off a request body, keeping "not sent" apart from "sent as
 * nonsense" — a PATCH that never mentions the pill must leave the column
 * alone, and one that names a mode nobody defined must be refused rather than
 * quietly filed as `auto`.
 */
export function readStatusPill(value: unknown): StatusPillInput {
  if (value === undefined) return PILL_ABSENT;
  if (value === null) return null;
  if (typeof value !== "string") return PILL_BAD;
  if (!STATUS_PILL_MODE_KEYS.includes(value as StatusPillMode)) return PILL_BAD;
  return statusPillColumn(value);
}
