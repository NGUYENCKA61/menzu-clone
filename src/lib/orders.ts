/**
 * Reading the order screen's filters, and writing its export.
 *
 * Pure: the filters arrive in the URL where anyone can edit them, and the
 * export leaves the building as a file somebody opens in Excel. Both deserve
 * to be checked without a database.
 */

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

/** Orders shown per page. */
export const ORDERS_PER_PAGE = 20;

/** Reads `?page=`, clamped to something that exists. */
export function parsePage(raw: string | undefined, totalPages: number): number {
  const n = Number(raw ?? 1);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.floor(n)), Math.max(1, totalPages));
}

/**
 * Which page numbers to draw, centred on the current one.
 *
 * A shop with sixty pages cannot have sixty buttons, and dropping to "‹ ›"
 * alone costs the admin the ability to jump. This keeps a fixed-width window
 * that slides, and stays anchored at either end rather than shrinking there.
 */
export function pageWindow(current: number, totalPages: number, span = 5): number[] {
  const total = Math.max(1, totalPages);
  const size = Math.min(span, total);
  let start = current - Math.floor(size / 2);
  start = Math.max(1, Math.min(start, total - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}

/** "Hiển thị 1–20 / 356 đơn hàng" — the numbers, not the sentence. */
export function pageRange(
  page: number,
  perPage: number,
  matching: number,
): { from: number; to: number } {
  if (matching === 0) return { from: 0, to: 0 };
  const from = (page - 1) * perPage + 1;
  return { from, to: Math.min(page * perPage, matching) };
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
