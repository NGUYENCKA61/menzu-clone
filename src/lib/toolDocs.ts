import "server-only";

import { db } from "@/lib/db";
import { docsAccessFrom, type DocsAccess } from "@/lib/docsAccess";
import { LISTED_PRODUCT } from "@/lib/queries";
import {
  parseRequirements,
  type ProductRequirement,
} from "@/lib/productRequirements";

/**
 * The documentation area (the owner, 12/10/2026: "Thêm 1 trang tài liệu cho
 * khách hàng như lmarket"): one page per tool, grouped by game like
 * docs.lmarket.net, open for as long as the buyer's key says
 * (lib/docsAccess.ts). What a page prints is the tool's own guide, setup
 * guide, requirements and download, as the admin wrote them in the tool
 * editor; nothing is authored twice.
 */

/** Who is reading: the account and its role, or nobody. */
export type DocsViewer = { id: string; role: string } | null;

function accessOf(
  viewer: DocsViewer,
  orders: { createdAt: Date; durationHours: number | null }[],
): DocsAccess {
  if (!viewer) return { state: "guest", until: null };
  // The shop's own admins read everything: they wrote it.
  if (viewer.role === "ADMIN") return { state: "open", until: null };
  return docsAccessFrom(orders);
}

/** The reader's standing with one tool's docs, by the tool's code. */
export async function toolDocsAccess(
  viewer: DocsViewer,
  productCode: string,
): Promise<DocsAccess> {
  if (!viewer) return accessOf(viewer, []);
  const orders = await db.order.findMany({
    where: {
      userId: viewer.id,
      status: "PAID",
      product: { code: productCode },
    },
    select: { createdAt: true, package: { select: { durationHours: true } } },
  });
  return accessOf(
    viewer,
    orders.map((o) => ({
      createdAt: o.createdAt,
      durationHours: o.package?.durationHours ?? null,
    })),
  );
}

/** The reader's standing with every tool at once, for the landing page. */
export async function toolDocsAccessMap(
  viewer: DocsViewer,
): Promise<Map<string, DocsAccess>> {
  const map = new Map<string, DocsAccess>();
  if (!viewer) return map;
  const orders = await db.order.findMany({
    where: {
      userId: viewer.id,
      status: "PAID",
      product: { productType: "SOFTWARE_GAME" },
    },
    select: {
      productId: true,
      createdAt: true,
      package: { select: { durationHours: true } },
    },
  });
  const byProduct = new Map<
    string,
    { createdAt: Date; durationHours: number | null }[]
  >();
  for (const o of orders) {
    const list = byProduct.get(o.productId) ?? [];
    list.push({
      createdAt: o.createdAt,
      durationHours: o.package?.durationHours ?? null,
    });
    byProduct.set(o.productId, list);
  }
  for (const [productId, list] of byProduct) {
    map.set(productId, accessOf(viewer, list));
  }
  return map;
}

export interface ToolDocsIndexTool {
  id: string;
  slug: string;
  code: string;
  name: string;
}

export interface ToolDocsIndexCategory {
  slug: string;
  name: string;
  logoUrl: string | null;
  imageUrl: string | null;
  tools: ToolDocsIndexTool[];
}

/** Every game with tools on sale, and its tools, for the sidebar and the landing. */
export async function listToolDocsIndex(): Promise<ToolDocsIndexCategory[]> {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      logoUrl: true,
      imageUrl: true,
      products: {
        where: { ...LISTED_PRODUCT, productType: "SOFTWARE_GAME" },
        orderBy: { createdAt: "asc" },
        select: { id: true, slug: true, code: true, name: true },
      },
    },
  });
  return categories
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      logoUrl: c.logoUrl,
      imageUrl: c.imageUrl,
      tools: c.products.map((p) => ({
        id: p.id,
        slug: p.slug,
        code: p.code,
        name: p.name ?? p.code,
      })),
    }));
}

export interface ToolDocs {
  id: string;
  code: string;
  slug: string;
  name: string;
  summary: string;
  imageUrl: string | null;
  softwareStatus: string | null;
  categorySlug: string;
  categoryName: string;
  requirements: ProductRequirement[];
  /** As stored: editor HTML, or the legacy plain sentence; "" for none. */
  guide: string;
  setupGuide: string;
  downloadUrl: string | null;
  downloadName: string | null;
  /** The admin's external manual, if one was pasted beside the download. */
  docsUrl: string | null;
  /** The tiers and their lengths, so the page can say what each one opens. */
  packages: { label: string; durationHours: number | null }[];
}

/** One tool's page, by its slug; null for anything not a listed tool. */
export async function getToolDocs(slug: string): Promise<ToolDocs | null> {
  const p = await db.product.findFirst({
    where: { slug, ...LISTED_PRODUCT, productType: "SOFTWARE_GAME" },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      summary: true,
      imageUrl: true,
      softwareStatus: true,
      requirements: true,
      guide: true,
      setupGuide: true,
      downloadUrl: true,
      downloadName: true,
      docsUrl: true,
      category: { select: { slug: true, name: true } },
      packages: {
        orderBy: { sortOrder: "asc" },
        select: { label: true, durationHours: true },
      },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    code: p.code,
    slug: p.slug,
    name: p.name ?? p.code,
    summary: p.summary ?? "",
    imageUrl: p.imageUrl,
    softwareStatus: p.softwareStatus,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    requirements: parseRequirements(p.requirements),
    guide: p.guide ?? "",
    setupGuide: p.setupGuide ?? "",
    downloadUrl: p.downloadUrl,
    downloadName: p.downloadName,
    docsUrl: p.docsUrl,
    packages: p.packages,
  };
}
