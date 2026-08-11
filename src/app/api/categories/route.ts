import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/** Backs /categories and the "DANH MỤC KHÁC" block on a category page. */
export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({
    items: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      productCount: c._count.products,
    })),
  });
}
