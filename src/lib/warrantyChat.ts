import { warrantyOpen, type WarrantyStatus } from "@/lib/warrantyRequests";

/**
 * The conversation on a warranty ticket (the owner, 01/10/2026). Pure rules
 * shared by the routes and both screens: what a message may say, how fast a
 * buyer may send, when the shop owes a reply, and how a thread is put
 * together from what the page rendered and what arrived since.
 *
 * The thread is open exactly while the ticket is — warrantyOpen(): until the
 * shop marks it fixed or the money has gone back. After that both sides can
 * read it and neither can add to it; a fault that comes back is a new report.
 */

export const MESSAGE_MAX = 1000;

/** A buyer's messages on one ticket: in any minute, and in any day. */
export const BURST_LIMIT = 5;
export const BURST_WINDOW_MS = 60_000;
export const DAILY_LIMIT = 60;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** How often an open status page asks for new messages, and the desk for news. */
export const POLL_MS = 10_000;
export const DESK_POLL_MS = 15_000;

/** One message as both screens draw it. */
export interface ChatMessage {
  id: string;
  fromShop: boolean;
  body: string;
  imageUrl: string | null;
  /** The status a desk action moved the ticket to with this note. */
  status: WarrantyStatus | null;
  /** "17:56 08/09/2026", written on the server so the page and the poll agree. */
  at: string;
  /** ISO time — the order of the thread and the poll's cursor. */
  sentAt: string;
}

export type MessageRead = { ok: true; body: string } | { ok: false; error: string };

/** The text of a message: trimmed, at most MESSAGE_MAX, empty only beside a picture. */
export function readMessage(value: unknown, withImage: boolean): MessageRead {
  if (value !== undefined && value !== null && typeof value !== "string") {
    return { ok: false, error: "Tin nhắn không hợp lệ." };
  }
  const body = (value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!body && !withImage) {
    return { ok: false, error: "Bạn chưa nhập nội dung tin nhắn." };
  }
  if (body.length > MESSAGE_MAX) {
    return { ok: false, error: `Tin nhắn tối đa ${MESSAGE_MAX} ký tự, bạn tách làm hai tin nhé.` };
  }
  return { ok: true, body };
}

/** Refuses a buyer who has sent too many in the last minute, or the last day. */
export function sendingTooFast(lastMinute: number, lastDay: number): string | null {
  if (lastMinute >= BURST_LIMIT) {
    return "Bạn gửi hơi nhanh, đợi một chút rồi gửi tiếp nhé.";
  }
  if (lastDay >= DAILY_LIMIT) {
    return "Hôm nay bạn đã nhắn nhiều cho yêu cầu này, shop sẽ trả lời sớm.";
  }
  return null;
}

/** The last word on an open ticket is the buyer's: the shop owes a reply. */
export function awaitingShop(status: WarrantyStatus, lastFromShop: boolean | null): boolean {
  return warrantyOpen(status) && lastFromShop === false;
}

/**
 * The thread as rendered by the server, plus what this tab sent or fetched
 * since — once each, in the order they were written. A message the tab sent
 * comes back in the next poll and again after a refresh; it is shown once.
 */
export function mergeMessages(rendered: ChatMessage[], extra: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...rendered, ...extra]) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** A message cut down for a bell notice or a Telegram line. */
export function messagePreview(body: string, max = 140): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) return "(ảnh)";
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}
