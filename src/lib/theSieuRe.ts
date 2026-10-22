import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import type { ShopSettings } from "@/lib/settings";
import {
  TSR_DEFAULT_API_URL,
  chargingSign,
  checkSign,
  readTsrResult,
  telcoFor,
  verdictOf,
  type TsrResult,
} from "@/lib/theSieuReRules";
import { creditTopUp } from "@/lib/topupStore";

/**
 * Scratch cards handed to TheSieuRe (the owner, 22/10/2026: "xài API bên
 * TheSieuRe luôn"): the shop sends the card the moment it is given, TheSieuRe
 * redeems it with the carrier and answers, by callback or when asked. With
 * the partner keys set in Cấu hình the desk only ever sees what TheSieuRe
 * would not take.
 */

export type TsrCall =
  | { ok: true; result: TsrResult }
  | { ok: false; reason: "telco" | "network" | "shape"; detail: string };

function endpoint(settings: ShopSettings): string {
  return settings.topUpCardApiUrl.trim() || TSR_DEFAULT_API_URL;
}

async function call(settings: ShopSettings, form: Record<string, string>): Promise<TsrCall> {
  try {
    const response = await fetch(endpoint(settings), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams(form).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, reason: "shape", detail: text.slice(0, 200) };
    }
    const result = readTsrResult(parsed);
    return result ? { ok: true, result } : { ok: false, reason: "shape", detail: text.slice(0, 200) };
  } catch (error) {
    return {
      ok: false,
      reason: "network",
      detail: error instanceof Error ? error.message : "lỗi mạng",
    };
  }
}

export interface CardToSend {
  /** The request code, which is also TheSieuRe's request_id. */
  code: string;
  carrier: string | null;
  serial: string;
  pin: string;
  face: number;
}

/** "charging": the card goes to TheSieuRe. */
export async function submitCard(settings: ShopSettings, card: CardToSend): Promise<TsrCall> {
  const telco = telcoFor(card.carrier);
  if (!telco) {
    return {
      ok: false,
      reason: "telco",
      detail: `TheSieuRe không nhận thẻ ${card.carrier ?? "không rõ nhà mạng"}`,
    };
  }
  const partnerId = settings.topUpCardPartnerId.trim();
  const partnerKey = settings.topUpCardPartnerKey.trim();
  return call(settings, {
    command: "charging",
    partner_id: partnerId,
    request_id: card.code,
    telco,
    amount: String(card.face),
    serial: card.serial,
    code: card.pin,
    sign: chargingSign({
      partnerKey,
      partnerId,
      requestId: card.code,
      code: card.pin,
      serial: card.serial,
      telco,
    }),
  });
}

/** "check": where a card sent earlier stands. */
export async function checkCard(settings: ShopSettings, code: string): Promise<TsrCall> {
  const partnerId = settings.topUpCardPartnerId.trim();
  const partnerKey = settings.topUpCardPartnerKey.trim();
  return call(settings, {
    command: "check",
    partner_id: partnerId,
    request_id: code,
    sign: checkSign({ partnerKey, partnerId, requestId: code }),
  });
}

