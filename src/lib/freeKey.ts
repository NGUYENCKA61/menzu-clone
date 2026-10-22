import "server-only";

import type { Prisma } from "@prisma/client";

import { announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import {
  FREE_CLAIM_GAP_MS,
  FREE_CLAIM_TTL_MS,
  type FreeToolPanel,
  freePackageOf,
  freeWaitWording,
  nextFreeClaimAt,
} from "@/lib/freeKeyRules";
import { deliverKeys } from "@/lib/licenseKeys";
import { productHref } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";
import { makeShortCode } from "@/lib/shortCode";
import { shortenUrl, shortlinkConfigured } from "@/lib/shortlink";
import { isSalesLocked } from "@/lib/softwareStatus";

/**
 * A free tool's key, the way the owner wants it handed out (12/10/2026): the
 * customer presses "Lấy key" on the tool's page, is sent through the shop's
 * paid shortlink, and lands back here with a ticket whose id only that link
 * knew. The landing claims the ticket: an order like any other, total 0,
 * one key from the free tier delivered into it, so the key sits in Lịch sử
 * mua with the download link and the receipt. One key per account per tool
 * per day. No shortlink configured: the press itself claims, for testing
 * and for a shop that has not set one up.
 */

const CLAIM_SELECT = {
  id: true,
  userId: true,
  productId: true,
  shortUrl: true,
  expiresAt: true,
  claimedAt: true,
  order: {
    select: { code: true, licenseKeys: { select: { value: true }, take: 1 } },
  },
  product: {
    select: {
      code: true,
      name: true,
      slug: true,
      status: true,
      softwareStatus: true,
      soldCount: true,
      category: { select: { slug: true } },
      packages: {
        select: { id: true, price: true, label: true, durationHours: true },
      },
    },
  },
} as const;

export type FreeKeyOutcome =
  | { state: "link"; claimId: string; shortUrl: string }
  | {
      state: "claimed";
      claimId: string;
      userId: string;
      key: string | null;
      orderCode: string;
      productName: string;
      productHref: string;
    }
  | { state: "missing" }
  | { state: "expired"; productHref: string | null }
  /** Another ticket of this account took the tool's key within the day. */
  | { state: "wait"; until: string; productHref: string }
  /** The tool stopped handing keys out between the press and the landing. */
  | { state: "closed"; reason: string; productHref: string };

/** The free tier of a product row, with prices as numbers. */
function freeTier(product: {
  packages: {
    id: string;
    price: bigint;
    label: string;
    durationHours: number | null;
  }[];
}) {
  return freePackageOf(
    product.packages.map((p) => ({ ...p, price: Number(p.price) })),
  );
}

/**
 * When this account may next take the tool's key, given another ticket of
 * theirs spent within the day; null when none was. Asked inside the claiming
 * transaction too, so two tickets of one account (two tabs, a link passed
 * twice) do not both turn into keys.
 */
async function nextClaimAfterOthers(
  tx: Pick<Prisma.TransactionClient, "freeKeyClaim">,
  claim: { id: string; userId: string; productId: string },
  now: Date,
): Promise<Date | null> {
  const other = await tx.freeKeyClaim.findFirst({
    where: {
      userId: claim.userId,
      productId: claim.productId,
      id: { not: claim.id },
      claimedAt: { gte: new Date(now.getTime() - FREE_CLAIM_GAP_MS) },
    },
    orderBy: { claimedAt: "desc" },
    select: { claimedAt: true },
  });
  return other?.claimedAt
    ? new Date(other.claimedAt.getTime() + FREE_CLAIM_GAP_MS)
    : null;
}

/** What a free tool's page needs to draw its panel for this reader. */
export async function freeToolPanel(
  code: string,
  href: string,
  userId: string | null,
): Promise<FreeToolPanel> {
  const [settings, row] = await Promise.all([
    getShopSettings(),
    db.product.findUnique({
      where: { code },
      select: { id: true, downloadUrl: true },
    }),
  ]);
  const today =
    userId && row
      ? await db.freeKeyClaim.findFirst({
          where: {
            userId,
            productId: row.id,
            claimedAt: { gte: new Date(Date.now() - FREE_CLAIM_GAP_MS) },
          },
          orderBy: { claimedAt: "desc" },
          select: {
            claimedAt: true,
            order: {
              select: {
                code: true,
                licenseKeys: { select: { value: true }, take: 1 },
              },
            },
          },
        })
      : null;
  return {
    signedIn: userId !== null,
    loginHref: `/login?next=${encodeURIComponent(href)}`,
    gated: shortlinkConfigured(settings),
    downloadUrl: row?.downloadUrl ?? null,
    today:
      today?.order && today.claimedAt
        ? {
            orderCode: today.order.code,
            key: today.order.licenseKeys[0]?.value ?? null,
            until: new Date(
              today.claimedAt.getTime() + FREE_CLAIM_GAP_MS,
            ).toISOString(),
          }
        : null,
  };
}

/**
 * "Lấy key" pressed: a ticket, and either the shortlink to pass or, with no
 * shortlink set up, the key straight away. Throws coded errors for the
 * route to word (freeKeyFailure).
 */
export async function startFreeClaim(
  userId: string,
  code: string,
): Promise<FreeKeyOutcome> {
  const product = await db.product.findFirst({
    where: { code: code.trim(), deletedAt: null },
    select: {
      id: true,
      status: true,
      productType: true,
      softwareStatus: true,
      packages: {
        select: { id: true, price: true, label: true, durationHours: true },
      },
    },
  });
  if (!product || product.productType !== "SOFTWARE_GAME")
    throw new Error("NOT_FOUND");
  if (product.status !== "AVAILABLE") throw new Error("OFF_SHELF");
  if (isSalesLocked(product.softwareStatus)) throw new Error("LOCKED");
  const tier = freeTier(product);
  if (!tier) throw new Error("NOT_FREE");
  const available = await db.licenseKey.count({
    where: { packageId: tier.id, status: "AVAILABLE" },
  });
  if (available === 0) throw new Error("OUT_OF_KEYS");

  const now = new Date();
  const last = await db.freeKeyClaim.findFirst({
    where: { userId, productId: product.id, claimedAt: { not: null } },
    orderBy: { claimedAt: "desc" },
    select: { claimedAt: true },
  });
  const wait = nextFreeClaimAt(last?.claimedAt ?? null, now);
  if (wait) throw new Error(`WAIT:${wait.toISOString()}`);

  const settings = await getShopSettings();
  const gated = shortlinkConfigured(settings);

  // A ticket still good from a minute ago: the same link again, not a second
  // shortlink minted for the same press.
  const pending = await db.freeKeyClaim.findFirst({
    where: {
      userId,
      productId: product.id,
      claimedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, shortUrl: true },
  });
  if (gated && pending?.shortUrl)
    return { state: "link", claimId: pending.id, shortUrl: pending.shortUrl };

  const claim =
    pending ??
    (await db.freeKeyClaim.create({
      data: {
        userId,
        productId: product.id,
        expiresAt: new Date(now.getTime() + FREE_CLAIM_TTL_MS),
      },
      select: { id: true, shortUrl: true },
    }));
  if (!gated) return completeFreeClaim(claim.id);

  const shortened = await shortenUrl(
    absoluteUrl(`/free-key/${claim.id}`),
    settings,
  );
  if (!shortened.ok) {
    // The customer reads one sentence; the log keeps the reason.
    console.error("[free-key] shortlink refused:", shortened.error);
    throw new Error(`SHORTLINK:${shortened.error}`);
  }
  await db.freeKeyClaim.update({
    where: { id: claim.id },
    data: { shortUrl: shortened.url },
  });
  return { state: "link", claimId: claim.id, shortUrl: shortened.url };
}

/**
 * The landing: the ticket is spent on an order with one key. Idempotent —
 * a second visit shows the same key — and safe against two visits at once,
 * since the ticket is stamped inside the transaction that delivers the key.
 */
export async function completeFreeClaim(
  claimId: string,
): Promise<FreeKeyOutcome> {
  const claim = await db.freeKeyClaim.findUnique({
    where: { id: claimId },
    select: CLAIM_SELECT,
  });
  if (!claim) return { state: "missing" };
  const href = productHref(claim.product.category.slug, claim.product.slug);
  if (claim.claimedAt && claim.order) {
    return {
      state: "claimed",
      claimId: claim.id,
      userId: claim.userId,
      key: claim.order.licenseKeys[0]?.value ?? null,
      orderCode: claim.order.code,
      productName: claim.product.name ?? claim.product.code,
      productHref: href,
    };
  }
  if (claim.expiresAt.getTime() < Date.now())
    return { state: "expired", productHref: href };
  const tier = freeTier(claim.product);
  const shut = !tier
    ? "NOT_FREE"
    : claim.product.status !== "AVAILABLE"
      ? "OFF_SHELF"
      : isSalesLocked(claim.product.softwareStatus)
        ? "LOCKED"
        : null;
  if (shut || !tier) {
    return {
      state: "closed",
      reason: freeKeyFailure(new Error(shut ?? "NOT_FREE")).error,
      productHref: href,
    };
  }

  const now = new Date();
  let made: { orderCode: string; key: string | null } | { until: Date } | null;
  try {
    made = await db.$transaction(async (tx) => {
      const until = await nextClaimAfterOthers(tx, claim, now);
      if (until) return { until };
      // The ticket first: whoever stamps it delivers; the other visit re-reads.
      const stamped = await tx.freeKeyClaim.updateMany({
        where: { id: claim.id, claimedAt: null },
        data: { claimedAt: now },
      });
      if (stamped.count === 0) return null;

      const order = await tx.order.create({
        data: {
          code: makeShortCode("DH"),
          userId: claim.userId,
          productId: claim.productId,
          packageId: tier.id,
          quantity: 1,
          keysOwed: 1,
          method: "BUY_NOW",
          status: "PAID",
          listPrice: 0n,
          discountPct: 0,
          voucherCut: 0n,
          total: 0n,
        },
        select: { id: true, code: true },
      });
      const delivered = await deliverKeys(tx, {
        packageId: tier.id,
        orderId: order.id,
        userId: claim.userId,
        wanted: 1,
      });
      if (delivered < 1) throw new Error("OUT_OF_KEYS");
      await tx.freeKeyClaim.update({
        where: { id: claim.id },
        data: { orderId: order.id },
      });
      await tx.product.update({
        where: { id: claim.productId },
        data: { soldCount: { increment: 1 } },
      });
      const key = await tx.licenseKey.findFirst({
        where: { orderId: order.id },
        select: { value: true },
      });
      return { orderCode: order.code, key: key?.value ?? null };
    });
  } catch (error) {
    // The pool ran dry between the press and the landing: the transaction
    // rolled back, the ticket is still good, the page says so.
    if (error instanceof Error && error.message === "OUT_OF_KEYS") {
      return {
        state: "closed",
        reason: freeKeyFailure(error).error,
        productHref: href,
      };
    }
    throw error;
  }

  if (!made) return completeFreeClaim(claimId);
  if ("until" in made) {
    return {
      state: "wait",
      until: made.until.toISOString(),
      productHref: href,
    };
  }

  const name = claim.product.name ?? claim.product.code;
  await announceToUser(claim.userId, {
    title: "Bạn đã nhận key miễn phí",
    body: `${name}: key ${tier.label} đã nằm trong Lịch sử mua hàng, kèm link tải và tài liệu.`,
    type: "GIFT",
    cta: { label: "Xem key", href: "/orders" },
  });
  return {
    state: "claimed",
    claimId: claim.id,
    userId: claim.userId,
    key: made.key,
    orderCode: made.orderCode,
    productName: name,
    productHref: href,
  };
}

/** Where a ticket stands, for the page that waits on the shortlink. */
export async function freeClaimStatus(
  claimId: string,
  userId: string,
): Promise<FreeKeyOutcome> {
  const claim = await db.freeKeyClaim.findUnique({
    where: { id: claimId },
    select: CLAIM_SELECT,
  });
  if (!claim || claim.userId !== userId) return { state: "missing" };
  const href = productHref(claim.product.category.slug, claim.product.slug);
  if (claim.claimedAt && claim.order) {
    return {
      state: "claimed",
      claimId: claim.id,
      userId: claim.userId,
      key: claim.order.licenseKeys[0]?.value ?? null,
      orderCode: claim.order.code,
      productName: claim.product.name ?? claim.product.code,
      productHref: href,
    };
  }
  if (claim.expiresAt.getTime() < Date.now())
    return { state: "expired", productHref: href };
  const until = await nextClaimAfterOthers(db, claim, new Date());
  if (until)
    return { state: "wait", until: until.toISOString(), productHref: href };
  return { state: "link", claimId: claim.id, shortUrl: claim.shortUrl ?? "" };
}

/** The route's words and status for a coded failure. */
export function freeKeyFailure(error: unknown): {
  error: string;
  status: number;
} {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "NOT_FOUND")
    return { error: "Không thấy tool này", status: 404 };
  if (message === "OFF_SHELF")
    return { error: "Tool đang ngừng phát", status: 400 };
  if (message === "LOCKED")
    return {
      error: "Tool đang khoá chờ bản mới, chưa lấy key được",
      status: 400,
    };
  if (message === "NOT_FREE")
    return { error: "Tool này không miễn phí", status: 400 };
  if (message === "OUT_OF_KEYS")
    return {
      error: "Hết key miễn phí, shop sẽ nạp thêm, bạn quay lại sau",
      status: 409,
    };
  if (message.startsWith("WAIT:")) {
    return { error: freeWaitWording(new Date(message.slice(5))), status: 429 };
  }
  if (message.startsWith("SHORTLINK:")) {
    return {
      error: "Dịch vụ link rút gọn đang lỗi, thử lại sau ít phút",
      status: 502,
    };
  }
  return { error: "Có lỗi, thử lại sau", status: 500 };
}
