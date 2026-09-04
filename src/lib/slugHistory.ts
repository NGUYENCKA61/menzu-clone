/**
 * The addresses a category or product used to answer on.
 *
 * A slug is a promise: the moment a tool's page is posted to the Telegram
 * channel or shared on Zalo, its address is out of the shop's hands. When the
 * admin then changes the slug, every copy of the old link would answer 404
 * and a search engine would start the new address from nothing. So each
 * change is written down here, and a request for an address nothing lives at
 * is answered with a permanent redirect to where the thing lives now. Search
 * engines carry the old address's standing across; a visitor never notices.
 *
 * Chains work by construction: A → B → C leaves rows for A and B, and both
 * point at the row that now spells C. Renaming back (B → A) forgets A, since
 * A is live again and a live page always wins over a memory of it. Deleting
 * the category or product deletes its old addresses with it (cascade), so no
 * row can ever redirect to a 404.
 *
 * Two namespaces, because categories sit at the root and products under one:
 * a category and a product may both have once been called "hack-naraka-vn".
 */
import type { Prisma, SlugKind } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * The two writes that record a change, for callers that run them inside a
 * transaction with the change itself: the old address is remembered (or, if
 * it was already somebody's old address, re-pointed), and any memory of the
 * new one is dropped, since it is live now.
 */
export function rememberSlugOps(
  kind: SlugKind,
  targetId: string,
  oldSlug: string,
  newSlug: string,
): Prisma.PrismaPromise<unknown>[] {
  if (oldSlug === newSlug) return [];
  const target = kind === "CATEGORY" ? { categoryId: targetId } : { productId: targetId };
  return [
    db.slugHistory.upsert({
      where: { kind_slug: { kind, slug: oldSlug } },
      create: { kind, slug: oldSlug, ...target },
      update: target,
    }),
    db.slugHistory.deleteMany({ where: { kind, slug: newSlug } }),
  ];
}

export async function rememberCategorySlug(
  categoryId: string,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  const ops = rememberSlugOps("CATEGORY", categoryId, oldSlug, newSlug);
  if (ops.length) await db.$transaction(ops);
}

export async function rememberProductSlug(
  productId: string,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  const ops = rememberSlugOps("PRODUCT", productId, oldSlug, newSlug);
  if (ops.length) await db.$transaction(ops);
}

/**
 * A newly created page takes its address back from history: the old memory
 * would never be consulted (the live page is found first), but it would be
 * wrong the day this page is renamed away again.
 */
export async function forgetSlug(kind: SlugKind, slug: string): Promise<void> {
  await db.slugHistory.deleteMany({ where: { kind, slug } });
}

/** Where the category that used to answer on this slug lives now, if any. */
export async function categoryBehindOldSlug(slug: string): Promise<{ slug: string } | null> {
  const row = await db.slugHistory.findUnique({
    where: { kind_slug: { kind: "CATEGORY", slug } },
    select: { category: { select: { slug: true } } },
  });
  return row?.category ?? null;
}

/**
 * Where the product that used to answer on this slug lives now, if it is
 * still on sale. A removed product answers 404 on its current address too,
 * so redirecting there would only move the visitor between two dead ends.
 */
export async function productBehindOldSlug(
  slug: string,
): Promise<{ slug: string; categorySlug: string } | null> {
  const row = await db.slugHistory.findUnique({
    where: { kind_slug: { kind: "PRODUCT", slug } },
    select: {
      product: {
        select: { slug: true, deletedAt: true, category: { select: { slug: true } } },
      },
    },
  });
  if (!row?.product || row.product.deletedAt) return null;
  return { slug: row.product.slug, categorySlug: row.product.category.slug };
}
