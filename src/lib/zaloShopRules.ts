/**
 * The Zalo shop's grammar, with no database in it: what a customer typed read
 * into a command, the numbered lists they pick from held as state, and a
 * builder for styled text. A personal Zalo account has no buttons, so the
 * shop is driven by short words ("SHOP", "NAP 100k", "OK") and numbers.
 */
import type { ZaloStyleRange } from "@/lib/zaloShared";

/** "Nạp  100k" → "NAP 100K": no accents, no case, single spaces. */
export function normalizeInput(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * An amount of money as people type it: "100000", "100.000", "100,000",
 * "100k", "100 nghìn", "1tr", "1,5 triệu", "2m". Null when it is none, or out
 * of any sane range.
 */
export function readAmount(raw: string): number | null {
  const s = normalizeInput(raw)
    .replace(/\s+/g, "")
    .replace(/(VND|DONG|D)$/, "");
  if (!s) return null;
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
    const n = Number(s.replace(/[.,]/g, ""));
    return n > 0 && n <= 1_000_000_000 ? n : null;
  }
  const m = /^(\d+(?:[.,]\d+)?)(K|NGHIN|NGAN|TR|TRIEU|M)?$/.exec(s);
  if (!m) return null;
  const base = Number(m[1]!.replace(",", "."));
  const unit = m[2] ?? "";
  const factor =
    unit === "K" || unit === "NGHIN" || unit === "NGAN"
      ? 1_000
      : unit
        ? 1_000_000
        : 1;
  const n = Math.round(base * factor);
  return Number.isFinite(n) && n > 0 && n <= 1_000_000_000 ? n : null;
}

export type ZaloCommand =
  | { kind: "menu" }
  | { kind: "shop" }
  | { kind: "pick"; n: number }
  | { kind: "ok" }
  | { kind: "cancel" }
  | { kind: "topup"; amount: number | null; raw: string }
  | { kind: "balance" }
  | { kind: "orders" }
  /**
   * A phone code for "xác thực cấp 2" sent to the bot: "XACTHUC 482913",
   * "xác thực: 482913", or the six digits alone (`bare`), which the shop
   * treats as a code only while one is waiting for this account.
   */
  | { kind: "verify"; code: string; bare: boolean }
  | { kind: "unknown" };

const MENU =
  /^(MENU|HELP|HD|HUONG DAN|BAT DAU|START|\?|HI|HELLO|CHAO|ALO|XIN CHAO|LENH)$/;
const SHOP =
  /^(SHOP|MUA|MUA HACK|MUA HANG|DANH MUC|DM|SAN PHAM|SP|HACK|BANG GIA|GIA|XEM HANG)$/;
const OK = /^(OK|OKE|OKAY|CO|XAC NHAN|DONG Y|Y|YES|THANH TOAN|MUA LUON|CHOT)$/;
const CANCEL = /^(HUY|THOAT|KHONG|K|CANCEL|STOP|THOI|BO)$/;
const BALANCE = /^(SO DU|SODU|VI|TAI KHOAN|TK|BALANCE|XEM VI)$/;
const ORDERS =
  /^(DON|DON HANG|DONHANG|LICH SU|LICH SU MUA|KEY|KEY CUA TOI|ORDERS)$/;

export function parseZaloCommand(text: string): ZaloCommand {
  const s = normalizeInput(text);
  if (!s) return { kind: "unknown" };
  if (MENU.test(s)) return { kind: "menu" };
  if (SHOP.test(s)) return { kind: "shop" };
  const verify = /^(?:(XAC ?THUC|OTP)[:\-]? ?)?(\d{6})$/.exec(s);
  if (verify) return { kind: "verify", code: verify[2]!, bare: !verify[1] };
  if (/^\d{1,3}$/.test(s)) return { kind: "pick", n: Number(s) };
  if (OK.test(s)) return { kind: "ok" };
  if (CANCEL.test(s)) return { kind: "cancel" };
  const topup = /^NAP(?: TIEN)?(?: (.+))?$/.exec(s);
  if (topup) {
    const raw = (topup[1] ?? "").trim();
    return { kind: "topup", amount: raw ? readAmount(raw) : null, raw };
  }
  if (BALANCE.test(s)) return { kind: "balance" };
  if (ORDERS.test(s)) return { kind: "orders" };
  return { kind: "unknown" };
}

/** Where a conversation stands, as the bot holds it between two messages. */
export type ZaloChatState =
  | { step: "categories"; ids: string[]; at: number }
  | { step: "products"; ids: string[]; categoryId: string; at: number }
  | { step: "packages"; ids: string[]; productId: string; at: number }
  | { step: "confirm"; productId: string; packageId: string; at: number }
  | { step: "orders"; ids: string[]; at: number };

/** A list goes stale after half an hour: the shop's shelves move. */
export const CHAT_STATE_TTL_MS = 30 * 60_000;

const STEPS = new Set([
  "categories",
  "products",
  "packages",
  "confirm",
  "orders",
]);

function idList(value: unknown): string[] | null {
  return Array.isArray(value) &&
    value.length <= 60 &&
    value.every((v) => typeof v === "string" && v.length <= 64)
    ? (value as string[])
    : null;
}

/** The state the bot sent back, checked: right shape, not stale. */
export function readChatState(raw: unknown, now: number): ZaloChatState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.step !== "string" || !STEPS.has(s.step)) return null;
  if (
    typeof s.at !== "number" ||
    now - s.at > CHAT_STATE_TTL_MS ||
    s.at > now + 60_000
  )
    return null;
  const at = s.at;
  if (s.step === "confirm") {
    return typeof s.productId === "string" && typeof s.packageId === "string"
      ? { step: "confirm", productId: s.productId, packageId: s.packageId, at }
      : null;
  }
  const ids = idList(s.ids);
  if (!ids) return null;
  if (s.step === "products") {
    return typeof s.categoryId === "string"
      ? { step: "products", ids, categoryId: s.categoryId, at }
      : null;
  }
  if (s.step === "packages") {
    return typeof s.productId === "string"
      ? { step: "packages", ids, productId: s.productId, at }
      : null;
  }
  return { step: s.step as "categories" | "orders", ids, at };
}

/** Styled text for Zalo, built a piece at a time so the ranges stay true. */
export class ZaloText {
  text = "";
  styles: ZaloStyleRange[] = [];

  add(part: string, ...st: string[]): this {
    const start = this.text.length;
    this.text += part;
    if (part.length > 0)
      for (const style of st)
        this.styles.push({ start, len: part.length, st: style });
    return this;
  }

  /** A new line (none before the first), then the part. */
  line(part = "", ...st: string[]): this {
    if (this.text.length > 0) this.add("\n");
    return this.add(part, ...st);
  }

  done(): { text: string; styles: ZaloStyleRange[] } {
    return { text: this.text, styles: this.styles };
  }
}

/** A long product name cut for a list line. */
export function clip(name: string, max = 64): string {
  const clean = name.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Round a shortfall up to an amount a person would type. */
export function tidyAmount(amount: number): number {
  const step =
    amount >= 1_000_000 ? 100_000 : amount >= 100_000 ? 10_000 : 5_000;
  return Math.ceil(amount / step) * step;
}
