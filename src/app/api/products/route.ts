import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Product listing.
 *
 * The query parameters are not invented — each one maps to a control that
 * exists on the live category page's filter panel:
 *
 *   q          "Tìm: ORA by OneTap, Forsaken, …"   (skin search)
 *   accessory  "Tìm phụ kiện (Buddy, Card...)"
 *   priceMin   the "0" field
 *   priceMax   the "Bất kỳ" field
 *   sort       Mới nhất | Giá ↑ | Giá ↓
 *   source     Tất cả | DROP | MENZU
 *   rank       "Rank: Bất kỳ"
 *   lolFree    "LOL Free" toggle
 *   tftFree    "TFT Free" toggle
 *   category   the /category/[slug] segment
 *   page       pagination, 12 per page (matches the live grid)
 */
const PAGE_SIZE = 12;

type SortKey = "newest" | "price_asc" | "price_desc";

const ORDER_BY: Record<SortKey, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
};

function parseAmount(value: string | null): bigint | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  return BigInt(digits);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const sortParam = params.get("sort");
  const sort: SortKey =
    sortParam === "price_asc" || sortParam === "price_desc" ? sortParam : "newest";

  const priceMin = parseAmount(params.get("priceMin"));
  const priceMax = parseAmount(params.get("priceMax"));
  const category = params.get("category");
  const rank = params.get("rank");
  const source = params.get("source");
  const q = params.get("q")?.trim();

  // Accounts only — every filter this route accepts (rank, skin name, source
  // prefix) describes an account, and software has its own listing.
  const where: Prisma.ProductWhereInput = {
    status: "AVAILABLE",
    deletedAt: null,
    productType: "ACCOUNT_GAME",
  };

  if (category) where.category = { slug: category };
  if (rank && rank !== "any") where.rank = { contains: rank, mode: "insensitive" };

  if (priceMin !== undefined || priceMax !== undefined) {
    where.price = {
      ...(priceMin !== undefined ? { gte: priceMin } : {}),
      ...(priceMax !== undefined ? { lte: priceMax } : {}),
    };
  }

  // "DROP" and "MENZU" are the two code prefixes used on the live site.
  if (source === "drop") where.code = { startsWith: "VLR" };
  if (source === "menzu") where.code = { startsWith: "MENZU" };

  // The skin search matches against the account's skin names.
  if (q) where.skins = { some: { name: { contains: q, mode: "insensitive" } } };

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        tags: true,
        category: { select: { slug: true, name: true } },
        skins: { select: { tier: true, kind: true } },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items: products.map((p) => {
      const tierCounts = new Map<string, number>();
      let weaponSkins = 0;
      for (const s of p.skins) {
        if (s.kind === "WEAPON_SKIN") weaponSkins += 1;
        if (s.tier) tierCounts.set(s.tier, (tierCounts.get(s.tier) ?? 0) + 1);
      }
      return {
        code: p.code,
        rank: p.rank,
        skins: weaponSkins,
        tiers: [...tierCounts].map(([tier, count]) => ({ tier, count })),
        tags: p.tags.map((t) => t.label),
        oldPrice: Number(p.oldPrice),
        price: Number(p.price),
        imageUrl: p.imageUrl,
        category: p.category,
      };
    }),
  });
}