/** Constant-time, so a forged callback learns nothing from the clock. */
export function sameSign(given: string, expected: string): boolean {
  const a = Buffer.from(given.trim().toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type TsrOutcome = "credited" | "refused" | "pending" | "ignored";

/**
 * Settles a card request on TheSieuRe's word. Idempotent: creditTopUp claims
 * the row once, and a refusal is only ever written over a row still waiting,
 * so a callback and a check that both arrive change nothing twice. A card
 * paid at another value than declared is credited at the value found, net
 * of the shop's fee, as the desk would correct it by hand.
 */
export async function applyTsrResult(code: string, result: TsrResult): Promise<TsrOutcome> {
  const verdict = verdictOf(result.status);
  if (verdict === "pending" || verdict === "down") return "pending";
  const ref = result.transId ? `tsr:${result.transId}` : undefined;

  if (verdict === "paid" || verdict === "paid-other-value") {
    const row = await db.topUp.findUnique({
      where: { code },
      select: { amount: true, method: true },
    });
    if (!row || row.method !== "CARD") return "ignored";
    const declared = Number(row.amount);
    const found =
      verdict === "paid-other-value" && result.value > 0 && result.value !== declared
        ? result.value
        : null;
    // Never more than TheSieuRe paid the shop for it: their cut and their
    // fine for a wrong declared value both come off before the fee table.
    const credit = await creditTopUp(code, {
      note: "Thẻ Cào · TheSieuRe",
      ...(ref ? { providerRef: ref } : {}),
      ...(found ? { expectAmount: found, byHand: true } : {}),
      ...(result.amount > 0 ? { cap: result.amount } : {}),
    });
    if (!credit.ok) return "ignored";
    // The card is spent; its PIN has no further use anywhere.
    await db.topUp.updateMany({ where: { code }, data: { cardPin: null } });
    return "credited";
  }

  const why = result.message || "thẻ không hợp lệ";
  const data = {
    status: "FAILED" as const,
    note: `TheSieuRe: ${why}`.slice(0, 300),
    cardPin: null,
  };
  const where: Prisma.TopUpWhereInput = {
    code,
    method: "CARD",
    status: { in: ["PENDING", "EXPIRED"] },
  };
  let refused = 0;
  try {
    refused = (await db.topUp.updateMany({ where, data: { ...data, ...(ref ? { providerRef: ref } : {}) } })).count;
  } catch {
    // The reference already names another row; the refusal still stands.
    refused = (await db.topUp.updateMany({ where, data })).count;
  }
  if (refused === 0) return "ignored";
  const owner = await db.topUp.findUnique({
    where: { code },
    select: { userId: true, amount: true },
  });
  if (owner) {
    await announceToUser(owner.userId, {
      title: "Thẻ cào không nạp được",
      body: `Lệnh ${code}, thẻ ${Number(owner.amount).toLocaleString("vi-VN")}đ: ${why}. Kiểm tra lại số seri và mã thẻ rồi gửi lại.`,
      cta: { label: "Xem lệnh", href: `/wallet/${code}` },
    }).catch(() => {});
  }
  return "refused";
}

/** How long a sent card is left to the callback before the shop asks itself. */
export const CHECK_AFTER_MS = 30_000;

/**
 * Asks TheSieuRe about the cards sent and not yet answered, oldest first, a
 * few per reconciliation pass: the fallback for a callback that never came.
 */
export async function checkPendingCards(settings: ShopSettings): Promise<{
  checked: number;
  credited: number;
  refused: number;
  details: string[];
}> {
  const out = { checked: 0, credited: 0, refused: 0, details: [] as string[] };
  const rows = await db.topUp.findMany({
    where: {
      method: "CARD",
      status: "PENDING",
      providerRef: { startsWith: "tsr:" },
      createdAt: {
        lt: new Date(Date.now() - CHECK_AFTER_MS),
        gt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "asc" },
    take: 15,
    select: { code: true },
  });
  for (const row of rows) {
    out.checked += 1;
    const answer = await checkCard(settings, row.code);
    if (!answer.ok) {
      out.details.push(`${row.code}: TheSieuRe không trả lời (${answer.detail})`);
      continue;
    }
    const outcome = await applyTsrResult(row.code, answer.result);
    if (outcome === "credited") {
      out.credited += 1;
      out.details.push(`${row.code}: TheSieuRe báo thẻ đúng, đã cộng ví`);
    } else if (outcome === "refused") {
      out.refused += 1;
      out.details.push(`${row.code}: TheSieuRe từ chối (${answer.result.message})`);
    } else {
      out.details.push(`${row.code}: TheSieuRe báo ${answer.result.status} ${answer.result.message}`);
    }
  }
  return out;
}
