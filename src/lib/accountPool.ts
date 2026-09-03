import "server-only";

import { db } from "@/lib/db";

/**
 * "Acc random": one listing, many sign-ins.
 *
 * An ordinary account listing IS the account — one row, one buyer, SOLD the
 * moment it is paid for. A random listing is a kind of account: the rank,
 * the level, the pictures describe what every one of them is like, and the
 * shop has a pile of sign-ins that all fit the description. It sells by the
 * piece, like a tool sells keys, and it stays on the shelf until the pile is
 * empty.
 *
 * Nothing new holds the pile. A random listing owns exactly one package —
 * the same row a tool's pricing tier is — and the sign-ins are that package's
 * licence keys, "user|pass" each. The order route, the key delivery, the
 * refund desk and the buyer's order history all already know how to move a
 * key from a package to an order; they only had to learn what a key means
 * when the product is an account.
 */

/** The label of the one package a random listing owns; never shown to a buyer. */
export const POOL_PACKAGE_LABEL = "Tài khoản";

/**
 * The package that holds the listing's sign-ins, created on first use. The
 * price rides along so a wholesale or refund screen that reads a package
 * price sees the listing's own.
 */
export async function ensurePoolPackage(productId: string, price: bigint): Promise<string> {
  const existing = await db.productPackage.findFirst({
    where: { productId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  if (existing) {
    await db.productPackage.update({ where: { id: existing.id }, data: { price } });
    return existing.id;
  }
  const created = await db.productPackage.create({
    data: { productId, label: POOL_PACKAGE_LABEL, price, sortOrder: 0 },
    select: { id: true },
  });
  return created.id;
}

/** How many sign-ins each listing still has on the shelf, by product id. */
export async function poolStock(productIds: string[]): Promise<Map<string, number>> {
  const stock = new Map<string, number>();
  if (productIds.length === 0) return stock;
  const packages = await db.productPackage.findMany({
    where: { productId: { in: productIds } },
    select: {
      productId: true,
      _count: { select: { licenseKeys: { where: { status: "AVAILABLE" } } } },
    },
  });
  for (const pkg of packages) {
    stock.set(pkg.productId, (stock.get(pkg.productId) ?? 0) + pkg._count.licenseKeys);
  }
  return stock;
}

/**
 * The sign-ins the admin pasted, one per line, as "user|pass" values.
 *
 * Forgiving about the separator — a bar, a colon, a tab or a run of spaces —
 * because the lists arrive from wherever the shop keeps them. The first
 * token is the user name; everything after the separator is the password,
 * spaces and all. Blank lines and lines with no separator are skipped, and
 * a pair pasted twice is kept once.
 */
export function parseCredentialBlock(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = /^([^|:\t\s]+)\s*[|:\t]\s*(.+)$/.exec(line) ?? /^(\S+)\s+(.+)$/.exec(line);
    if (!match) continue;
    const value = `${match[1]!.trim()}|${match[2]!.trim()}`;
    if (value.length > 200 || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** A stored "user|pass" back into its two halves. */
export function splitCredential(value: string): { username: string; password: string } {
  const at = value.indexOf("|");
  return at < 0
    ? { username: value, password: "" }
    : { username: value.slice(0, at), password: value.slice(at + 1) };
}
