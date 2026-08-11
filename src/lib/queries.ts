import "server-only";

import { db } from "@/lib/db";
import type { AccountDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountBuyPanel";
import type {
  Product,
  TierColor,
} from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import type { TickerEntry } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/TransactionTicker";
import type { FlashSaleItem } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/flashSaleData";
import type { ContentTier } from "@prisma/client";

/**
 * Data access for the server components.
 *
 * Pages query Postgres directly rather than fetching their own /api routes —
 * that would mean an extra HTTP hop on every render. The API routes stay for
 * client-side use (filtering, pagination) and for anything external.
 */

const PAGE_SIZE = 12;

/** DB enum -> the colour names the existing card components already speak. */
const TIER_COLOR: Record<ContentTier, TierColor> = {
  ULTRA: "yellow",
  EXCLUSIVE: "orange",
  PREMIUM: "pink",
  DELUXE: "cyan",
  SELECT: "blue",
};

/** Order the card renders its tier counters in. */
const TIER_ORDER: TierColor[] = ["yellow", "orange", "pink", "cyan", "blue"];

interface SkinRow {
  kind: string;
  tier: ContentTier | null;
}

function toTiers(skins: SkinRow[]) {
  const counts = new Map<TierColor, number>();
  for (const s of skins) {
    if (!s.tier) continue;
    const color = TIER_COLOR[s.tier];
    counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return TIER_ORDER.filter((c) => counts.has(c)).map((color) => ({
    color,
    count: counts.get(color) as number,
  }));
}

function countKind(skins: SkinRow[], kind: string): number {
  return skins.filter((s) => s.kind === kind).length;
}

export interface CategoryPageData {
  name: string;
  slug: string;
  products: Product[];
  total: number;
  totalPages: number;
  page: number;
}

export async function getCategoryPage(
  slug: string,
  page = 1,
): Promise<CategoryPageData | null> {
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return null;

  const where = { categoryId: category.id, status: "AVAILABLE" as const };

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        tags: { select: { label: true } },
        skins: { select: { kind: true, tier: true } },
      },
    }),
  ]);

  return {
    name: category.name,
    slug: category.slug,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    products: rows.map((p) => ({
      code: p.code,
      rank: p.rank,
      skins: countKind(p.skins, "WEAPON_SKIN"),
      tiers: toTiers(p.skins),
      tag: p.tags[0]?.label ?? null,
      // The live card shows a "+N" chip for skins beyond the visible strip.
      extraSkins: Math.max(0, countKind(p.skins, "WEAPON_SKIN") - 8),
      oldPrice: Number(p.oldPrice),
      price: Number(p.price),
    })),
  };
}

export async function listCategories() {
  const rows = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return rows.map((c) => ({
    slug: c.slug,
    name: c.name,
    productCount: c._count.products,
  }));
}

export async function getAccountDetail(
  code: string,
): Promise<AccountDetail | null> {
  const p = await db.product.findUnique({
    where: { code },
    include: {
      category: { select: { slug: true, name: true } },
      tags: { select: { label: true } },
      skins: { select: { kind: true, tier: true } },
    },
  });
  if (!p) return null;

  return {
    code: p.code,
    rank: p.rank,
    lastRank: p.lastRank,
    weaponSkins: countKind(p.skins, "WEAPON_SKIN"),
    buddies: countKind(p.skins, "BUDDY"),
    agents: countKind(p.skins, "AGENT"),
    cards: countKind(p.skins, "CARD"),
    sprays: countKind(p.skins, "SPRAY"),
    level: p.level,
    vp: p.vp,
    rp: p.rp,
    kc: p.kc,
    tag: p.tags[0]?.label ?? null,
    mailType: p.mailType ?? "",
    oldPrice: Number(p.oldPrice),
    price: Number(p.price),
    depositFrom: p.depositFrom ? Number(p.depositFrom) : 0,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    viewers: p.viewers,
    sold: p.status !== "AVAILABLE",
  };
}

/** "Tài Khoản Tương Tự" — same category, excluding the one being viewed. */
export async function getRelatedProducts(
  code: string,
  categorySlug: string,
  take = 4,
): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: {
      code: { not: code },
      status: "AVAILABLE",
      category: { slug: categorySlug },
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      tags: { select: { label: true } },
      skins: { select: { kind: true, tier: true } },
    },
  });

  return rows.map((p) => ({
    code: p.code,
    rank: p.rank,
    skins: countKind(p.skins, "WEAPON_SKIN"),
    tiers: toTiers(p.skins),
    tag: p.tags[0]?.label ?? null,
    extraSkins: Math.max(0, countKind(p.skins, "WEAPON_SKIN") - 8),
    oldPrice: Number(p.oldPrice),
    price: Number(p.price),
  }));
}

// ---------------------------------------------------------------------------
// Account area
// ---------------------------------------------------------------------------

export interface LedgerRow {
  code: string;
  kind: string;
  status: string;
  delta: number;
  balanceAfter: number;
  description: string;
  method: string | null;
  createdAt: Date;
}

export async function getTransactions(userId: string): Promise<LedgerRow[]> {
  const rows = await db.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((t) => ({
    code: t.code,
    kind: t.kind,
    status: t.status,
    delta: Number(t.delta),
    balanceAfter: Number(t.balanceAfter),
    description: t.description,
    method: t.method,
    createdAt: t.createdAt,
  }));
}

export interface OrderRow {
  code: string;
  status: string;
  total: number;
  createdAt: Date;
  productCode: string;
  productRank: string;
  imageUrl: string | null;
}

