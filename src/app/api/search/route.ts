import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { categoryHref, productHref } from "@/lib/routes";

/** Enough for a dropdown; a longer list is a page, and there is the catalogue for that. */
const PRODUCT_LIMIT = 6;
const CATEGORY_LIMIT = 3;

export interface SearchHit {
  kind: "software" | "account" | "category";
  /** The product code, or the category slug. */
  code: string;
  name: string;
  href: string;
  imageUrl: string | null;
  /** Category name for a product; "danh mục" for a category. */
  note: string;
}

/**
 * The header's search box: what the shop sells, by code or by a word of the
 * name, and the shelves themselves by name. Public, read-only, and small —
 * eight rows at most — because it answers on every keystroke.
 */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ hits: [] satisfies SearchHit[] });

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: {
        deletedAt: null,
        status: "AVAILABLE",
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ productType: "desc" }, { createdAt: "desc" }],
      take: PRODUCT_LIMIT,
      select: {
        code: true,
        name: true,
        slug: true,
        imageUrl: true,
        productType: true,
        category: { select: { slug: true, name: true } },
      },
    }),
    db.category.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      orderBy: { sortOrder: "asc" },
      take: CATEGORY_LIMIT,
      select: { slug: true, name: true, imageUrl: true },
    }),
  ]);

  const hits: SearchHit[] = [
    ...categories.map((c) => ({
      kind: "category" as const,
      code: c.slug,
      name: c.name,
      href: categoryHref(c.slug),
      imageUrl: c.imageUrl,
      note: "Danh mục",
    })),
    ...products.map((p) => ({
      kind: p.productType === "SOFTWARE_GAME" ? ("software" as const) : ("account" as const),
      code: p.code,
      name: p.name ?? p.code,
      href: productHref(p.category.slug, p.slug),
      imageUrl: p.imageUrl,
      note: p.category.name,
    })),
  ];

  return NextResponse.json(
    { hits },
    // Fresh enough for a search box, and the same query typed twice in a
    // minute is answered once.
    { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
