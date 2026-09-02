/**
 * Gifts the shop announces and then has to post.
 *
 * The wheel already knows how to owe somebody a parcel: a PENDING SpinWin is
 * the record, the winner fills the address on its page, and the Gửi quà queue
 * works from the same row. A gift announced from the notices desk is the same
 * errand with a different origin, so it becomes the same row rather than a
 * second half-built delivery system beside it.
 *
 * The notice's button is one address shared by every reader, so it points at
 * the resolver page, which sends each of them to their own parcel.
 */

/** Where a gift notice's button goes. Per-reader resolution happens there. */
export const GIFT_PARCEL_HREF = "/vong-quay/qua/can-dien";

/** What that button says. */
export const GIFT_PARCEL_LABEL = "Điền địa chỉ nhận";

/** Longest gift name; it has to fit a queue row and a parcel label. */
export const GIFT_LABEL_MAX = 80;

/**
 * The `prizeId` a gift parcel carries.
 *
 * Not a wheel prize, and deliberately traceable: the announcement it came from
 * is readable straight off the row, and it is what makes opening the parcels
 * twice a no-op.
 */
export function giftPrizeId(announcementId: string): string {
  return `gift:${announcementId}`;
}

/** Whether a row is a parcel this module opened, rather than a wheel win. */
export function isGiftParcel(prizeId: string): boolean {
  return prizeId.startsWith("gift:");
}

/**
 * Reads the gift name off a payload.
 *
 * Empty means "no parcel" rather than an error: most notices are not gifts,
 * and the box being blank is how the desk says so.
 */
export function readGiftLabel(
  value: unknown,
): { ok: true; label: string | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, label: null };
  if (typeof value !== "string") return { ok: false, error: "Tên quà không hợp lệ" };
  const label = value.trim();
  if (!label) return { ok: true, label: null };
  if (label.length > GIFT_LABEL_MAX) {
    return { ok: false, error: `Tên quà tối đa ${GIFT_LABEL_MAX} ký tự` };
  }
  return { ok: true, label };
}

/**
 * Whether a notice as written actually owes parcels.
 *
 * A gift with nobody named on it has nowhere to go — "tặng tất cả mọi người
 * một cái áo" is not a thing a shop can post — so a parcel gift has to be
 * addressed to specific accounts, and the desk is told rather than quietly
 * having the flag dropped.
 */
export function giftParcelProblem(input: {
  type: string;
  audience: string;
  giftLabel: string | null;
}): string | null {
  if (!input.giftLabel) return null;
  if (input.type !== "GIFT") {
    return "Quà cần giao chỉ dùng cho thông báo loại Quà tặng";
  }
  if (input.audience !== "USERS") {
    return "Quà cần giao phải gửi cho tài khoản cụ thể, không gửi cho tất cả";
  }
  return null;
}
