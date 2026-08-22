/**
 * Reading the order screen's filters, and writing its export.
 *
 * Pure: the filters arrive in the URL where anyone can edit them, and the
 * export leaves the building as a file somebody opens in Excel. Both deserve
 * to be checked without a database.
 */

import { PER_PAGE } from "@/lib/paging";

/** Orders shown per page. Two rows come off the shared figure to pay for the
 *  stat cards above the table — the same trade the users screen makes, so the
 *  two pages fit one screen the same way. */
export const ORDERS_PER_PAGE = PER_PAGE - 2;

export const ORDER_STATUSES = ["PAID", "PENDING", "CANCELLED", "REFUNDED"] as const;
export const ORDER_METHODS = ["BUY_NOW", "DEPOSIT", "TRADE_IN", "PAY_LATER"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderMethod = (typeof ORDER_METHODS)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PAID: "Đã thanh toán",
  PENDING: "Chờ xử lý",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

export const ORDER_METHOD_LABELS: Record<OrderMethod, string> = {
  BUY_NOW: "Mua ngay",
  DEPOSIT: "Cọc / Góp",
  TRADE_IN: "Thu cũ đổi mới",
  PAY_LATER: "Trả sau",
};

export interface OrderFilters {
  /** Free text: order code, customer, or product. */
  q: string;
  status: OrderStatus | null;
  method: OrderMethod | null;
  /** "YYYY-MM-DD", or empty for any day. */
  day: string;
}

/** Longest search term accepted, so a pasted essay cannot become a LIKE scan. */
export const QUERY_MAX = 80;

/**
 * Reads the filters out of whatever the URL carries.
 *
 * Anything unrecognised becomes "no filter" rather than an error: these arrive
 * from a link somebody may have edited or kept from an older version of the
 * page, and a bookmark that has gone slightly stale should show the orders
 * unfiltered, not a crash.
 */
export function parseOrderFilters(params: Record<string, string | undefined>): OrderFilters {
  const status = params.status;
  const method = params.method;
  return {
    q: (params.q ?? "").trim().slice(0, QUERY_MAX),
    status: (ORDER_STATUSES as readonly string[]).includes(status ?? "")
      ? (status as OrderStatus)
      : null,
    method: (ORDER_METHODS as readonly string[]).includes(method ?? "")
      ? (method as OrderMethod)
      : null,
    day: /^\d{4}-\d{2}-\d{2}$/.test(params.day ?? "") ? params.day! : "",
  };
}

/** Whether anything is actually narrowing the list. */
export function hasOrderFilters(filters: OrderFilters): boolean {
  return Boolean(filters.q || filters.status || filters.method || filters.day);
}

/**
 * One CSV cell, quoted and defused.
 *
 * The quoting is ordinary. The leading apostrophe is not: Excel and Sheets
 * treat a cell beginning with =, +, - or @ as a formula, so a customer who
 * names themselves `=HYPERLINK(...)` gets that formula executed on the
 * shop's machine when the export is opened. Prefixing forces it back to text.
 */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const defused = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${defused.replace(/"/g, '""')}"`;
}

/** Rows to CSV, header first. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * The filename an export lands under.
 *
 * Dated, because a folder of files all called "don-hang.csv" is a folder
 * nobody can use.
 */
export function exportFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  // Read in Vietnam, so a file exported at 1am carries the date the shop
  // would call it.
  const local = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `don-hang-${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(
    local.getUTCDate(),
  )}-${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}.csv`;
}
