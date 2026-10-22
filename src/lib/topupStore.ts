import type { Prisma } from "@prisma/client";

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
  CARD_CREDIT_LATE_MS,
  cardNet,
  creditLine,
  extractTopUpCode,
  heldNotice,
  matchCardCredit,
  mismatchNotice,
  TOPUP_EXPIRY_MINUTES,
  type IncomingTransfer,
  type PendingCard,
} from "@/lib/topup";

/**
 * Whether two accounts have ever signed in from the same device on the same
 * network: an exact (address, browser) pair in both session histories. A
 * shared carrier address alone is not enough, Vietnamese mobile networks put
 * thousands behind one; the browser build has to match too.
 */
async function sharedDevice(tx: Prisma.TransactionClient, a: string, b: string): Promise<boolean> {
  const rows = await tx.session.findMany({
    where: { userId: { in: [a, b] }, ip: { not: null }, userAgent: { not: null } },
    select: { userId: true, ip: true, userAgent: true },
  });
  const seen = new Set(
    rows.filter((row) => row.userId === a).map((row) => `${row.ip}\n${row.userAgent}`),
  );
  return rows.some((row) => row.userId === b && seen.has(`${row.ip}\n${row.userAgent}`));
}

/** The desk hears about a commission the credit held back, once per request. */
async function flagHeldCommission(
  code: string,
  username: string,
  held: { referrerId: string; commission: bigint },
): Promise<void> {
  try {
    const referrer = await db.user.findUnique({
      where: { id: held.referrerId },
      select: { username: true },
    });
    const who = referrer?.username ?? "người giới thiệu";
    const title = `Hoa hồng tạm giữ · ${code}`;
    const body = `${username} nạp tiền qua giới thiệu của ${who}, nhưng hai tài khoản từng đăng nhập cùng một thiết bị và mạng, nên ${held.commission.toLocaleString("vi-VN")}đ hoa hồng CHƯA cộng. Nếu là hai người thật, cộng tay cho ${who} ở trang người dùng.`;
    const told = await db.announcement.findFirst({ where: { title, body }, select: { id: true } });
    if (told) return;
    await announceToAdmins({ title, body, cta: { label: "Mở người dùng", href: "/admin/users" } });
  } catch {
    // The ledger is right either way; the bell is the convenience.
  }
}

/** Ledger codes ("GD…"); exported for the commission-withdraw route. */
export const makeCode = makeShortCode;

/**
 * Retires bank requests nobody paid.
 *
 * Cheap enough to run on every reconciliation pass: one indexed UPDATE that
 * usually touches no rows. Expiring is only about the queue being readable —
 * `creditTopUp` still honours an expired request, so a late transfer is not
 * punished for arriving late.
 *
 * Bank requests only. A scratch card has no transfer to wait for: the desk
 * redeems it at its own pace and the TheSieuRe feed may pay it an hour
 * later (22/10/2026), so it stays in the queue, and on the customer's page,
 * as waiting until somebody settles it.
 */
