import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/** Backs /categories and the "DANH MỤC KHÁC" block on a category page. */
export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      // Counted the way the shelf is actually stocked. The bare count
      // included products the shop had removed or hidden, so a category
      // advertised twelve and showed four.
      _count: {
        select: {
          products: { where: { deletedAt: null, status: { not: "HIDDEN" } } },
        },
      },
    },
  });

  return NextResponse.json({
    items: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      productCount: c._count.products,
    })),
  });
}
