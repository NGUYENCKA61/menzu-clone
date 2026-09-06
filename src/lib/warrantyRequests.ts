/**
 * A buyer's report that a tool they paid for is not working.
 *
 * Warranty is the promise before a refund: the shop fixes the thing — a fresh
 * key, an update, a hand with the install — and only when it cannot does money
 * come into it. The rules here are shared by the form, the page and the route,
 * so none of them can promise what another refuses.
 */

export type WarrantyIssue = "KEY_INVALID" | "DETECTED" | "INSTALL" | "OTHER";

/** What can go wrong, in the buyer's words, with a line to help them pick. */
export const WARRANTY_ISSUE: Record<WarrantyIssue, { label: string; hint: string }> = {
  KEY_INVALID: {
    label: "Key không hoạt động",
    hint: "Nhập key báo sai, hết hạn sớm hoặc không kích hoạt được.",
  },
  DETECTED: {
    label: "Tool bị phát hiện / tài khoản bị khóa",
    hint: "Game báo phát hiện, ban hoặc khóa sau khi dùng.",
  },
  INSTALL: {
    label: "Không cài được / không chạy",
    hint: "Lỗi lúc cài, mở không lên, crash, thiếu file.",
  },
  OTHER: {
    label: "Lỗi khác",
    hint: "Mô tả rõ ở phần bên dưới.",
  },
};

export const WARRANTY_ISSUE_KEYS = Object.keys(WARRANTY_ISSUE) as WarrantyIssue[];

/** The chosen issue, or the sentence to show instead of accepting it. */
export function readIssue(
  value: unknown,
): { ok: true; issue: WarrantyIssue } | { ok: false; error: string } {
  const issue = typeof value === "string" ? value.trim() : "";
  if ((WARRANTY_ISSUE_KEYS as string[]).includes(issue)) {
    return { ok: true, issue: issue as WarrantyIssue };
  }
  return { ok: false, error: "Chọn loại lỗi bạn gặp." };
}

export type WarrantyStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export const WARRANTY_STATUS: Record<
  WarrantyStatus,
  { label: string; tile: string; dot: string }
> = {
  OPEN: {
    label: "Mới gửi",
    tile: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-500",
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    tile: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    dot: "bg-sky-500",
  },
  RESOLVED: {
    label: "Đã xử lý",
    tile: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-500",
  },
};

/** A ticket the shop has not closed yet. */
export function warrantyOpen(status: string): boolean {
  return status !== "RESOLVED";
}

/**
 * Short enough to be lazy, long enough to be answerable — the same floor the
 * refund form keeps, for the same reason: "loi key" is not a report.
 */
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 1000;

export const DESCRIPTION_TOO_SHORT = `Vui lòng mô tả rõ hơn — ít nhất ${DESCRIPTION_MIN} ký tự.`;
export const DESCRIPTION_TOO_LONG = `Mô tả tối đa ${DESCRIPTION_MAX} ký tự.`;

/** The trimmed description, or the sentence to show instead of accepting it. */
export function readDescription(
  value: unknown,
): { ok: true; description: string } | { ok: false; error: string } {
  const description = typeof value === "string" ? value.trim() : "";
  if (description.length < DESCRIPTION_MIN) {
    return { ok: false, error: DESCRIPTION_TOO_SHORT };
  }
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, error: DESCRIPTION_TOO_LONG };
  }
  return { ok: true, description };
}

/**
 * Whether this order can be reported on, and what to say when it cannot.
 *
 * Two refusals. An order that was never charged, or has already been paid
 * back, has nothing under warranty. One with a report still open should not
 * collect a second while the shop is working the first — the answer goes on
 * the ticket that exists. No clock: the shop closes what it has dealt with.
 */
export function warrantyBlockedReason({
  orderStatus,
  openRequest,
}: {
  orderStatus: string;
  openRequest: boolean;
}): string | null {
  if (orderStatus !== "PAID") {
    return "Chỉ đơn đã thanh toán mới yêu cầu bảo hành được.";
  }
  if (openRequest) {
    return "Đơn này đang có một yêu cầu bảo hành chưa xử lý xong — shop sẽ trả lời trên yêu cầu đó.";
  }
  return null;
}
