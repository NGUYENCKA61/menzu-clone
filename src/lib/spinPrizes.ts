import "server-only";

import { db } from "@/lib/db";
import { DEFAULT_PRIZES, type Prize, type PrizeKind } from "@/lib/spin";

/** A prize as the shop has it, plus what it offers instead of posting it. */
export type ShopPrize = Prize & {
  exchangePoints: number | null;
  /** How long a won code lasts. Null takes the default. */
  voucherDays: number | null;
};

/**
 * The wheel the shop is actually spinning.
 *
 * Falls back to the table in code when the database holds none. That is the
 * ordinary state of a shop that has never opened the editor — and it is a
 * fallback rather than a seed on purpose: nothing writes the defaults into the
 * table behind the shop's back, so "I have not set this up" and "I set it up
 * and it happens to match the defaults" stay different facts, and a shop that
 * deletes every slice gets the working wheel back instead of a blank circle.
 *
 * Inactive slices are left out here rather than filtered by every caller: a
 * slice that is off is off for the drawing, the picture and the odds table
 * alike, and the one caller that forgot would be the one that awards it.
 */
export async function listSpinPrizes(): Promise<ShopPrize[]> {
  const rows = await db.spinPrize.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  // The code table offers no exchange: nothing there is a parcel the shop has
  // priced in points, and inventing a figure would be a promise nobody made.
  if (rows.length === 0)
    return DEFAULT_PRIZES.map((p) => ({
      ...p,
      exchangePoints: null,
      voucherDays: null,
    }));

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    short: row.short,
    ...(row.description ? { description: row.description } : {}),
    kind: row.kind as PrizeKind,
    amount: row.amount,
    weight: row.weight,
    color: row.color ?? undefined,
    exchangePoints: row.exchangePoints,
    voucherDays: row.voucherDays,
    ...(row.image ? { image: row.image } : {}),
  }));
}

/**
 * Every slice the desk has, switched off ones included, in wheel order.
 *
 * The editor needs the rows it can edit — which is not the same list the wheel
 * spins on. Empty means the shop is still on the defaults, and the editor
 * shows those so its first save starts from the wheel customers can see rather
 * than from a blank page.
 */
export async function listSpinPrizesForAdmin(): Promise<(ShopPrize & { active: boolean; stored: boolean })[]> {
  const rows = await db.spinPrize.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  if (rows.length === 0) {
    return DEFAULT_PRIZES.map((prize) => ({
      ...prize,
      exchangePoints: null,
      voucherDays: null,
      active: true,
      stored: false,
    }));
  }
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    short: row.short,
    ...(row.description ? { description: row.description } : {}),
    kind: row.kind as PrizeKind,
    amount: row.amount,
    weight: row.weight,
    color: row.color ?? undefined,
    exchangePoints: row.exchangePoints,
    voucherDays: row.voucherDays,
    ...(row.image ? { image: row.image } : {}),
    active: row.active,
    stored: true,
  }));
}
