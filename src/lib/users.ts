/**
 * Reading the user screen's filters, and writing its export.
 *
 * Pure, for the same reasons the order screen's are: the filters arrive in a
 * URL anyone can edit, and the export leaves as a file somebody opens in
 * Excel.
 */

import { PER_PAGE } from "@/lib/paging";

/** Customers shown per page. */
export const USERS_PER_PAGE = PER_PAGE;

export const USER_ROLES = ["ADMIN", "MEMBER"] as const;
export const USER_STATES = ["ACTIVE", "BLOCKED"] as const;
/** Every value of MemberTier, in the order the schema declares them. */
export const USER_TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserState = (typeof USER_STATES)[number];
export type UserTier = (typeof USER_TIERS)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Quản trị",
  MEMBER: "Thành viên",
};

export const USER_STATE_LABELS: Record<UserState, string> = {
  ACTIVE: "Đang hoạt động",
  BLOCKED: "Đã khóa",
};

export const USER_TIER_LABELS: Record<UserTier, string> = {
  BRONZE: "Đồng",
  SILVER: "Bạc",
  GOLD: "Vàng",
  PLATINUM: "Bạch kim",
  DIAMOND: "Kim cương",
};

export interface UserFilters {
  /** Free text: username, email, or UID. */
  q: string;
  role: UserRole | null;
  state: UserState | null;
  tier: UserTier | null;
}

/** Longest search term accepted, so a pasted essay cannot become a LIKE scan. */
export const USER_QUERY_MAX = 80;

/**
 * Reads the filters out of whatever the URL carries.
 *
 * Anything unrecognised becomes "no filter" rather than an error: a bookmark
 * kept from an older version of this page should show the customers
 * unfiltered, not an empty table that reads as "no customers".
 */
export function parseUserFilters(params: Record<string, string | undefined>): UserFilters {
  const inList = <T extends string>(list: readonly T[], value: string | undefined) =>
    (list as readonly string[]).includes(value ?? "") ? (value as T) : null;

  return {
    q: (params.q ?? "").trim().slice(0, USER_QUERY_MAX),
    role: inList(USER_ROLES, params.role),
    state: inList(USER_STATES, params.state),
    tier: inList(USER_TIERS, params.tier),
  };
}

/** Whether anything is actually narrowing the list. */
export function hasUserFilters(filters: UserFilters): boolean {
  return Boolean(filters.q || filters.role || filters.state || filters.tier);
}

/**
 * The UID hidden in a search term, if there is one.
 *
 * An admin looking for "8" almost certainly means UID 8, but a plain contains
 * match on a numeric column is not something Postgres will do — so the number
 * is pulled out and matched exactly, alongside the text match on the name.
 */
export function uidFrom(query: string): number | null {
  const digits = query.replace(/^#|^uid\s*/i, "").trim();
  if (!/^\d{1,9}$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}
