import "server-only";

import { db } from "@/lib/db";
import { categoryHref, productHref } from "@/lib/routes";
import {
  readSoftwareStatus,
  type SoftwareStatusValue,
} from "@/lib/softwareStatus";

/**
 * "Thông báo trạng thái hack": a tool's detection history, and who follows
 * which tool.
 *
 * Every change the admin makes to `softwareStatus` leaves a row in
 * software_status_events (the admin route writes it in the same transaction
 * as the change). The status tab of /thong-bao lists them all; the bell
 * lists only the ones for tools the reader has subscribed to.
 */

export interface StatusEventRow {
  id: string;
  status: SoftwareStatusValue;
  at: Date;
  /**
   * One tool, or a whole category changed at once. A category row stands
   * for every tool's row in that batch: its name and link are the
   * category's, and `toolCount` says how many tools moved.
   */
  scope: "tool" | "category";
  toolCount: number;
  productId: string;
  productCode: string;
  productName: string;
  productHref: string;
  categoryName: string;
  /** A picture pinned to this change — a screenshot, a changelog shot. */
  imageUrl: string | null;
  /** The shop's own words for this change, when it wrote any. */
  note: string | null;
  /** "admin", "telegram" … — where the change came from. */
  source: string | null;
}

export interface StatusTool {
  id: string;
  code: string;
  name: string;
  href: string;
  categoryName: string;
  /** Its category's half of the address — the shelf this tool sits on. */
  categorySlug: string;
  imageUrl: string | null;
  status: SoftwareStatusValue | null;
  /** When the state last changed; null for a tool with no history yet. */
  changedAt: Date | null;
}

const EVENT_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  imageUrl: true,
  note: true,
  source: true,
  batchId: true,
  category: { select: { name: true, slug: true } },
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      category: { select: { name: true, slug: true } },
    },
  },
} as const;

type RawEvent = {
  id: string;
  status: string;
  createdAt: Date;
  imageUrl: string | null;
  note: string | null;
  source: string | null;
  batchId: string | null;
  category: { name: string; slug: string } | null;
  product: {
    id: string;
    code: string;
    name: string | null;
    slug: string;
    category: { name: string; slug: string };
  };
};

function toRow(e: RawEvent): StatusEventRow | null {
  const status = readSoftwareStatus(e.status);
  if (!status) return null;
  return {
    id: e.id,
    status,
    at: e.createdAt,
    scope: "tool",
    toolCount: 1,
    productId: e.product.id,
    productCode: e.product.code,
    productName: e.product.name ?? e.product.code,
    productHref: productHref(e.product.category.slug, e.product.slug),
    categoryName: e.product.category.name,
    imageUrl: e.imageUrl,
    note: e.note,
    source: e.source,
  };
}

/**
 * The rows of one batch folded into a single category row.
 *
 * A game patched flips every tool on its shelf in one go, and the desk
 * announces it once; the history should read the same way. The rows still
 * exist one per tool — the product page shows its own — but here they fold
 * into "HACK CS2 · cả danh mục (5 tool)", linked to the shelf, keyed by the
 * batch so a browser's dismissal of the bell row sticks.
 */
function collapseBatches(rows: RawEvent[]): StatusEventRow[] {
  const out: StatusEventRow[] = [];
  const seen = new Map<string, StatusEventRow>();
  for (const raw of rows) {
    if (!raw.batchId || !raw.category) {
      const row = toRow(raw);
      if (row) out.push(row);
      continue;
    }
    const open = seen.get(raw.batchId);
    if (open) {
      open.toolCount += 1;
      open.productName = `${raw.category.name} · cả danh mục (${open.toolCount} tool)`;
      continue;
    }
    const first = toRow(raw);
    if (!first) continue;
    const row: StatusEventRow = {
      ...first,
      id: raw.batchId,
      scope: "category",
      toolCount: 1,
      productName: `${raw.category.name} · cả danh mục (1 tool)`,
      productHref: categoryHref(raw.category.slug),
      categoryName: raw.category.name,
    };
    seen.set(raw.batchId, row);
    out.push(row);
  }
  return out;
}

/** Every live tool's history, newest first — the public tab. */
export async function listStatusEvents(take = 60): Promise<StatusEventRow[]> {
  const rows = await db.softwareStatusEvent.findMany({
    where: { product: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take,
    select: EVENT_SELECT,
  });
  return collapseBatches(rows);
}

/** History of the tools this reader follows — what the bell shows. */
export async function subscribedStatusEvents(
  userId: string,
  take = 20,
): Promise<StatusEventRow[]> {
  const rows = await db.softwareStatusEvent.findMany({
    where: {
      product: { deletedAt: null, statusSubscribers: { some: { userId } } },
    },
    orderBy: { createdAt: "desc" },
    take,
    select: EVENT_SELECT,
  });
  return collapseBatches(rows);
}

/** The tools this reader follows, by product id. */
export async function subscribedProductIds(userId: string): Promise<Set<string>> {
  const rows = await db.softwareStatusSubscription.findMany({
    where: { userId },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
}

export async function isStatusSubscribed(
  userId: string,
  productCode: string,
): Promise<boolean> {
  const row = await db.softwareStatusSubscription.findFirst({
    where: { userId, product: { code: productCode } },
    select: { productId: true },
  });
  return row !== null;
}

/** The live tools with the state each holds now, for the subscribe list. */
export async function listSoftwareForStatus(): Promise<StatusTool[]> {
  const rows = await db.product.findMany({
    where: { productType: "SOFTWARE_GAME", deletedAt: null, status: "AVAILABLE" },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      imageUrl: true,
      softwareStatus: true,
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name ?? p.code,
    href: productHref(p.category.slug, p.slug),
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    imageUrl: p.images[0]?.url ?? p.imageUrl,
    status: readSoftwareStatus(p.softwareStatus),
    changedAt: p.statusEvents[0]?.createdAt ?? null,
  }));
}
