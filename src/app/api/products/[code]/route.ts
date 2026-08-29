import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/** Full detail for one account, backing /account/[code]. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  // findFirst so `deletedAt` can join the filter: a removed account answers
  // 404 here exactly as it does on the page it backs.
  const product = await db.product.findFirst({
    where: { code, deletedAt: null, productType: "ACCOUNT_GAME" },
    include: {
      tags: true,
      category: { select: { slug: true, name: true } },
      skins: { select: { id: true, kind: true, tier: true, name: true, iconUrl: true } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  }

  // The detail page shows five separate inventory totals — the card's headline
  // count covers weapon skins only, so they cannot be collapsed into one number.
  const inventory = { WEAPON_SKIN: 0, BUDDY: 0, AGENT: 0, CARD: 0, SPRAY: 0 };
  const tierCounts = new Map<string, number>();
  for (const s of product.skins) {
    inventory[s.kind] += 1;
    if (s.tier) tierCounts.set(s.tier, (tierCounts.get(s.tier) ?? 0) + 1);
  }

  return NextResponse.json({
    code: product.code,
    rank: product.rank,
    lastRank: product.lastRank,
    trackerUrl: product.trackerUrl,
    level: product.level,
    vip: product.vip,
    vipIngame: product.vipIngame,
    kc: product.kc,
    mailType: product.mailType,
    tags: product.tags.map((t) => t.label),
    oldPrice: Number(product.oldPrice),
    price: Number(product.price),
    depositFrom: product.depositFrom ? Number(product.depositFrom) : null,
    viewers: product.viewers,
    imageUrl: product.imageUrl,
    category: product.category,
    inventory: {
      weaponSkins: inventory.WEAPON_SKIN,
      buddies: inventory.BUDDY,
      agents: inventory.AGENT,
      cards: inventory.CARD,
      sprays: inventory.SPRAY,
    },
    tiers: [...tierCounts].map(([tier, count]) => ({ tier, count })),
  });
}
