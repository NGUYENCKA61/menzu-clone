import { announceToAdmins, announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import { liftTierFor } from "@/lib/tierLift";
import { commissionFor } from "@/lib/referral";
import { makeShortCode } from "@/lib/shortCode";
import { notifyTopUpOnTelegram } from "@/lib/telegramShop";
import { getShopSettings } from "@/lib/settingsStore";
import { creditWallet } from "@/lib/wallet";
import {
  autoCreditVerdict,
  cardNet,
  creditLine,
  extractTopUpCode,
  heldNotice,
  mismatchNotice,
  TOPUP_EXPIRY_MINUTES,
  type IncomingTransfer,
} from "@/lib/topup";

/** Ledger codes ("GD…"); exported for the commission-withdraw route. */
export const makeCode = makeShortCode;

/**
 * Retires requests nobody paid.
 *
 * Cheap enough to run on every reconciliation pass: one indexed UPDATE that
 * usually touches no rows. Expiring is only about the queue being readable —
 * `creditTopUp` still honours an expired request, so a late transfer is not
 * punished for arriving late.
 */
export async function expireStaleTopUps(): Promise<number> {
  const cutoff = new Date(Date.now() - TOPUP_EXPIRY_MINUTES * 60 * 1000);
  const result = await db.topUp.updateMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

export type CreditResult =
  | {
      ok: true;
      code: string;
      username: string;
      /** What the wallet was credited — the transfer's figure, not the request's. */
      amount: number;
      /** What the request asked for. Differs from `amount` on a mismatch. */
      requested: number;
      balance: number;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "ALREADY_HANDLED" | "INVALID_AMOUNT" | "AMOUNT_SUSPECT";
      detail?: string;
      /** On AMOUNT_SUSPECT: the figures a human now has to look at. */
      held?: { requested: number; received: number; username: string };
    };

/**
 * Moves a pending top-up to COMPLETED and credits the wallet.
 *
 * The status change is a conditional update inside the same transaction as the
 * balance and the ledger row, so whoever gets there first wins and everyone
 * else is a no-op: two admins on the same queue, a webhook racing a manual
 * click, or a provider replaying the same transfer all credit exactly once.
 *
 * `expectAmount` is the amount that actually arrived. When it differs from
 * the request, the wallet is credited with what arrived — the customer's
 * money is the customer's money, short or over — the request is rewritten to
 * that figure (so the tier, the referral cut and every report are earned from
 * real money), the ledger line carries both figures, and both sides are told.
 * Only an implausible figure — under the floor, or beyond twice the request —
 * is held for a human. Left out, as when an admin approves by hand without
 * saying otherwise, the request's own figure is credited.
 *
 * `byHand` is that human: an admin who has read the statement and typed the
 * figure that arrived. The band is theirs to overrule, and the desk is not
 * told about a mismatch it just entered itself.
 */
export async function creditTopUp(
  code: string,
  options: { expectAmount?: number; note?: string; byHand?: boolean } = {},
): Promise<CreditResult> {
  const topUp = await db.topUp.findUnique({
    where: { code },
    include: { user: { select: { username: true } } },
  });
  if (!topUp) return { ok: false, reason: "NOT_FOUND" };
  // EXPIRED counts as claimable: the request left the queue because nobody had
  // paid it yet, not because the shop refused it. A transfer arriving late is
  // still that customer's money.
  if (topUp.status !== "PENDING" && topUp.status !== "EXPIRED") {
    return { ok: false, reason: "ALREADY_HANDLED", detail: "đã xử lý trước đó" };
  }

  const requested = Number(topUp.amount);
  let received = topUp.amount;
  // A scratch card is worth its face value to the desk that redeems it, and
  // less than that to the wallet: whoever cashes the card keeps a percent.
  // The rate is read here, at the moment of crediting, so a card sitting in
  // the queue is settled at the rate the shop publishes now — the same figure
  // the customer was shown on the form.
  let cardKept = 0;
  if (topUp.method === "CARD") {
    const settings = await getShopSettings();
    const net = cardNet(requested, settings.topUpCardRates, settings.topUpCardFee);
    cardKept = requested - net;
    received = BigInt(net);
  }
  if (options.expectAmount !== undefined) {
    if (!Number.isFinite(options.expectAmount) || options.expectAmount <= 0) {
      return { ok: false, reason: "INVALID_AMOUNT", detail: "số tiền không hợp lệ" };
    }
    const verdict = options.byHand ? "ok" : autoCreditVerdict(requested, options.expectAmount);
    if (verdict !== "ok") {
      return {
        ok: false,
        reason: "AMOUNT_SUSPECT",
        detail: `nhận ${options.expectAmount.toLocaleString("vi-VN")}đ cho lệnh ${requested.toLocaleString("vi-VN")}đ — ${
          verdict === "too-small" ? "quá nhỏ" : "quá lớn"
        }, cần người duyệt`,
        held: {
          requested,
          received: Math.trunc(options.expectAmount),
          username: topUp.user.username,
        },
      };
    }
    received = BigInt(Math.trunc(options.expectAmount));
  }
  const mismatch = cardKept === 0 && received !== topUp.amount;

  const balance = await db
    .$transaction(async (tx) => {
      // The claim, and the request rewritten to the money that came: from
      // here on the row says what was paid, not what was asked.
      const claimed = await tx.topUp.updateMany({
        where: { id: topUp.id, status: { in: ["PENDING", "EXPIRED"] } },
        // A bank request is rewritten to the money that came. A card is
        // not: its face value is what the desk redeems, and the fee is the
        // difference between that and what the wallet was credited.
        data: {
          status: "COMPLETED",
          ...(cardKept > 0 ? {} : { amount: received }),
        },
      });
      if (claimed.count === 0) throw new Error("ALREADY_HANDLED");

      const current = await tx.user.findUniqueOrThrow({ where: { id: topUp.userId } });
      // Added by the database, not here: a purchase settling at the same
      // moment would otherwise be wiped out by a balance computed from a
      // figure read before it.
      const balanceAfter = await creditWallet(tx, topUp.userId, received);

      await tx.transaction.create({
        data: {
          code: makeCode("GD"),
          userId: topUp.userId,
          kind: "TOPUP",
          status: "SUCCESS",
          delta: received,
          balanceAfter,
          description:
            cardKept > 0
              ? `Nạp thẻ cào · ${topUp.code} · thẻ ${requested.toLocaleString("vi-VN")}đ, phí ${cardKept.toLocaleString("vi-VN")}đ`
              : creditLine(topUp.code, requested, Number(received)),
          method: options.note ?? (topUp.method === "CARD" ? "Thẻ Cào" : "Ngân Hàng"),
        },
      });

      // The referral programme's whole payout path: whoever shared the link
      // this customer registered through earns their percent, inside the same
      // transaction that credits the top-up. The claimed-count guard above
      // already makes this once-only; the unique topUpId on the earning makes
      // double-pay structurally impossible on top of that.
      if (current.referredById) {
        const commission = commissionFor(received);
        if (commission > 0n) {
          await tx.referralEarning.create({
            data: {
              userId: current.referredById,
              fromUserId: topUp.userId,
              topUpId: topUp.id,
              amount: commission,
            },
          });
          await tx.user.update({
            where: { id: current.referredById },
            data: { commissionBalance: { increment: commission } },
          });
        }
      }

      return balanceAfter;
    })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message === "ALREADY_HANDLED") return null;
      throw error;
    });

  if (balance === null) return { ok: false, reason: "ALREADY_HANDLED", detail: "đã xử lý trước đó" };

  // Money in can lift the tier, and only lift. After the credit has
  // committed, never inside it: a rank bump must not roll a deposit back.
  await liftTierFor(topUp.userId);
  // A buyer who came through the shop bot hears about the money where they
  // are; best-effort, and after the credit is safely written.
  await notifyTopUpOnTelegram(topUp.userId, received, balance);

  // A figure that did not match is told to both sides: the customer so they
  // know nothing was lost or rounded, the desk so a short payment is not a
  // surprise later. Once per credit, so a feed replaying its history cannot
  // repeat it. The credit itself is already safe by now.
  if (mismatch) {
    const notice = mismatchNotice(topUp.code, requested, Number(received));
    await announceToUser(topUp.userId, {
      ...notice,
      type: "INFO",
      priority: "HIGH",
      cta: { label: "Xem ví", href: "/wallet" },
    });
    if (!options.byHand) {
      await announceToAdmins({
        title: `Nạp lệch số tiền · ${topUp.code}`,
        body: `${topUp.user.username} chuyển ${Number(received).toLocaleString("vi-VN")}đ cho lệnh ${requested.toLocaleString("vi-VN")}đ. Ví đã cộng đúng số nhận, lệnh đã ghi lại theo số nhận.`,
        cta: { label: "Xem nạp tiền", href: "/admin/topups" },
      });
    }
  }

  return {
    ok: true,
    code: topUp.code,
    username: topUp.user.username,
    amount: Number(received),
    requested,
    balance: Number(balance),
  };
}

