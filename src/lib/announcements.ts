/**
 * What a system announcement is doing right now.
 *
 * Pure on purpose. Whether a notice is live is decided by comparing its window
 * to the clock — there is no scheduler flipping a flag, and nothing to go
 * stale — so the rule has to be one function that both the admin table and the
 * visitor query agree on, testable without a database.
 */

export type AnnouncementType = "UPDATE" | "MAINTENANCE" | "PROMO" | "INFO";
export type AnnouncementPriority = "LOW" | "NORMAL" | "HIGH";
export type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "DISABLED";

/** What the shop decided, crossed with where the clock is. */
export type AnnouncementState =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "EXPIRED"
  | "DISABLED";

/** The fields the state depends on, and nothing else. */
export interface AnnouncementWindow {
  status: string;
  startAt: Date;
  endAt: Date | null;
}

/**
 * Where a notice sits between "written" and "over".
 *
 * DRAFT and DISABLED are decisions and outrank the clock: a disabled notice
 * inside its window is still off, which is the point of being able to disable
 * one. Everything else is the window.
 */
export function announcementState(
  row: AnnouncementWindow,
  now: Date = new Date(),
): AnnouncementState {
  if (row.status === "DRAFT") return "DRAFT";
  if (row.status === "DISABLED") return "DISABLED";

  if (now.getTime() < row.startAt.getTime()) return "SCHEDULED";
  // A null end is open-ended: it runs until somebody turns it off.
  if (row.endAt && now.getTime() > row.endAt.getTime()) return "EXPIRED";
  return "ACTIVE";
}

/**
 * Whether a visitor should be shown this notice.
 *
 * The database query that fetches announcements filters on the same three
 * fields; this is the version that can be run over a row already in hand, and
 * the tests hold the two to the same answer.
 */
export function isAnnouncementActive(
  row: AnnouncementWindow,
  now: Date = new Date(),
): boolean {
  return announcementState(row, now) === "ACTIVE";
}

/**
 * The key a browser remembers a dismissal under.
 *
 * Carries the revision, so re-wording a notice everyone has already closed
 * brings it back rather than shouting into a room that stopped listening. An
 * admin who wants a second look at unchanged wording bumps it deliberately.
 */
export function dismissalKey(id: string, revision: number): string {
  return `menzu.announcement.${id}.${revision}`;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "5 phút trước" for the bell list.
 *
 * Stops being relative after a week: "37 ngày trước" is arithmetic the reader
 * has to do, where a date is just the answer.
 */
export function relativeTime(at: Date, now: Date = new Date()): string {
  const gap = now.getTime() - at.getTime();
  // A clock a little behind the server should not produce "trong 3 phút".
  if (gap < MINUTE) return "vừa xong";
  if (gap < HOUR) return `${Math.floor(gap / MINUTE)} phút trước`;
  if (gap < DAY) return `${Math.floor(gap / HOUR)} giờ trước`;
  if (gap < 7 * DAY) return `${Math.floor(gap / DAY)} ngày trước`;
  return at.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Vietnamese labels, kept beside the types they name. */
export const TYPE_LABELS: Record<AnnouncementType, string> = {
  UPDATE: "Cập nhật",
  MAINTENANCE: "Bảo trì",
  PROMO: "Khuyến mãi",
  INFO: "Thông tin",
};

export const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
};

export const STATE_LABELS: Record<AnnouncementState, string> = {
  DRAFT: "Nháp",
  SCHEDULED: "Đã lên lịch",
  ACTIVE: "Đang chạy",
  EXPIRED: "Hết hạn",
  DISABLED: "Đã tắt",
};

/** Guards for values arriving over the wire, so an enum column cannot be forced. */
export function readType(value: unknown): AnnouncementType | null {
  return typeof value === "string" && value in TYPE_LABELS
    ? (value as AnnouncementType)
    : null;
}

export function readPriority(value: unknown): AnnouncementPriority | null {
  return typeof value === "string" && value in PRIORITY_LABELS
    ? (value as AnnouncementPriority)
    : null;
}

export function readStatus(value: unknown): AnnouncementStatus | null {
  return value === "DRAFT" || value === "PUBLISHED" || value === "DISABLED"
    ? value
    : null;
}

/**
 * A date from a form field, or null.
 *
 * Returns undefined for "the caller did not mention this", which a PATCH has
 * to tell apart from "the caller cleared it".
 */
export function readDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const at = new Date(value);
  return Number.isFinite(at.getTime()) ? at : undefined;
}

/** Longest a title and a body may be, so one notice cannot fill the table. */
export const TITLE_MAX = 120;
export const BODY_MAX = 2000;
