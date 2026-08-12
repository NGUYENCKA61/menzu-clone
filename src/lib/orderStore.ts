import "server-only";

import type { Prisma } from "@prisma/client";

import type { OrderFilters } from "@/lib/orders";
import { dayRangeVn } from "@/lib/time";

/**
 * Turns the screen's filters into one `where`, shared by the table and the
 * export.
 *
 * Shared on purpose: an export that quietly covers a different set than the
 * rows on screen is worse than no export, because nobody checks a spreadsheet
 * against the page it came from.
 */
export function orderWhere(filters: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.method) where.method = filters.method;

  if (filters.day) {
    const range = dayRangeVn(filters.day);
    // An unparseable day filters nothing rather than everything: a stale
    // bookmark should show the orders, not an empty screen that reads as
    // "no orders exist".
    if (range) where.createdAt = { gte: range.start, lt: range.end };
  }

  if (filters.q) {
    where.OR = [
      { code: { contains: filters.q, mode: "insensitive" } },
      { user: { username: { contains: filters.q, mode: "insensitive" } } },
      { product: { code: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  return where;
}
