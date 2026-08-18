import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { weaponKey } from "@/lib/weaponImages";
import type { AccountDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountBuyPanel";
import type { SoftwareDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareBuyPanel";
import type { SoftwareCardView } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareCard";
import {
  SKIN_CHIP_COUNT,
  type Product,
  type TierColor,
} from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import type { PartnerView } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PartnersSection";
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

/**
 * The listing card's whole view of an account.
 *
 * Shared by the two places that build it — the category grid and "tài khoản
 * tương tự" — because they had drifted into near-copies of each other, and the
 * "+N" chip only reads correctly if it is counted against the same names that
 * were drawn.
 *
 * `price` is passed in rather than read off the row: a running flash sale
 * replaces it on the category grid, and a card that printed the ordinary price
 * during a sale would be advertising the wrong figure.
 */
function toProductCard(
  row: {
    code: string;
    imageUrl: string | null;
    rank: string;
    vp: number;
    rp: number;
    oldPrice: bigint;
    tags: { label: string }[];
    skins: (SkinRow & { name: string })[];
  },
  price: bigint | number,
  images: Map<string, string>,
): Product {
  const total = countKind(row.skins, "WEAPON_SKIN");
  const names = cardSkinNames(row.skins);

  return {
    code: row.code,
    imageUrl: row.imageUrl,
    rank: row.rank,
    // The vp/rp columns were Valorant currencies; on this shop's accounts they
    // carry the card's two labelled numbers — VIP and VIP INGAME. Zero means
    // "not filled in" and the card hides the entry.
    vip: row.vp,
    vipIngame: row.rp,
    skins: total,
    tiers: toTiers(row.skins),
    tag: row.tags[0]?.label ?? null,
    skinChips: names.map((name) => ({
      name,
      imageUrl: images.get(weaponKey(name)) ?? null,
    })),
    extraSkins: Math.max(0, total - SKIN_CHIP_COUNT),
    oldPrice: Number(row.oldPrice),
    price: Number(price),
  };
}

/** The weapon names a card actually draws — the rest are only counted. */
function cardSkinNames(skins: (SkinRow & { name: string })[]): string[] {
  return skins
    .filter((s) => s.kind === "WEAPON_SKIN")
    .slice(0, SKIN_CHIP_COUNT)
    .map((s) => s.name);
}

/**
 * Pictures for a page of cards, keyed by weapon, in one query.
 *
 * Only the names a card will draw are asked for. An account can list hundreds
 * of skins and a grid holds twelve of them, so looking up every name on the
 * page would fetch thousands of rows to use forty-eight of them.
 */
async function weaponImages(
  rows: { skins: (SkinRow & { name: string })[] }[],
): Promise<Map<string, string>> {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const name of cardSkinNames(row.skins)) keys.add(weaponKey(name));
  }
  if (keys.size === 0) return new Map();

  const found = await db.weaponImage.findMany({
    where: { key: { in: [...keys] } },
    select: { key: true, url: true },
  });
  return new Map(found.map((i) => [i.key, i.url]));
}

/**
 * What a card needs from the skin rows, in the order the shop listed them.
 *
 * Ordered by id, which is a cuid and so rises with insertion: a shop that put
 * its best weapon at the top of the list sees that one on the card, instead of
 * whichever row Postgres happened to hand back first.
 */
const CARD_SKINS = {
  select: { kind: true, tier: true, name: true },
  orderBy: { id: "asc" },
} as const;

export interface CategoryPageData {
  name: string;
  slug: string;
  /** Accounts. Paged, filtered and sorted by the panel above the grid. */
  products: Product[];
  /**
   * Software in the same category, listed whole rather than paged: a game
   * carries a handful of tools, not hundreds, and the filter panel above the
   * account grid — rank, skin, price band — describes none of them.
   */
  software: SoftwareCardView[];
  total: number;
  totalPages: number;
  page: number;
}

/**
 * Sale prices for whichever of these products has a flash sale running now.
 *
 * A scheduled sale used to pick which products appeared in the home-page row
 * and nothing else — the price it carried was shown to the admin and then
 * ignored everywhere a customer could see it. This is the one place that
 * answers "what does this cost right now", and the buy endpoint asks the same
 * question again inside its transaction.
 *
 * Overlapping windows are legal; the cheapest wins, because that is the price
 * the shop has advertised at least once.
 */
