/**
 * "Hướng dẫn cài đặt" and "Hướng dẫn thiết lập & sử dụng" — the two how-to
 * blocks, per product.
 *
 * Written in the same rich editor the description and the feature note use,
 * stored the same way, and caged by the same allowlist. A product with nothing
 * written prints DEFAULT_GUIDE, which is the sentence every tool printed when
 * this block lived in the component: a shop that has not written a guide yet
 * still tells the buyer something rather than showing an empty heading.
 */

import {
  docHtmlIsEmpty,
  isHtmlBody,
  plainToDocHtml,
  sanitizeDocHtml,
} from "@/lib/docHtml";

/** What every tool said before the block could be edited. */
export const DEFAULT_GUIDE =
  "Sau khi thanh toán thành công, hệ thống sẽ cung cấp sản phẩm theo phương " +
  "thức giao hàng được cấu hình. Vui lòng đọc hướng dẫn sử dụng và kiểm tra " +
  "yêu cầu hệ thống trước khi cài đặt.";

/** Under "Hướng dẫn thiết lập & sử dụng" until the shop writes one. */
export const DEFAULT_SETUP_GUIDE =
  "Sau khi cài đặt, mở tool và nhập key đã nhận để kích hoạt, bật các tính " +
  "năng cần dùng rồi vào game. Cần hỗ trợ thiết lập, liên hệ shop kèm mã đơn.";

/**
 * Cleans what the editor sends. An empty document stores as null rather than
 * as `<p></p>`, because an untouched editor still sends markup and storing it
 * would replace the default sentence with a blank line.
 */
export function cleanGuideHtml(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!isHtmlBody(value)) return value;
  const clean = sanitizeDocHtml(value);
  return docHtmlIsEmpty(clean) ? null : clean;
}

/** The stored guide as the editor wants it: HTML, with legacy text lifted. */
export function guideToEditorHtml(stored: string | null | undefined): string {
  if (!stored) return "";
  return isHtmlBody(stored) ? stored : plainToDocHtml(stored);
}