/**
 * Tells the desk about a transfer the automatic path would not touch.
 *
 * Once per distinct (code, amount): the polled feed hands back the same
 * transfer on every pass for as long as it stays in the statement's window,
 * and the desk needs one bell for it, not one every eight seconds. The notice
 * text is a pure function of those figures, so "already told" is a lookup for
 * a notice with exactly this text — no extra column, no clock.
 *
 * Fails quietly: the bell is a convenience beside the JSON report, and a
 * hiccup writing it must not turn a provider's webhook into a retry storm.
 */
async function flagHeldTransfer(
  code: string,
  held: { requested: number; received: number; username: string },
): Promise<void> {
  const notice = heldNotice(code, held.requested, held.received, held.username);
  try {
    const told = await db.announcement.findFirst({
      where: { title: notice.title, body: notice.body },
      select: { id: true },
    });
    if (told) return;
    await announceToAdmins({
      ...notice,
      cta: { label: "Mở hàng đợi nạp", href: "/admin/topups" },
    });
  } catch {
    // The report still carries it; the bell is the convenience.
  }
}

export interface MatchReport {
  matched: number;
  skipped: number;
  details: string[];
}

/**
 * Runs a batch of incoming transfers against the pending requests.
 *
 * A transfer that names an open request is credited for what it carried,
 * within the plausible band, mismatch or not. Everything else — no code, a
 * request already settled (the feed replays its history on every poll), an
 * implausible figure — is left alone and reported rather than dropped:
 * silently dropping it would hide a customer's money.
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
      const figure = result.amount.toLocaleString("vi-VN");
      report.details.push(
        result.amount === result.requested
          ? `${code}: cộng ${figure}đ cho ${result.username}`
          : `${code}: cộng ${figure}đ cho ${result.username} (lệnh ghi ${result.requested.toLocaleString("vi-VN")}đ)`,
      );
    } else {
      report.skipped += 1;
      report.details.push(`${code}: ${result.detail ?? result.reason}`);
      if (result.reason === "AMOUNT_SUSPECT" && result.held) {
        await flagHeldTransfer(code, result.held);
      }
    }
  }

  return report;
}