export async function runningSalePrices(
  productIds: string[],
): Promise<Map<string, bigint>> {
  if (productIds.length === 0) return new Map();

  const now = new Date();
  const sales = await db.flashSale.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      productId: { in: productIds },
    },
    select: { productId: true, salePrice: true },
    orderBy: { salePrice: "asc" },
  });

  const prices = new Map<string, bigint>();
  for (const sale of sales) {
    if (!prices.has(sale.productId)) prices.set(sale.productId, sale.salePrice);
  }
  return prices;
}

export interface CategoryFilters {
  min?: number;
  max?: number;
  sort?: "newest" | "price-asc" | "price-desc";
  /** Matches a weapon skin by name. */
  skin?: string;
  /** Matches a buddy, card, spray or agent by name. */
  accessory?: string;
  source?: "all" | "drop" | "menzu";
}

const ACCESSORY_KINDS = ["BUDDY", "CARD", "SPRAY", "AGENT"] as const;

/**
 * Turns the filter panel's choices into a query.
 *
 * Price compares against the product's own price rather than a running flash
 * sale: the sale price is a temporary override and folding it in would need a
 * join the listing does not otherwise pay for. Sales are short and rare, so a
 * card can briefly show less than the band it was filtered into.
 */
function categoryWhere(categoryId: string, filters: CategoryFilters) {
  const price: { gte?: bigint; lte?: bigint } = {};
  if (filters.min !== undefined) price.gte = BigInt(Math.floor(filters.min));
  if (filters.max !== undefined) price.lte = BigInt(Math.floor(filters.max));

  const dropTag = { some: { label: { contains: "DROP", mode: "insensitive" as const } } };

  return {
    categoryId,
    status: "AVAILABLE" as const,
    // Accounts only. Software lives in the same table and the same category,
    // but every filter and every column of the grid below describes an
    // account — a tool has no rank to match and no skins to count, so left in
    // it would render as an empty card that no filter could reach.
    productType: "ACCOUNT_GAME" as const,
    // Removed products never reach a shopper. This is the listing every
    // category page and its paging count run through, so one clause here
    // covers the grid, the total and the page count together.
    deletedAt: null,
    ...(price.gte !== undefined || price.lte !== undefined ? { price } : {}),
    ...(filters.skin
      ? {
          skins: {
            some: {
              kind: "WEAPON_SKIN" as const,
              name: { contains: filters.skin, mode: "insensitive" as const },
            },
          },
        }
      : {}),
    ...(filters.accessory
      ? {
          skins: {
            some: {
              kind: { in: [...ACCESSORY_KINDS] },
              name: { contains: filters.accessory, mode: "insensitive" as const },
            },
          },
        }
      : {}),
    // Only "DROP MAIL" is recorded as a tag, so "Menzu" reads as "everything
    // that is not drop mail" — the split the shop's own tagging supports.
    ...(filters.source === "drop" ? { tags: dropTag } : {}),
    ...(filters.source === "menzu" ? { NOT: { tags: dropTag } } : {}),
  };
}

function categoryOrder(sort: CategoryFilters["sort"]) {
  if (sort === "price-asc") return { price: "asc" as const };
  if (sort === "price-desc") return { price: "desc" as const };
  return { createdAt: "desc" as const };
}

export async function getCategoryPage(
  slug: string,
  page = 1,
  filters: CategoryFilters = {},
): Promise<CategoryPageData | null> {
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return null;

  const where = categoryWhere(category.id, filters);

  const [total, rows, softwareRows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: categoryOrder(filters.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        tags: { select: { label: true } },
        skins: CARD_SKINS,
      },
    }),
    db.product.findMany({
      where: {
        categoryId: category.id,
        productType: "SOFTWARE_GAME",
        status: "AVAILABLE",
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        packages: {
          orderBy: { price: "asc" },
          select: { id: true, label: true, price: true },
        },
      },
    }),
  ]);

  const [sale, images] = await Promise.all([
    runningSalePrices(rows.map((p) => p.id)),
    weaponImages(rows),
  ]);

  return {
    name: category.name,
    slug: category.slug,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    // Cheapest tier first, which is the order the card's dropdown reads in.
    // No separate "from" price: the card prints the tiers themselves, so a
    // second figure above them would only be the first one again.
    software: softwareRows.map((s) => ({
      code: s.code,
      name: s.name ?? s.code,
      imageUrl: s.imageUrl,
      description: s.description ?? "",
      status: s.softwareStatus,
      packages: s.packages.map((p) => ({
        id: p.id,
        label: p.label,
        price: Number(p.price),
      })),
      downloadUrl: s.downloadUrl,
    })),
    products: rows.map((p) => toProductCard(p, sale.get(p.id) ?? p.price, images)),
  };
}

