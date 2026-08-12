import { db } from "@/lib/db";
import { extractTopUpCode, type IncomingTransfer } from "@/lib/topup";

function makeCode(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export type CreditResult =
  | { ok: true; code: string; username: string; amount: number; balance: number }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_HANDLED" | "AMOUNT_MISMATCH"; detail?: string };

/**
 * Moves a pending top-up to COMPLETED and credits the wallet.
 *
 * The status change is a conditional update inside the same transaction as the
 * balance and the ledger row, so whoever gets there first wins and everyone
 * else is a no-op: two admins on the same queue, a webhook racing a manual
 * click, or a provider replaying the same transfer all credit exactly once.
 *
 * `expectAmount` is the amount that actually arrived. When it is supplied and
 * does not match the request, nothing is credited — a transfer of a different
 * size is a question for a human, not something to guess at.
 */
export async function creditTopUp(
  code: string,
  options: { expectAmount?: number; note?: string } = {},
): Promise<CreditResult> {
  const topUp = await db.topUp.findUnique({
    where: { code },
    include: { user: { select: { username: true } } },
  });
  if (!topUp) return { ok: false, reason: "NOT_FOUND" };
  if (topUp.status !== "PENDING") return { ok: false, reason: "ALREADY_HANDLED" };

  if (
    options.expectAmount !== undefined &&
    BigInt(options.expectAmount) !== topUp.amount
  ) {
    return {
      ok: false,
      reason: "AMOUNT_MISMATCH",
      detail: `Chuyển ${options.expectAmount.toLocaleString("vi-VN")}đ nhưng lệnh nạp là ${topUp.amount.toLocaleString("vi-VN")}đ`,
    };
  }

  const balance = await db
    .$transaction(async (tx) => {
      const claimed = await tx.topUp.updateMany({
        where: { id: topUp.id, status: "PENDING" },
        data: { status: "COMPLETED" },
      });
      if (claimed.count === 0) throw new Error("ALREADY_HANDLED");

      const current = await tx.user.findUniqueOrThrow({ where: { id: topUp.userId } });
      const balanceAfter = current.balance + topUp.amount;

      await tx.user.update({
        where: { id: topUp.userId },
        data: { balance: balanceAfter },
      });

      await tx.transaction.create({
        data: {
          code: makeCode("GD"),
          userId: topUp.userId,
          kind: "TOPUP",
          status: "SUCCESS",
          delta: topUp.amount,
          balanceAfter,
          description: `Nạp tiền vào ví · ${topUp.code}`,
          method: options.note ?? (topUp.method === "CARD" ? "Thẻ Cào" : "Ngân Hàng"),
        },
      });

      return balanceAfter;
    })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message === "ALREADY_HANDLED") return null;
      throw error;
    });

  if (balance === null) return { ok: false, reason: "ALREADY_HANDLED" };

  return {
    ok: true,
    code: topUp.code,
    username: topUp.user.username,
    amount: Number(topUp.amount),
    balance: Number(balance),
  };
}

export interface MatchReport {
  matched: number;
  skipped: number;
  details: string[];
}

/**
 * Runs a batch of incoming transfers against the pending requests.
 *
 * Anything without a recognisable code, or with an amount that does not match,
 * is left alone and reported — those are the transfers a human still has to
 * look at, and silently dropping them would hide a customer's money.
 */
export async function applyTransfers(
  transfers: IncomingTransfer[],
  note: string,
): Promise<MatchReport> {
  const report: MatchReport = { matched: 0, skipped: 0, details: [] };

  for (const transfer of transfers) {
    const code = extractTopUpCode(transfer.description);
    if (!code) {
      report.skipped += 1;
      report.details.push(`Không thấy mã nạp trong "${transfer.description.slice(0, 60)}"`);
      continue;
    }

    const result = await creditTopUp(code, { expectAmount: transfer.amount, note });
    if (result.ok) {
      report.matched += 1;
      report.details.push(`${code}: cộng ${result.amount.toLocaleString("vi-VN")}đ cho ${result.username}`);
    } else {
      report.skipped += 1;
      report.details.push(`${code}: ${result.detail ?? result.reason}`);
    }
  }

  return report;
}
