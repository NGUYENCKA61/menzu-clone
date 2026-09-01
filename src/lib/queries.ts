import "server-only";

import type { Prisma } from "@prisma/client";

import {
  currentOrderIdOf,
  loginHandover,
  tagOf,
  type LoginHandover,
} from "@/lib/accountLogin";
import { db } from "@/lib/db";
import { docHtmlToPlainText } from "@/lib/docHtml";
import { parseBadges } from "@/lib/productBadges";
import { showsStatusPill } from "@/lib/statusPill";
import { parseFeatures } from "@/lib/productFeatures";
import { productHref } from "@/lib/routes";
import { weaponKey } from "@/lib/weaponImages";
import type { AccountDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountBuyPanel";
import type { SoftwareDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareBuyPanel";
import { parseRequirements } from "@/lib/productRequirements";
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
    name: string | null;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    rank: string;
    vip: number;
    vipIngame: number;
    oldPrice: bigint;
    tags: { label: string }[];
    skins: (SkinRow & { name: string })[];
    category: { slug: string };
  },
  price: bigint | number,
  images: Map<string, string>,
): Product {
  const total = countKind(row.skins, "WEAPON_SKIN");
  const names = cardSkinNames(row.skins);

  return {
    code: row.code,
    // The shop's own title when it typed one; the card otherwise falls back
    // to rank/skins, and to the bare code when both are blank.
    name: row.name,
    href: productHref(row.category.slug, row.slug),
    imageUrl: row.imageUrl,
    // The card's two-line blurb: this account's own words when the shop wrote
    // some, reduced to running text — the card clamps to two lines either way.
    description: row.description ? docHtmlToPlainText(row.description, 200) : "",
    rank: row.rank,
    // The card's two labelled numbers. Zero means "not filled in" and the
    // card hides the entry.
    vip: row.vip,
    vipIngame: row.vipIngame,
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
  /**
   * How many sellable accounts the category holds before any filter runs.
   * Zero means the category does not deal in accounts at all, which is a
   * different thing from a filter matching none of the ones it has: the
   * page drops the whole account section for the first, and keeps it — with
   * the panel that got you there — for the second.
   */
  accountTotal: number;
  /**
   * The same count for tools, and for the same reason: it separates a category
   * that sells no software from one whose software the search just excluded.
   */
  softwareTotal: number;
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
  /** Matches a tool by name, or by the code the card falls back to. */
  software?: string;
  /** Matches a tool by the feature line under its name. */
  softwareFeature?: string;
  softwareStatus?: "UNDETECTED" | "DETECTED" | "UPDATING";
  softwareSort?: "newest" | "price-asc" | "price-desc";
}

/**
 * The software half of a category listing.
 *
 * Name, features and status are columns, so they narrow the query here. Price
 * is not: a tool costs whatever its cheapest package costs, which no column
 * holds, so the price sort runs over the mapped rows further down.
 *
 * The name search takes the code too, because `name` is nullable and the card
 * prints the code in its place — whatever is on the tile should be findable by
 * typing it. The two searches are separate keys and so are ANDed: a name and a
 * feature together narrow, rather than widening into everything matching one.
 */
function softwareWhere(categoryId: string, filters: CategoryFilters) {
  const name = filters.software?.trim();
  const feature = filters.softwareFeature?.trim();
  return {
    categoryId,
    productType: "SOFTWARE_GAME" as const,
    status: "AVAILABLE" as const,
    deletedAt: null,
    ...(name
      ? {
          OR: [
            { name: { contains: name, mode: "insensitive" as const } },
            { code: { contains: name, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(feature
      ? { description: { contains: feature, mode: "insensitive" as const } }
      : {}),
    ...(filters.softwareStatus ? { softwareStatus: filters.softwareStatus } : {}),
  };
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

  const [total, rows, softwareRows, accountTotal, softwareTotal] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: categoryOrder(filters.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        tags: { select: { label: true } },
        skins: CARD_SKINS,
        // Every card carries its own address, and half of it is the
        // category's — read here rather than closed over from the page, so a
        // product listed on a category it does not belong to is impossible.
        category: { select: { slug: true } },
      },
    }),
    db.product.findMany({
      where: softwareWhere(category.id, filters),
      orderBy: { createdAt: "desc" },
      include: {
        packages: {
          orderBy: { price: "asc" },
          select: { id: true, label: true, price: true },
        },
      },
    }),
    // Both listings with every filter dropped: what the category holds, rather
    // than what this request matched. Built by the same two helpers, so a count
    // and its listing cannot drift over what "sellable" means.
    db.product.count({ where: categoryWhere(category.id, {}) }),
    db.product.count({ where: softwareWhere(category.id, {}) }),
  ]);

  const [sale, images] = await Promise.all([
    runningSalePrices(rows.map((p) => p.id)),
    weaponImages(rows),
  ]);

  // Cheapest tier first, which is the order the card's dropdown reads in. No
  // separate "from" price: the card prints the tiers themselves, so a second
  // figure above them would only be the first one again.
  const software: SoftwareCardView[] = softwareRows.map((s) => ({
    code: s.code,
    // Every tool on this page belongs to this category by definition of the
    // query, so its address is this category's slug and the tool's own.
    href: productHref(category.slug, s.slug),
    name: s.name ?? s.code,
    categoryName: category.name,
    imageUrl: s.imageUrl,
    description: s.description ?? "",
    status: s.softwareStatus,
    packages: s.packages.map((p) => ({
      id: p.id,
      label: p.label,
      price: Number(p.price),
    })),
    downloadUrl: s.downloadUrl,
  }));

  // Sorted here rather than in SQL: what a tool costs is the cheapest of its
  // packages, and no column holds that. A category carries a handful of tools,
  // so reading them in memory is cheaper than the join and the window function
  // ordering by a related minimum would need. Tools priced at nothing — none
  // yet, but a tool can exist before its packages do — go last either way,
  // rather than leading the ascending list at zero.
  if (filters.softwareSort === "price-asc" || filters.softwareSort === "price-desc") {
    const direction = filters.softwareSort === "price-asc" ? 1 : -1;
    software.sort((a, b) => {
      const left = a.packages[0]?.price;
      const right = b.packages[0]?.price;
      if (left === undefined) return right === undefined ? 0 : 1;
      if (right === undefined) return -1;
      return direction * (left - right);
    });
  }

  return {
    name: category.name,
    slug: category.slug,
    total,
    accountTotal,
    softwareTotal,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    software,
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

/**
 * What an address means, whichever half of it is known.
 *
 * The product routes answer with a redirect rather than a 404 when the
 * category in the URL is not the one the product sits in today, so both the
 * legacy /software/<mã> addresses and a stale /old-category/<sản-phẩm> land on
 * the one canonical page instead of dying.
 */
export async function resolveProduct(where: {
  slug?: string;
  code?: string;
}): Promise<{ slug: string; code: string; categorySlug: string; isSoftware: boolean } | null> {
  if (!where.slug && !where.code) return null;
  const p = await db.product.findFirst({
    where: {
      deletedAt: null,
      ...(where.slug ? { slug: where.slug } : {}),
      ...(where.code ? { code: where.code } : {}),
    },
    select: {
      slug: true,
      code: true,
      productType: true,
      category: { select: { slug: true } },
    },
  });
  if (!p) return null;
  return {
    slug: p.slug,
    code: p.code,
    categorySlug: p.category.slug,
    isSoftware: p.productType === "SOFTWARE_GAME",
  };
}

export async function getAccountDetail(
  slug: string,
): Promise<AccountDetail | null> {
  // findFirst, not findUnique: `deletedAt` is not part of a unique key, and a
  // removed account has to read as gone from here — the caller turns null into
  // a 404, which is what a stale link or a search engine should meet.
  // Typed as well as addressed: a tool's slug would otherwise render a page of
  // blank stat rows instead of a 404.
  const p = await db.product.findFirst({
    // Hidden means hidden, address included. A shop that takes a listing down
    // has decided nobody should be looking at it, and a page that still
    // answers to a shared link is not down at all — a SOLD account still
    // resolves, because its buyer has the link in their own order history.
    where: {
      slug,
      deletedAt: null,
      productType: "ACCOUNT_GAME",
      status: { not: "HIDDEN" },
    },
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
    name: p.name ?? "",
    // The write-up, as running text, for the buy panel's blurb.
    descriptionText: p.description ? docHtmlToPlainText(p.description, 260) : "",
    slug: p.slug,
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
    vip: p.vip,
    vipIngame: p.vipIngame,
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
 * Whether this user has ever paid for this tool — any tier, any time. The
 * setup guide is written for someone with the tool in hand, and a paid order
 * is what puts it there; a refund or a cancellation does not count, and a
 * key that has since run out still does, because the guide is about the
 * tool, not the licence.
 */
export async function hasPaidOrderFor(
  userId: string,
  productCode: string,
): Promise<boolean> {
  const order = await db.order.findFirst({
    where: { userId, status: "PAID", product: { code: productCode } },
    select: { id: true },
  });
  return order !== null;
}

/**
 * A software product and everything its page prints.
 *
 * Found by slug, which is what the address carries: the code is what the shop
 * and its orders call the row, and is deliberately not in the URL. Filtered on
 * the type as well, so an account's slug answers null here rather than
 * rendering a tool page whose every field would be blank.
 */
export async function getSoftwareDetail(slug: string): Promise<SoftwareDetail | null> {
  const p = await db.product.findFirst({
    where: {
      slug,
      deletedAt: null,
      productType: "SOFTWARE_GAME",
      status: { not: "HIDDEN" },
    },
    include: {
      category: { select: { slug: true, name: true } },
      packages: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) return null;

  // Read once: the pill beside them is drawn or not depending on how many
  // there are.
  const badges = parseBadges(p.badge);

  return {
    code: p.code,
    slug: p.slug,
    // A shop that has not named the tool yet falls back to its code, which is
    // at least unique, rather than rendering an empty heading.
    name: p.name ?? p.code,
    description: p.description ?? "",
    // Empty when the product has none of its own; the page prints the shop's
    // default list in that case rather than nothing.
    features: parseFeatures(p.features),
    // Same rule for the requirements panel: empty means the shop's default.
    requirements: parseRequirements(p.requirements),
    // The write-up under the list; "" simply draws nothing after the bullets.
    featuresNote: p.featuresNote ?? "",
    // The two how-to blocks; "" prints each one's default sentence.
    guideHtml: p.guide ?? "",
    setupGuideHtml: p.setupGuide ?? "",
    softwareStatus: p.softwareStatus,
    // Resolved here rather than in the panel so the client never has to know
    // what the null in that column means.
    showStatus: showsStatusPill(p.showStatus, badges.length),
    // Null when the shop has promised no figure; the policy block prints the
    // line only when there is one to print.
    refundRate: p.refundRate,
    // Empty draws no pills at all.
    badges,
    images: p.images.length > 0 ? p.images.map((i) => i.url) : p.imageUrl ? [p.imageUrl] : [],
    videoUrl: p.videoUrl,
    packages: p.packages.map((pk) => ({
      id: pk.id,
      label: pk.label,
      price: Number(pk.price),
      durationHours: pk.durationHours,
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
      // The card builds its own address, and half of it is the category's.
      category: { select: { slug: true } },
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

/** One licence handed to this buyer, as their own order page shows it. */
export interface OrderKeyRow {
  value: string;
  expiresAt: Date | null;
  expired: boolean;
}

export interface OrderRow {
  code: string;
  status: string;
  total: number;
  createdAt: Date;
  productCode: string;
  productName: string;
  /** The product's canonical address, so the row opens the page it names. */
  productHref: string;
  isSoftware: boolean;
  productRank: string;
  imageUrl: string | null;
  /** The shelf the product sits on today — "Danh mục Hack PUBG" on the receipt. */
  categoryName: string;
  /** What the line cost before any discount, for the unit price column. */
  listPrice: number;
  /** Software only: the tier bought, and how many of it. */
  packageLabel: string | null;
  quantity: number;
  /** The keys themselves, and how many are still owed. */
  keys: OrderKeyRow[];
  keysPending: number;
  /** Software only: the tool's installer and its manual, as the product
   *  carries them today. Null hides that button; null for both hides the
   *  whole card. Withheld unless the order is a settled software order. */
  downloadUrl: string | null;
  docsUrl: string | null;
  /**
   * Accounts only: the sign-in the buyer was handed, or that they are still
   * waiting on. "none" for software and for orders that were never paid.
   */
  login: LoginHandover;
}

export async function getOrders(userId: string): Promise<OrderRow[]> {
  const now = new Date();
  const rows = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          code: true,
          slug: true,
          name: true,
          rank: true,
          imageUrl: true,
          productType: true,
          downloadUrl: true,
          docsUrl: true,
          category: { select: { slug: true, name: true } },
          // The one storefront read of these three columns, and it is scoped
          // by the `userId` above: only the buyer's own orders reach here, and
          // loginHandover shows nothing unless the order is PAID.
          loginUsername: true,
          loginPassword: true,
          loginNote: true,
          // Whose the row is now. An account re-listed and sold again keeps
          // its first order PAID; only the latest paid order reads the row.
          orders: {
            where: { status: "PAID" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
          // NFA goes out by itself; anything else is handed over in person.
          tags: { select: { label: true }, take: 1 },
        },
      },
      package: { select: { label: true } },
      // The buyer's copy of what they were given. Ordered so a multi-key order
      // reads in the sequence it was delivered.
      licenseKeys: {
        orderBy: { deliveredAt: "asc" },
        select: { value: true, expiresAt: true },
      },
    },
  });
  return rows.map((o) => ({
    code: o.code,
    status: o.status,
    total: Number(o.total),
    createdAt: o.createdAt,
    productCode: o.product.code,
    productName: o.product.name ?? o.product.code,
    // Built from the product's category as it stands now: an order is history,
    // but the link on it has to lead somewhere that exists today.
    productHref: productHref(o.product.category.slug, o.product.slug),
    isSoftware: o.product.productType === "SOFTWARE_GAME",
    productRank: o.product.rank,
    imageUrl: o.product.imageUrl,
    categoryName: o.product.category.name,
    listPrice: Number(o.listPrice),
    packageLabel: o.package?.label ?? null,
    quantity: o.quantity,
    keys: o.licenseKeys.map((k) => ({
      value: k.value,
      expiresAt: k.expiresAt,
      expired: k.expiresAt !== null && k.expiresAt < now,
    })),
    // What the sale promised, less what it handed over. An account order and
    // every software order from before the shop kept keys carry keysOwed 0,
    // so neither ever reads as waiting.
    keysPending:
      o.status === "PAID" ? Math.max(0, o.keysOwed - o.licenseKeys.length) : 0,
    // Handed over only with a settled software order. An account order has no
    // installer, and an unpaid one has bought nothing yet.
    downloadUrl:
      o.status === "PAID" && o.product.productType === "SOFTWARE_GAME"
        ? o.product.downloadUrl
        : null,
    docsUrl:
      o.status === "PAID" && o.product.productType === "SOFTWARE_GAME"
        ? o.product.docsUrl
        : null,
    login: loginHandover(o, {
      ...o.product,
      currentOrderId: currentOrderIdOf(o.product),
      tag: tagOf(o.product),
    }),
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
    include: {
      skins: { select: { kind: true, tier: true } },
      category: { select: { slug: true } },
    },
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
        href: productHref(p.category.slug, p.slug),
        imageUrl: p.imageUrl,
        rank: p.rank,
        vip: p.vip,
        vipIngame: p.vipIngame,
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
  rating: number;
  service: string;
  imageUrl: string | null;
  anonymous: boolean;
  verified: boolean;
  createdAt: Date;
}

/** Public reviews only — visitor submissions stay hidden until an admin
 *  approves them, so this is the one place the filter lives. Anonymous rows
 *  are masked here rather than in every component that renders one. */
export async function getFeedback(take = 20): Promise<ReviewRow[]> {
  const rows = await db.feedback.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((f) => ({
    name: f.anonymous ? "Khách hàng ẩn danh" : f.name,
    body: f.body,
    avatarUrl: f.anonymous ? null : f.avatarUrl,
    amount: Number(f.amount),
    rating: f.rating,
    service: f.service,
    imageUrl: f.imageUrl,
    anonymous: f.anonymous,
    verified: f.verified,
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

export interface AdminUserRow {
  id: string;
  uid: number;
  username: string;
  email: string | null;
  avatarUrl: string | null;
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
  /** The đại lý's negotiated percent; 0 unless role is AGENCY. */
  agencyPercent: number;
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
    avatarUrl: u.avatarUrl,
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
    agencyPercent: u.agencyPercent,
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
  scope: "ALL" | "CATEGORY" | "PRODUCT";
  /** "Tất cả sản phẩm", "Danh mục: X" or "N sản phẩm: A, B". */
  scopeLabel: string;
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
  const rows = await db.voucher.findMany({
    orderBy: { code: "asc" },
    take,
    include: {
      category: { select: { name: true } },
      products: {
        orderBy: { product: { code: "asc" } },
        select: { product: { select: { code: true, name: true } } },
      },
    },
  });
  return rows.map((v) => ({
    code: v.code,
    scope: v.scope,
    scopeLabel:
      v.scope === "CATEGORY"
        ? `Danh mục: ${v.category?.name ?? "(đã xoá)"}`
        : v.scope === "PRODUCT"
          ? v.products.length === 0
            ? "Sản phẩm: (đã xoá)"
            : `${v.products.length} sản phẩm: ${v.products
                .map((link) => link.product.name ?? link.product.code)
                .join(", ")}`
          : "Tất cả sản phẩm",
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
  avatarUrl: string | null;
  body: string;
  amount: number;
  verified: boolean;
  rating: number;
  service: string;
  imageUrl: string | null;
  anonymous: boolean;
  approved: boolean;
  /** Account that submitted it, when known — visitor rows carry one, seeds don't. */
  username: string | null;
  createdAt: Date;
}

/** The admin sees everything unmasked: pending rows first (they need action),
 *  real names on anonymous reviews, and which account submitted. */
export async function listFeedback(take = 200): Promise<AdminFeedbackRow[]> {
  const rows = await db.feedback.findMany({
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
    take,
    include: { user: { select: { username: true } } },
  });
  return rows.map((f) => ({
    id: f.id,
    name: f.name,
    avatarUrl: f.avatarUrl,
    body: f.body,
    amount: Number(f.amount),
    rating: f.rating,
    service: f.service,
    imageUrl: f.imageUrl,
    anonymous: f.anonymous,
    approved: f.approved,
    username: f.user?.username ?? null,
    verified: f.verified,
    createdAt: f.createdAt,
  }));
}

export interface AdminTopUpRow {
  code: string;
  username: string;
  avatarUrl: string | null;
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

/** Every live product, for pickers that name products: code, name, category. */
export async function listProductPicks() {
  const rows = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    select: { code: true, name: true, category: { select: { name: true } } },
  });
  return rows.map((p) => ({
    code: p.code,
    name: p.name ?? p.code,
    category: p.category.name,
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
    include: { user: { select: { username: true, avatarUrl: true } } },
  });
  return rows.map((t) => ({
    code: t.code,
    username: t.user.username,
    avatarUrl: t.user.avatarUrl,
    method: t.method,
    carrier: t.carrier,
    amount: Number(t.amount),
    status: t.status,
    createdAt: t.createdAt,
  }));
}