export async function getOrders(userId: string): Promise<OrderRow[]> {
  const rows = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { code: true, rank: true, imageUrl: true } },
    },
  });
  return rows.map((o) => ({
    code: o.code,
    status: o.status,
    total: Number(o.total),
    createdAt: o.createdAt,
    productCode: o.product.code,
    productRank: o.product.rank,
    imageUrl: o.product.imageUrl,
  }));
}

export interface ServiceOrderRow {
  code: string;
  status: string;
  amount: number;
  serviceName: string;
  createdAt: Date;
}

export async function getServiceOrders(
  userId: string,
): Promise<ServiceOrderRow[]> {
  const rows = await db.serviceOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { service: { select: { name: true } } },
  });
  return rows.map((s) => ({
    code: s.code,
    status: s.status,
    amount: Number(s.amount),
    serviceName: s.service.name,
    createdAt: s.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------

/**
 * Discounted products for the flash-sale carousel, biggest saving first.
 * Returns the shape FlashSaleCard already speaks — prices as formatted
 * strings — so the component does not have to change.
 */
export async function getFlashSaleItems(take = 20): Promise<FlashSaleItem[]> {
  const rows = await db.product.findMany({
    where: { status: "AVAILABLE", oldPrice: { gt: 0 } },
    include: { skins: { select: { kind: true, tier: true } } },
  });

  const discountOf = (price: bigint, oldPrice: bigint) =>
    1 - Number(price) / Number(oldPrice);

  return rows
    .filter((p) => p.price < p.oldPrice)
    .sort(
      (a, b) =>
        discountOf(b.price, b.oldPrice) - discountOf(a.price, a.oldPrice),
    )
    .slice(0, take)
    .map((p) => {
      const pct = Math.round(
        (1 - Number(p.price) / Number(p.oldPrice)) * 100,
      );
      return {
        code: p.code,
        discount: pct > 0 ? `-${pct}%` : null,
        oldPrice: `${formatVndString(Number(p.oldPrice))} VND`,
        newPrice: `${formatVndString(Number(p.price))} VND`,
        skins: countKind(p.skins, "WEAPON_SKIN"),
        tiers: toTiers(p.skins).map((t) => ({ color: t.color, count: t.count })),
      };
    });
}

function formatVndString(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export interface ReviewRow {
  name: string;
  body: string;
  avatarUrl: string | null;
  amount: number;
  createdAt: Date;
}

export async function getFeedback(take = 20): Promise<ReviewRow[]> {
  const rows = await db.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((f) => ({
    name: f.name,
    body: f.body,
    avatarUrl: f.avatarUrl,
    amount: Number(f.amount),
    createdAt: f.createdAt,
  }));
}


/**
 * Recent purchases for the homepage ticker. Usernames are masked the way the
 * live feed does it — "user 4***", "Ke***" — so the strip never exposes who
 * bought what.
 */
/**
 * Recent purchases for the homepage ticker, in the shape TransactionTicker
 * already speaks. Usernames are masked the way the live feed does it, so the
 * strip never exposes who bought what.
 *
 * Returns an empty array when there are no paid orders yet — the homepage then
 * falls back to the captured sample rather than showing an empty strip.
 */
export async function getRecentPurchases(take = 20): Promise<TickerEntry[]> {
  const rows = await db.order.findMany({
    where: { status: "PAID" },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: { select: { username: true } },
      product: { select: { code: true } },
    },
  });

  return rows.map((o, i) => ({
    agentId: TICKER_AVATARS[i % TICKER_AVATARS.length],
    user: maskUsername(o.user.username),
    amount: `${formatVndString(Number(o.total))}đ`,
    code: `#${o.product.code.toLowerCase()}`,
    time: relativeTime(o.createdAt),
  }));
}

/** Agent portraits the live ticker cycles through. */
const TICKER_AVATARS = [
  "e370fa57-4757-3604-3648-499e1f642d3f",
  "dade69b4-4f5a-8528-247b-219e5a1facd6",
  "5f8d3a7f-467b-97f3-062c-13acf203c006",
  "cc8b64c8-4b25-4ff9-6e7f-37b4da43d235",
  "b444168c-4e35-8076-db47-ef9bf368f384",
];

function relativeTime(date: Date): string {
  const mins = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest > 0 ? `${hours} giờ ${rest} phút trước` : `${hours} giờ trước`;
}

function maskUsername(name: string): string {
  if (name.length <= 2) return `${name}***`;
  return `${name.slice(0, 2)}***`;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export interface ServiceRow {
  slug: string;
  name: string;
  priceLabel: string | null;
  imageUrl: string | null;
  doneCount: number;
}

export async function listServices(): Promise<ServiceRow[]> {
  const rows = await db.service.findMany({ orderBy: { doneCount: "desc" } });
  return rows.map((s) => ({
    slug: s.slug,
    name: s.name,
    priceLabel: s.priceLabel,
    imageUrl: s.imageUrl,
    doneCount: s.doneCount,
  }));
}

export async function getService(slug: string): Promise<ServiceRow | null> {
  const s = await db.service.findUnique({ where: { slug } });
  if (!s) return null;
  return {
    slug: s.slug,
    name: s.name,
    priceLabel: s.priceLabel,
    imageUrl: s.imageUrl,
    doneCount: s.doneCount,
  };
}

/** The build advertised on /app/download. Null before the first seed. */
export async function getAppRelease() {
  return db.appRelease.findFirst({ orderBy: { buildNumber: "desc" } });
}