export async function listCategories() {
  const rows = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    // The count is filtered, not raw: it is printed on the category tiles as
    // how much is in there, and a removed account is not.
    include: {
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
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
  // findFirst, not findUnique: `deletedAt` is not part of a unique key, and a
  // removed account has to read as gone from here — the caller turns null into
  // a 404, which is what a stale link or a search engine should meet.
  // Typed as well as coded: a software code typed into an /account URL would
  // otherwise render a page of blank stat rows instead of a 404.
  const p = await db.product.findFirst({
    where: { code, deletedAt: null, productType: "ACCOUNT_GAME" },
    include: {
      category: { select: { slug: true, name: true } },
      tags: { select: { label: true } },
      skins: { select: { kind: true, tier: true } },
      images: { select: { url: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) return null;

  const sale = await runningSalePrices([p.id]);

  return {
    code: p.code,
    imageUrl: p.imageUrl,
    images: p.images.map((i) => i.url),
    rank: p.rank,
    lastRank: p.lastRank,
    weaponSkins: countKind(p.skins, "WEAPON_SKIN"),
    // Scraped totals win; counting rows is the fallback for products that
    // scripts/scrape-inventory.mjs has not reached yet.
    buddies: p.buddyCount ?? countKind(p.skins, "BUDDY"),
    agents: p.agentCount ?? countKind(p.skins, "AGENT"),
    cards: p.cardCount ?? countKind(p.skins, "CARD"),
    sprays: p.sprayCount ?? countKind(p.skins, "SPRAY"),
    level: p.level,
    vp: p.vp,
    rp: p.rp,
    kc: p.kc,
    tag: p.tags[0]?.label ?? null,
    mailType: p.mailType ?? "",
    oldPrice: Number(p.oldPrice),
    price: Number(sale.get(p.id) ?? p.price),
    // 0 means the shop set no deposit for this account, which is the common
    // case: the live pages show a bare "Cọc / Trả Góp" button and only quote
    // an amount on the few products that carry one. It is per-product data,
    // not a percentage of the price — two products checked across the range
    // quote nothing at all.
    depositFrom: p.depositFrom ? Number(p.depositFrom) : 0,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    viewers: p.viewers,
    sold: p.status !== "AVAILABLE",
  };
}

/**
 * A software product and everything its page prints.
 *
 * Filtered on the type as well as the code, so an account code typed into a
 * /software URL answers 404 rather than rendering a page whose every field
 * would be blank.
 */
export async function getSoftwareDetail(code: string): Promise<SoftwareDetail | null> {
  const p = await db.product.findFirst({
    where: { code, deletedAt: null, productType: "SOFTWARE_GAME" },
    include: {
      category: { select: { slug: true, name: true } },
      packages: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) return null;

  return {
    code: p.code,
    // A shop that has not named the tool yet falls back to its code, which is
    // at least unique, rather than rendering an empty heading.
    name: p.name ?? p.code,
    description: p.description ?? "",
    softwareStatus: p.softwareStatus,
    images: p.images.length > 0 ? p.images.map((i) => i.url) : p.imageUrl ? [p.imageUrl] : [],
    videoUrl: p.videoUrl,
    version: p.version,
    platform: p.platform,
    packages: p.packages.map((pk) => ({
      id: pk.id,
      label: pk.label,
      price: Number(pk.price),
      durationDays: pk.durationDays,
    })),
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    inStock: p.status === "AVAILABLE",
    price: Number(p.price),
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
      deletedAt: null,
      // "Tài khoản tương tự" — a tool is not one.
      productType: "ACCOUNT_GAME",
      category: { slug: categorySlug },
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      tags: { select: { label: true } },
      skins: CARD_SKINS,
    },
  });

  const images = await weaponImages(rows);
  return rows.map((p) => toProductCard(p, p.price, images));
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

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------

/**
 * Discounted products for the flash-sale carousel, biggest saving first.
 * Returns the shape FlashSaleCard already speaks — prices as formatted
 * strings — so the component does not have to change.
 */
export async function getFlashSaleItems(take = 20): Promise<FlashSaleItem[]> {
  const now = new Date();

  // A scheduled sale wins when one is running. Falling back to "anything
  // discounted" keeps the row populated for a shop that has not scheduled
  // anything yet, which is how this worked before scheduling existed.
  const scheduled = await db.flashSale.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    select: { productId: true },
  });

  // Both branches exclude removed products: a sale scheduled before the shop
  // took the account down must not resurrect it on the home page.
  const rows = await db.product.findMany({
    where:
      scheduled.length > 0
        ? {
            status: "AVAILABLE",
            deletedAt: null,
            productType: "ACCOUNT_GAME",
            id: { in: scheduled.map((s) => s.productId) },
          }
        : {
            status: "AVAILABLE",
            deletedAt: null,
            // The flash-sale card prints a skin count and tier chips, so it
            // only ever describes an account.
            productType: "ACCOUNT_GAME",
            oldPrice: { gt: 0 },
          },
    include: { skins: { select: { kind: true, tier: true } } },
  });

  // The scheduled price is what the card must print. Reading p.price here was
  // the bug: an admin could set a sale price, watch the row pick the product
  // up, and still see the ordinary price on every card.
  const sale = await runningSalePrices(rows.map((p) => p.id));
  const priceOf = (p: { id: string; price: bigint }) => sale.get(p.id) ?? p.price;

  const discountOf = (price: bigint, oldPrice: bigint) =>
    1 - Number(price) / Number(oldPrice);

  return rows
    .filter((p) => priceOf(p) < p.oldPrice)
    .sort(
      (a, b) =>
        discountOf(priceOf(b), b.oldPrice) - discountOf(priceOf(a), a.oldPrice),
    )
    .slice(0, take)
    .map((p) => {
      const price = priceOf(p);
      const pct = Math.round((1 - Number(price) / Number(p.oldPrice)) * 100);
      return {
        code: p.code,
        discount: pct > 0 ? `-${pct}%` : null,
        oldPrice: `${formatVndString(Number(p.oldPrice))} VND`,
        newPrice: `${formatVndString(Number(price))} VND`,
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


// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

/**
 * The "Đối tác uy tín" strip, in display order. Empty until the shop adds
 * partners in the admin, and the section hides itself while it is.
 */
export async function getPartners(): Promise<PartnerView[]> {
  const rows = await db.partner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    logoUrl: p.logoUrl,
    url: p.url,
  }));
}

/** The build advertised on /app/download. Null before the first seed. */
export async function getAppRelease() {
  return db.appRelease.findFirst({ orderBy: { buildNumber: "desc" } });
}

/** Owner card and contact buttons for /bio. */
export async function getBioProfile() {
  return db.bioProfile.findFirst({
    include: { links: { orderBy: [{ page: "asc" }, { sortOrder: "asc" }] } },
  });
}

/** Wiki articles for /docs, grouped by section in display order. */
export async function listDocArticles() {
  return db.docArticle.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getDocArticle(slug: string) {
  return db.docArticle.findUnique({ where: { slug } });
}

export interface InventoryItem {
  id: string;
  kind: string;
  name: string;
  iconUrl: string | null;
  weapon: string | null;
}

/**
 * Every item on an account, for the five inventory tabs.
 *
 * Ordered by weapon so the grid stays stable as the filter changes, then by
 * name so repeat runs of the scraper cannot reshuffle it.
 */
export async function getInventory(code: string): Promise<InventoryItem[]> {
  const rows = await db.productSkin.findMany({
    where: { product: { code } },
    orderBy: [{ weapon: "asc" }, { name: "asc" }],
    select: { id: true, kind: true, name: true, iconUrl: true, weapon: true },
  });

  // Rows the shop typed by hand carry no icon of their own; the shared
  // picture library fills them in by name — weapons, characters and gear
  // alike, the same lookup the listing card uses, so an item illustrated
  // once is illustrated everywhere.
  const missing = [
    ...new Set(rows.filter((r) => !r.iconUrl).map((r) => weaponKey(r.name))),
  ];
  if (missing.length === 0) return rows;

  const library = await db.weaponImage.findMany({
    where: { key: { in: missing } },
    select: { key: true, url: true },
  });
  const byKey = new Map(library.map((i) => [i.key, i.url]));

  return rows.map((r) =>
    r.iconUrl !== null
      ? r
      : { ...r, iconUrl: byKey.get(weaponKey(r.name)) ?? null },
  );
}

export interface TradeRequestRow {
  code: string;
  mode: string;
  mailType: string;
  status: string;
  zalo: string;
  createdAt: Date;
  quotedAmount: number | null;
}

/** "Lịch sử giao dịch" on /trade — the visitor's own quote requests. */
export async function getTradeRequests(userId: string): Promise<TradeRequestRow[]> {
  const rows = await db.tradeRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    code: r.code,
    mode: r.mode,
    mailType: r.mailType,
    status: r.status,
    zalo: r.zalo,
    createdAt: r.createdAt,
    quotedAmount: r.quotedAmount === null ? null : Number(r.quotedAmount),
  }));
}

export interface TopUpRow {
  code: string;
  method: string;
  carrier: string | null;
  amount: number;
  status: string;
  createdAt: Date;
}

/** "Thẻ nạp gần đây" on /wallet. */
export async function getTopUps(userId: string, take = 10): Promise<TopUpRow[]> {
  const rows = await db.topUp.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((t) => ({
    code: t.code,
    method: t.method,
    carrier: t.carrier,
    amount: Number(t.amount),
    status: t.status,
    createdAt: t.createdAt,
  }));
}

export interface AdminTradeRow {
  code: string;
  username: string;
  mode: string;
  mailType: string;
  hasWelcomeMail: boolean;
  screenshotUrl: string | null;
  zalo: string;
  note: string | null;
  status: string;
  quotedAmount: number | null;
  createdAt: Date;
}

/** Every trade-in request, newest first, for the admin queue. */
export async function listTradeRequests(take = 100): Promise<AdminTradeRow[]> {
  const rows = await db.tradeRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take,
    include: { user: { select: { username: true } } },
  });
  return rows.map((r) => ({
    code: r.code,
    username: r.user.username,
    mode: r.mode,
    mailType: r.mailType,
    hasWelcomeMail: r.hasWelcomeMail,
    screenshotUrl: r.screenshotUrl,
    zalo: r.zalo,
    note: r.note,
    status: r.status,
    quotedAmount: r.quotedAmount === null ? null : Number(r.quotedAmount),
    createdAt: r.createdAt,
  }));
}

export interface AdminUserRow {
  id: string;
  uid: number;
  username: string;
  email: string | null;
  role: string;
  tier: string;
  balance: number;
  points: number;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
  blockedAt: Date | null;
  blockedReason: string | null;
  createdAt: Date;
  lastIp: string | null;
  lastLoginAt: Date | null;
  totalToppedUp: number;
}

/**
 * The admin user list.
 *
 * Order count and spend are aggregated in the query rather than by loading
 * every order — a customer with hundreds of purchases would otherwise pull
 * all of them across just to produce two numbers.
 */
export async function listUsers(
  options: { where?: Prisma.UserWhereInput; skip?: number; take?: number } = {},
): Promise<AdminUserRow[]> {
  const users = await db.user.findMany({
    where: options.where,
    orderBy: { createdAt: "desc" },
    skip: options.skip,
    take: options.take ?? 200,
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const topped = await db.topUp.groupBy({
    by: ["userId"],
    _sum: { amount: true },
    where: { status: "COMPLETED" },
  });
  const toppedByUser = new Map(topped.map((row) => [row.userId, Number(row._sum.amount ?? 0)]));

  const spend = await db.order.groupBy({
    by: ["userId"],
    _sum: { total: true },
    where: { status: "PAID" },
  });
  const spentByUser = new Map(spend.map((row) => [row.userId, Number(row._sum.total ?? 0)]));

  return users.map((u) => ({
    id: u.id,
    uid: u.uid,
    username: u.username,
    email: u.email,
    role: u.role,
    tier: u.tier,
    balance: Number(u.balance),
    points: u.points,
    orderCount: u._count.orders,
    totalSpent: spentByUser.get(u.id) ?? 0,
    lastOrderAt: u.orders[0]?.createdAt ?? null,
    blockedAt: u.blockedAt,
    blockedReason: u.blockedReason,
    createdAt: u.createdAt,
    lastIp: u.lastIp,
    lastLoginAt: u.lastLoginAt,
    totalToppedUp: toppedByUser.get(u.id) ?? 0,
  }));
}

export interface AdminFlashSaleRow {
  id: string;
  productCode: string;
  productRank: string;
  price: number;
  salePrice: number;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
  /** Whether the window is open right now. */
  running: boolean;
}

/**
 * Every scheduled sale, running or not, for the marketing screen.
 *
 * `running` is decided here rather than in the page: reading the clock during
 * render is an impure call, and deciding it in the browser would let the badge
 * disagree with the price shoppers are actually charged.
 */
export async function listFlashSales(take = 100): Promise<AdminFlashSaleRow[]> {
  const now = Date.now();
  const rows = await db.flashSale.findMany({
    orderBy: { startsAt: "desc" },
    take,
    include: { product: { select: { code: true, rank: true, price: true } } },
  });
  return rows.map((r) => ({
    running: r.active && r.startsAt.getTime() <= now && r.endsAt.getTime() >= now,
    id: r.id,
    productCode: r.product.code,
    productRank: r.product.rank,
    price: Number(r.product.price),
    salePrice: Number(r.salePrice),
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    active: r.active,
  }));
}

export interface AdminVoucherRow {
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  active: boolean;
}

export async function listVouchers(take = 100): Promise<AdminVoucherRow[]> {
  const rows = await db.voucher.findMany({ orderBy: { code: "asc" }, take });
  return rows.map((v) => ({
    code: v.code,
    percentOff: v.percentOff,
    amountOff: v.amountOff === null ? null : Number(v.amountOff),
    minOrder: v.minOrder === null ? null : Number(v.minOrder),
    maxUses: v.maxUses,
    usedCount: v.usedCount,
    startsAt: v.startsAt,
    expiresAt: v.expiresAt,
    active: v.active,
  }));
}

export interface AdminFeedbackRow {
  id: string;
  name: string;
  body: string;
  amount: number;
  verified: boolean;
  createdAt: Date;
}

export async function listFeedback(take = 200): Promise<AdminFeedbackRow[]> {
  const rows = await db.feedback.findMany({ orderBy: { createdAt: "desc" }, take });
  return rows.map((f) => ({
    id: f.id,
    name: f.name,
    body: f.body,
    amount: Number(f.amount),
    verified: f.verified,
    createdAt: f.createdAt,
  }));
}

export interface AdminServiceOrderRow {
  code: string;
  username: string;
  serviceName: string;
  amount: number;
  status: string;
  createdAt: Date;
}

export async function listServiceOrders(take = 200): Promise<AdminServiceOrderRow[]> {
  const rows = await db.serviceOrder.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take,
    include: {
      user: { select: { username: true } },
      service: { select: { name: true } },
    },
  });
  return rows.map((s) => ({
    code: s.code,
    username: s.user.username,
    serviceName: s.service.name,
    amount: Number(s.amount),
    status: s.status,
    createdAt: s.createdAt,
  }));
}

export interface AdminTopUpRow {
  code: string;
  username: string;
  method: string;
  carrier: string | null;
  amount: number;
  status: string;
  createdAt: Date;
}

export interface AdminCategoryRow {
  id: string;
  slug: string;
  name: string;
  /** The line under the name on the home page tile. */
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  /** Printed on the home page card as "Đã Bán" / "Đang Bán". */
  soldCount: number;
  stockCount: number;
  /** The real number of products, which the two counters above are not. */
  productCount: number;
}

/** The admin category list, in the order the storefront renders them. */
/**
 * Every group and the ids of the categories it shows, in display order.
 *
 * Ids rather than whole categories: the screen already has the full list to
 * pick from, and sending each category again inside every group it belongs to
 * would put the same row on the wire several times — which is the duplication
 * this table exists to avoid, repeated in the payload.
 */
export async function listAdminGroups() {
  const rows = await db.group.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: { orderBy: { sortOrder: "asc" }, select: { categoryId: true } },
    },
  });
  return rows.map((group) => ({
    id: group.id,
    slug: group.slug,
    name: group.name,
    isActive: group.isActive,
    sortOrder: group.sortOrder,
    categoryIds: group.categories.map((link) => link.categoryId),
  }));
}

export async function listAdminCategories(): Promise<AdminCategoryRow[]> {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    imageUrl: c.imageUrl,
    sortOrder: c.sortOrder,
    soldCount: c.soldCount,
    stockCount: c.stockCount,
    productCount: c._count.products,
  }));
}

export async function listTopUps(take = 200): Promise<AdminTopUpRow[]> {
  const rows = await db.topUp.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { username: true } } },
  });
  return rows.map((t) => ({
    code: t.code,
    username: t.user.username,
    method: t.method,
    carrier: t.carrier,
    amount: Number(t.amount),
    status: t.status,
    createdAt: t.createdAt,
  }));
}