export async function expireStaleTopUps(): Promise<number> {
  const cutoff = new Date(Date.now() - TOPUP_EXPIRY_MINUTES * 60 * 1000);
  const result = await db.topUp.updateMany({
    where: { status: "PENDING", method: "BANK", createdAt: { lt: cutoff } },
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
  options: {
    expectAmount?: number;
    note?: string;
    by?: string;
    byHand?: boolean;
    /** The feed row paying this request, e.g. "tsr:12345678". Unique on the
     *  table, so the same row can never pay twice. */
    providerRef?: string;
    /** What the provider actually paid the shop for this card, in dong: the
     *  wallet is never credited more than that, whatever the fee table says
     *  (TheSieuRe takes 14 to 38 percent by carrier and fines a wrong declared
     *  value, and the shop fee is one number). */
    cap?: number;
    /** TheSieuRe answered after the 30-minute clock had already marked the
     *  card FAILED: the money did arrive, so that row may still be paid. */
    reopenFailed?: boolean;
  } = {},
): Promise<CreditResult> {
  const topUp = await db.topUp.findUnique({
    where: { code },
    include: { user: { select: { username: true } } },
  });
  if (!topUp) return { ok: false, reason: "NOT_FOUND" };
  // EXPIRED counts as claimable: the request left the queue because nobody had
  // paid it yet, not because the shop refused it. A transfer arriving late is
  // still that customer's money.
  const claimable: Array<"PENDING" | "EXPIRED" | "FAILED"> = options.reopenFailed
    ? ["PENDING", "EXPIRED", "FAILED"]
    : ["PENDING", "EXPIRED"];
  if (!(claimable as string[]).includes(topUp.status)) {
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
  // The face the fee comes off: the value the customer declared, unless the
  // desk corrects it below.
  let cardFace = requested;
  const cardRates =
    topUp.method === "CARD" ? await getShopSettings() : null;
  const netOfCard = (face: number) =>
    cardRates ? cardNet(face, cardRates.topUpCardRates, cardRates.topUpCardFee) : face;
  if (topUp.method === "CARD") {
    received = BigInt(netOfCard(requested));
    cardKept = requested - Number(received);
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
        detail: `nhận ${options.expectAmount.toLocaleString("vi-VN")}đ cho lệnh ${requested.toLocaleString("vi-VN")}đ: ${
          verdict === "too-small" ? "quá nhỏ" : "quá lớn"
        }, cần người duyệt`,
        held: {
          requested,
          received: Math.trunc(options.expectAmount),
          username: topUp.user.username,
        },
      };
    }
    const typed = Math.trunc(options.expectAmount);
    if (topUp.method === "CARD") {
      // A corrected face value, not a corrected credit: the shop's cut comes
      // off it exactly as it would have come off the declared one.
      cardFace = typed;
      received = BigInt(netOfCard(typed));
      cardKept = typed - Number(received);
    } else {
      received = BigInt(typed);
    }
  }
  if (
    topUp.method === "CARD" &&
    options.cap !== undefined &&
    Number.isFinite(options.cap) &&
    options.cap > 0 &&
    received > BigInt(Math.trunc(options.cap))
  ) {
    received = BigInt(Math.trunc(options.cap));
    cardKept = cardFace - Number(received);
  }
  const mismatch = cardKept === 0 && received !== topUp.amount;

  /** A commission the credit did not pay, for the desk to look at. */
  let heldCommission: { referrerId: string; commission: bigint } | null = null;

  const balance = await db
    .$transaction(async (tx) => {
      // The claim, and the request rewritten to the money that came: from
      // here on the row says what was paid, not what was asked.
      const claimed = await tx.topUp.updateMany({
        where: { id: topUp.id, status: { in: claimable } },
        // A bank request is rewritten to the money that came. A card is
        // not: its face value is what the desk redeems, and the fee is the
        // difference between that and what the wallet was credited.
        data: {
          status: "COMPLETED",
          // A bank request is rewritten to the money that came. A card keeps a
          // face value — but the desk may have corrected which one, and the
          // corrected figure is what the row should record.
          ...(topUp.method === "CARD"
            ? cardFace !== requested
              ? { amount: BigInt(cardFace) }
              : {}
            : { amount: received }),
          // …and this is the one figure every screen should read.
          credited: received,
          // A refusal the clock wrote is withdrawn by the credit.
          ...(options.reopenFailed ? { note: null } : {}),
          ...(options.providerRef ? { providerRef: options.providerRef } : {}),
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
              ? `Nạp thẻ cào · ${topUp.code} · thẻ ${cardFace.toLocaleString("vi-VN")}đ, phí ${cardKept.toLocaleString("vi-VN")}đ`
              : creditLine(topUp.code, requested, Number(received)),
          method:
            options.note ??
            (() => {
              const word = topUp.method === "CARD" ? "Thẻ Cào" : "Ngân Hàng";
              return options.by ? `${word} · duyệt bởi ${options.by}` : word;
            })(),
        },
      });

      // The referral programme's whole payout path: whoever shared the link
      // this customer registered through earns their percent, inside the same
      // transaction that credits the top-up. The claimed-count guard above
      // already makes this once-only; the unique topUpId on the earning makes
      // double-pay structurally impossible on top of that.
      if (current.referredById) {
        const commission = commissionFor(received);
        // Held, not paid, when the two accounts have signed in from one device
        // on one network: that is what a self-referral looks like (audit
        // 01/10/2026), and a household sharing a laptop is for the desk to
        // credit by hand from the notice this leaves.
        const sameDevice =
          commission > 0n && (await sharedDevice(tx, current.referredById, topUp.userId));
        if (sameDevice) heldCommission = { referrerId: current.referredById, commission };
        if (commission > 0n && !sameDevice) {
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
  if (heldCommission) void flagHeldCommission(topUp.code, topUp.user.username, heldCommission);

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
        cta: { label: "Xem nạp tiền", href: "/admin/operations?tab=topups" },
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
      cta: { label: "Mở hàng đợi nạp", href: "/admin/operations?tab=topups" },
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

/**
 * Credits waiting scratch cards from what the shop's TheSieuRe account took
 * in, read off sieuthicode's history of it (the owner, 22/10/2026: "cái đó
 * cho thẻ cào thôi"). The desk still redeems the card at TheSieuRe; this is
 * the "Đã nạp" click it no longer has to make.
 *
 * Each row is matched by `matchCardCredit`. A row already written to a
 * request (its providerRef) is passed over, so a feed that repeats the same
 * rows every minute pays nobody twice; a row that matches nothing is only
 * named in the report, for the desk to settle by hand.
 */
export async function applyCardCredits(credits: IncomingTransfer[]): Promise<MatchReport> {
  const report: MatchReport = { matched: 0, skipped: 0, details: [] };
  if (credits.length === 0) return report;

  const refOf = (credit: IncomingTransfer) =>
    credit.reference ? `tsr:${credit.reference}` : null;
  const refs = credits.map(refOf).filter((ref): ref is string => ref !== null);
  const paid = new Set(
    refs.length === 0
      ? []
      : (
          await db.topUp.findMany({
            where: { providerRef: { in: refs } },
            select: { providerRef: true },
          })
        ).map((row) => row.providerRef),
  );

  // Cards sent in the last day, oldest first; EXPIRED rows are old bank-style
  // sweeps and still creditable.
  let waiting: PendingCard[] = (
    await db.topUp.findMany({
      where: {
        method: "CARD",
        status: { in: ["PENDING", "EXPIRED"] },
        cardSerial: { not: null },
        createdAt: { gte: new Date(Date.now() - CARD_CREDIT_LATE_MS) },
      },
      orderBy: { createdAt: "asc" },
      select: { code: true, cardSerial: true, amount: true, createdAt: true },
    })
  ).map((row) => ({
    code: row.code,
    serial: row.cardSerial ?? "",
    face: Number(row.amount),
    createdAt: row.createdAt,
  }));

  for (const credit of credits) {
    const ref = refOf(credit);
    if (ref && paid.has(ref)) continue;
    const figure = credit.amount.toLocaleString("vi-VN");
    const card = matchCardCredit(credit, waiting);
    if (!card) {
      report.skipped += 1;
      report.details.push(
        `TheSieuRe +${figure}đ "${credit.description.slice(0, 60)}": chưa khớp thẻ nào đang chờ`,
      );
      continue;
    }
    try {
      const result = await creditTopUp(card.code, {
        note: "Thẻ Cào · TheSieuRe",
        ...(ref ? { providerRef: ref } : {}),
      });
      if (result.ok) {
        report.matched += 1;
        report.details.push(
          `${card.code}: cộng ${result.amount.toLocaleString("vi-VN")}đ cho ${result.username} (thẻ ${card.face.toLocaleString("vi-VN")}đ, TheSieuRe báo ${figure}đ)`,
        );
        waiting = waiting.filter((other) => other.code !== card.code);
        if (ref) paid.add(ref);
      } else {
        report.skipped += 1;
        report.details.push(`${card.code}: ${result.detail ?? result.reason}`);
      }
    } catch (error) {
      report.skipped += 1;
      report.details.push(`${card.code}: ${error instanceof Error ? error.message : "lỗi"}`);
    }
  }
  return report;
}
