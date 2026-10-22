/**
 * TheSieuRe's card-exchange API v2 (thesieure.com/chargingws/v2, their "Tài
 * liệu API"), the pure part: the carriers in their spelling, the md5
 * signatures on calls and answers, and the shape their JSON is read into.
 * The calls themselves live in theSieuRe.ts; this file is what the tests
 * exercise.
 */
import { createHash } from "node:crypto";

export const TSR_DEFAULT_API_URL = "https://thesieure.com/chargingws/v2";

/** The form's carrier names (topUpCarriers.ts) as TheSieuRe spells them. */
const TELCO: Record<string, string> = {
  viettel: "VIETTEL",
  vinaphone: "VINAPHONE",
  vina: "VINAPHONE",
  mobifone: "MOBIFONE",
  vietnamobile: "VNMOBI",
  vietnammobi: "VNMOBI",
  zing: "ZING",
  garena: "GARENA",
  vcoin: "VCOIN",
  scoin: "SCOIN",
};

export function telcoFor(carrier: string | null): string | null {
  if (!carrier) return null;
  return TELCO[carrier.trim().toLowerCase()] ?? null;
}

function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

/** On a charging call: md5(key . code . "charging" . partner . request . serial . telco). */
export function chargingSign(input: {
  partnerKey: string;
  partnerId: string;
  requestId: string;
  code: string;
  serial: string;
  telco: string;
}): string {
  return md5(
    `${input.partnerKey}${input.code}charging${input.partnerId}${input.requestId}${input.serial}${input.telco}`,
  );
}

/** On a check call: md5(key . "check" . partner . request). */
export function checkSign(input: { partnerKey: string; partnerId: string; requestId: string }): string {
  return md5(`${input.partnerKey}check${input.partnerId}${input.requestId}`);
}

/** What TheSieuRe signs its answers with: md5(key . code . serial). */
export function callbackSign(partnerKey: string, code: string, serial: string): string {
  return md5(`${partnerKey}${code}${serial}`);
}

export interface TsrResult {
  /** A card state (99, 1, 2, 3, 4) or a request-level error (100 to 104). */
  status: number;
  message: string;
  requestId: string;
  transId: string;
  /** The face value TheSieuRe found on the card; 0 while pending. */
  value: number;
  declaredValue: number;
  /** What the shop's TheSieuRe balance received, after their cut. */
  amount: number;
  code: string;
  serial: string;
  callbackSign: string;
}

/** Their JSON, reply or callback, in one shape; null when it is not one. */
export function readTsrResult(raw: unknown): TsrResult | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const status = Number(row.status);
  if (!Number.isInteger(status)) return null;
  const num = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const text = (value: unknown) => (value === undefined || value === null ? "" : String(value));
  return {
    status,
    message: text(row.message),
    requestId: text(row.request_id),
    transId: text(row.trans_id),
    value: num(row.value),
    declaredValue: num(row.declared_value),
    amount: num(row.amount),
    code: text(row.code),
    serial: text(row.serial),
    callbackSign: text(row.callback_sign),
  };
}

export type TsrVerdict = "paid" | "paid-other-value" | "refused" | "pending" | "down";

/**
 * What a status means for the request. 1 pays, 2 pays at the value found,
 * 99 keeps waiting, 3 is a bad card and ends it. 4 (their maintenance) and
 * the request-level errors 100 to 104 mean TheSieuRe did not take the card
 * this time: nothing is decided, the desk still has it.
 */
export function verdictOf(status: number): TsrVerdict {
  if (status === 1) return "paid";
  if (status === 2) return "paid-other-value";
  if (status === 99) return "pending";
  if (status === 3) return "refused";
  return "down";
}
