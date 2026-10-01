import "server-only";

import type { Prisma } from "@prisma/client";

import { absoluteUrl } from "@/lib/seo";
import { pointsForSpend } from "@/lib/spin";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";
import { makeCode } from "@/lib/topupStore";
import { creditWallet } from "@/lib/wallet";

/**
 * Money back on one order, inside the caller's transaction — the refund desk's
 * approval and the warranty desk's refund both end here, so the two can never
 * settle an order differently.
 *
 * The order stops reading "Đã thanh toán" in the same transaction that pays
 * the money back: an order still marked paid beside a settled refund is the
 * pair of facts that starts an argument. The update is conditional, so an
 * order already REFUNDED cannot be paid back twice — it throws
 * ALREADY_REFUNDED and the caller's transaction rolls back.
 *
 * The spins the spending bought go back with the money; otherwise a
 * buy-and-refund is a free wheel. GREATEST rather than a plain decrement: the
 * points may already be spun away, and an account at minus fifty could not
 * spin until it bought its way back to zero. One statement, so a spin
 * settling at the same instant cannot slip between a read and a write.
 *
 * WALLET credits the balance (incremented by the database, not computed from
 * a figure read a moment ago) and writes the ledger line; MANUAL moved the
 * money outside the site, so there is nothing more to record here.
 */
export async function settleRefund(
  tx: Prisma.TransactionClient,
  refund: {
    orderId: string;
    orderCode: string;
    orderTotal: number;
    userId: string;
    amount: bigint;
    method: "WALLET" | "MANUAL";
  },
): Promise<void> {
  const settled = await tx.order.updateMany({
    where: { id: refund.orderId, status: "PAID" },
    data: { status: "REFUNDED" },
  });
  if (settled.count === 0) throw new Error("ALREADY_REFUNDED");

  const earned = pointsForSpend(refund.orderTotal);
  if (earned > 0) {
    await tx.$executeRaw`UPDATE "users" SET "points" = GREATEST("points" - ${earned}, 0) WHERE "id" = ${refund.userId}`;
  }

  if (refund.method !== "WALLET") return;

  const balanceAfter = await creditWallet(tx, refund.userId, refund.amount);
  await tx.transaction.create({
    data: {
      code: makeCode("GD"),
      userId: refund.userId,
      kind: "REFUND",
      status: "SUCCESS",
      delta: refund.amount,
      balanceAfter,
      description: `Hoàn tiền đơn ${refund.orderCode}`,
      method: "Hoàn vào ví",
    },
  });
}

/**
 * One account, sold once, refunded, and still marked sold: nobody can buy it
 * and nothing says so. Not put back on the shelf automatically — the buyer has
 * seen the password, so relisting starts with a password change — this only
 * makes sure somebody is asked to make that call.
 */
export async function warnRefundedAccount(
  product: { code: string; name: string | null; status: string; productType: string; accountPool: boolean },
  orderCode: string,
): Promise<void> {
  if (product.productType !== "ACCOUNT_GAME" || product.accountPool || product.status !== "SOLD") return;
  await notifyTelegramAdmins(
    [
      "♻️ <b>Acc đã hoàn tiền, vẫn đang “Đã bán”</b>",
      escapeTelegramHtml(`#${product.code} - ${product.name ?? product.code} · đơn ${orderCode}`),
      "Khách đã biết mật khẩu: đổi mật khẩu rồi mới mở bán lại.",
      `🔗 ${absoluteUrl(`/admin/products/${product.code}`)}`,
    ].join("\n"),
  );
}
