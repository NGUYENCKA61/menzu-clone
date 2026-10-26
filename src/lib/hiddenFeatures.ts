/**
 * Features the owner has hidden for now. Each flag only takes the feature's
 * way in off the customer's screens (tabs, menu links, rows, list entries);
 * its pages, data and admin desks stay as they are, so turning a flag back
 * to true brings the feature back as it was. Listed in the backlog review
 * page (artifact MCR1Gueg71fvpGtAVreJR5).
 */

/** "Xác thực cấp 2": Bảo mật's tab and the profile's "Xác minh cấp 2"
 *  (26/10/2026: "cái xác thực cấp 2 tạm ẩn đi"; back on lab 3200 the
 *  same day: "vậy thêm lại cái xác minh cấp 2 đi"). */
export const SHOW_LEVEL2 = true;

/** "Nâng cấp đại lý": the account sidebar's and the header menu's link, and
 *  the line under Cộng tác viên (26/10/2026: "ẩn luôn cái nâng cấp đại lý"). */
export const SHOW_AGENCY_UPGRADE = false;

/** "Hướng dẫn liên quan" under the write-up on a tool's own page
 *  (26/10/2026: "hướng dẫn liên quan trong chi tiết phần mềm ẩn luôn đi").
 *  Category and account pages keep theirs. */
export const SHOW_TOOL_RELATED_GUIDES = false;

/** The "Chuẩn bị máy" row of "Hướng dẫn liên quan" wherever the section
 *  still shows (26/10/2026: "ẩn cái chuẩn bị máy luôn"). */
export const SHOW_SETUP_GUIDES_ROW = false;

/** Setup pages taken off the site for now: the page answers 404 and every
 *  list of setup steps skips it (26/10/2026: "tạm ẩn cái trang này luôn",
 *  /tai-lieu/chuan-bi/cai-runtime). Empty the list to bring them back. */
export const HIDDEN_SETUP_PAGES: readonly string[] = ["cai-runtime"];

/** The foot of a category page: "Về …" (the shelf's write-up), its
 *  "Câu hỏi thường gặp" and "Hướng dẫn liên quan" (26/10/2026: "tạm ẩn
 *  mấy cái này đi", "tại tui chưa rảnh thiết kế lại"). The FAQPage markup
 *  goes with the questions, as it may only describe what the page shows;
 *  the words stay in content/seo for the redesign. */
export const SHOW_CATEGORY_FOOT = false;
