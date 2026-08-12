import "server-only";

import type { Prisma } from "@prisma/client";

import { uidFrom, type UserFilters } from "@/lib/users";

/**
 * Turns the screen's filters into one `where`, shared by the table and the
 * export.
 *
 * Shared on purpose: an export that quietly covers a different set than the
 * rows on screen is worse than no export, because nobody checks a spreadsheet
 * against the page it came from.
 */
export function userWhere(filters: UserFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (filters.role) where.role = filters.role;
  if (filters.tier) where.tier = filters.tier;
  // Blocked is a timestamp rather than a flag, so "active" is the absence of
  // one — not `blockedAt: false`, which is not a thing a date column can be.
  if (filters.state === "BLOCKED") where.blockedAt = { not: null };
  if (filters.state === "ACTIVE") where.blockedAt = null;

  if (filters.q) {
    const uid = uidFrom(filters.q);
    where.OR = [
      { username: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      ...(uid === null ? [] : [{ uid }]),
    ];
  }

  return where;
}
