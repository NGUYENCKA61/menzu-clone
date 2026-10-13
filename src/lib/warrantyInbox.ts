import { dayStamp } from "@/lib/dayGroups";
import { messagePreview } from "@/lib/warrantyChat";
import { warrantyOpen, type WarrantyStatus } from "@/lib/warrantyRequests";

/**
 * The admin's floating warranty inbox (the owner, 13/10/2026: "Với tài khoản
 * admin bỏ qua phần chăm sóc khách hàng chat mà thay vào đó là phần nhắn tin
 * trao đổi khách hàng về bảo hành"). Pure rules shared by the route, the
 * server render and the widget: which tickets are worth a look, which of them
 * owe the buyer an answer, and in what order they are listed.
 *
 * Nothing is tracked as read: there is no column for it and the widget adds
 * none. A ticket stops waiting the moment the shop has the last word.
 */

/** At most this many tickets in the panel. */
export const INBOX_LIMIT = 50;

/** A closed ticket stays listed while it has a message this recent. */
export const INBOX_RECENT_DAYS = 7;

/** How often the badge asks again, while the tab is on screen. */
export const INBOX_POLL_MS = 30_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A ticket's newest line, as the list shows it. */
export interface InboxLast {
  fromShop: boolean;
  /** One line, cut short; "(ảnh)" for a picture sent alone. */
  text: string;
  /** "17:56 08/09/2026", written on the server like the thread's. */
  at: string;
  /** ISO, for the relative time and the order. */
  sentAt: string;
}

/** One ticket in the panel. Nothing here the ticket's admin page does not show. */
export interface InboxTicket {
  id: string;
  orderCode: string;
  productName: string;
  buyerName: string;
  buyerAvatar: string | null;
  status: WarrantyStatus;
  /** The report itself: the thread's first line, the buyer's. */
  report: { body: string; imageUrl: string | null; at: string; sentAt: string };
  /** The newest message, or the report while nothing has been said since. */
  last: InboxLast;
  /** The buyer is waiting on the shop (waitingForShop). */
  waitingForShop: boolean;
}

export interface InboxView {
  tickets: InboxTicket[];
  /** Every ticket waiting on the shop, counted before the list is cut. */
  waiting: number;
}

/** A ticket as the store reads it from the database. */
export interface InboxSource {
  id: string;
  status: WarrantyStatus;
  createdAt: Date;
  description: string;
  imageUrl: string | null;
  orderCode: string;
  productName: string;
  buyerName: string;
  buyerAvatar: string | null;
  /** The newest message on the thread; null while there is none. */
  last: { fromShop: boolean; body: string; createdAt: Date } | null;
}

/**
 * Whether the buyer is waiting on the shop: the last word on an open ticket
 * is theirs, or nobody from the shop has said anything since the report (the
 * report is the buyer's own first word, so both cases are "the shop has not
 * had the last word").
 *
 * A closed ticket never waits: its thread takes no more messages, so a badge
 * counting it could never be cleared from the widget.
 */
export function waitingForShop(status: string, lastFromShop: boolean | null): boolean {
  if (!warrantyOpen(status)) return false;
  return lastFromShop !== true;
}

/**
 * Worth a place in the panel: every open ticket, and a closed one that still
 * had a message in the last INBOX_RECENT_DAYS days. The same rule as the
 * store's query, kept here so it can be tested and so a row the query let
 * through by its own rounding is still judged the same way.
 */
export function inInbox(
  row: { status: string; lastMessageAt: Date | null },
  now: Date,
): boolean {
  if (warrantyOpen(row.status)) return true;
  if (!row.lastMessageAt) return false;
  return now.getTime() - row.lastMessageAt.getTime() <= INBOX_RECENT_DAYS * DAY_MS;
}

/** Waiting first, then open, then the recently closed. */
function priority(ticket: InboxTicket): number {
  if (ticket.waitingForShop) return 0;
  return warrantyOpen(ticket.status) ? 1 : 2;
}

/** Plain string order: ISO times sort as text, and ids need no locale. */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Newest activity first; the id settles a tie so the order never flickers. */
function byActivity(a: InboxTicket, b: InboxTicket): number {
  return compare(b.last.sentAt, a.last.sentAt) || compare(a.id, b.id);
}

/**
 * Newest activity first, as the panel lists them.
 *
 * Which tickets make the cut is decided before that, by what needs the shop:
 * waiting ones first, then the rest of the open ones, then the recently
 * closed. Cut by time alone, a busy week of closed chatter could push a buyer
 * who is still waiting off the end of the list, and "Chờ trả lời" would show
 * fewer than the badge counts.
 */
export function orderInbox(tickets: InboxTicket[], limit: number = INBOX_LIMIT): InboxTicket[] {
  return [...tickets]
    .sort((a, b) => priority(a) - priority(b) || byActivity(a, b))
    .slice(0, Math.max(0, limit))
    .sort(byActivity);
}

/** One stored ticket as the panel takes it. */
export function toInboxTicket(row: InboxSource): InboxTicket {
  const report = {
    body: row.description,
    imageUrl: row.imageUrl,
    at: dayStamp(row.createdAt),
    sentAt: row.createdAt.toISOString(),
  };
  const last: InboxLast = row.last
    ? {
        fromShop: row.last.fromShop,
        text: messagePreview(row.last.body, 120),
        at: dayStamp(row.last.createdAt),
        sentAt: row.last.createdAt.toISOString(),
      }
    : { fromShop: false, text: messagePreview(row.description, 120), at: report.at, sentAt: report.sentAt };
  return {
    id: row.id,
    orderCode: row.orderCode,
    productName: row.productName,
    buyerName: row.buyerName,
    buyerAvatar: row.buyerAvatar,
    status: row.status,
    report,
    last,
    waitingForShop: waitingForShop(row.status, row.last ? row.last.fromShop : null),
  };
}

/** The panel's whole content from the store's rows. */
export function buildInbox(rows: InboxSource[], now: Date, limit: number = INBOX_LIMIT): InboxView {
  const tickets = rows
    .filter((row) => inInbox({ status: row.status, lastMessageAt: row.last?.createdAt ?? null }, now))
    .map(toInboxTicket);
  return {
    tickets: orderInbox(tickets, limit),
    waiting: tickets.filter((ticket) => ticket.waitingForShop).length,
  };
}
