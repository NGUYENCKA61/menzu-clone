/**
 * When the bot must hand a chat to the admin.
 *
 * The CRM desk (29/10/2026) runs on one rule: the bot only talks about the
 * catalogue and the manuals; anything touching money, a key that still fails,
 * or a customer who is past arguing goes to a human. These checks read the
 * customer's message, not the bot's answer — the hand-off has to happen
 * BEFORE a model gets to improvise about a refund.
 *
 * Matching is done on a folded copy of the text (lowercase, diacritics
 * stripped, đ→d) so "hoàn tiền", "hoan tien" and "HOÀN TIỀN" are one word.
 * Pure module: no imports, tested in tests/chatHandoff.test.ts.
 */

/** The reason written on the thread when the customer presses the button. */
export const HANDOFF_BUTTON_REASON = "Khách bấm nút Gặp admin";

/** Lowercase, strip combining marks, fold đ — Vietnamese-safe enough here. */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

/**
 * Each rule is a reason plus the folded phrases that prove it. Order matters:
 * the first hit wins, and the angriest signals sit on top so the desk sees
 * "Khách bức xúc" rather than a milder label the same message also matches.
 */
const RULES: { reason: string; phrases: RegExp[] }[] = [
  {
    reason: "Khách bức xúc",
    phrases: [
      /lua dao/,
      /\bscam\b/,
      /bao cong an/,
      /to cao/,
      /\btreo\b.{0,12}\btien\b/,
      /\ban\b.{0,6}\btien\b/,
      /cut tien/,
    ],
  },
  {
    reason: "Đòi gặp admin",
    phrases: [
      /gap admin/,
      /\badmin oi\b/,
      /can admin/,
      /goi admin/,
      /noi chuyen voi admin/,
      /gap nguoi that/,
      /gap nhan vien/,
      /cho minh gap/,
    ],
  },
  {
    reason: "Hỏi về tiền, nạp, hoàn",
    phrases: [
      /hoan tien/,
      /hoan lai/,
      /doi lai tien/,
      /tra lai tien/,
      /\bnap\b.{0,20}\b(chua|khong|ko|k)\b.{0,12}\b(vao|len|nhan|cong|thay)\b/,
      /\b(chua|khong|ko|k)\b.{0,12}\b(vao|len|nhan|cong|thay)\b.{0,12}\btien\b/,
      /chuyen khoan.{0,24}\b(chua|khong|ko|k|loi|sai)\b/,
      /mat tien/,
      /bi tru tien/,
      /tru tien.{0,16}\b(sai|nham|2|hai)\b/,
      /sai so du/,
      /thieu tien/,
    ],
  },
  {
    reason: "Key hoặc đơn đã mua bị lỗi",
    phrases: [
      /\bkey\b.{0,20}\b(khong|ko|k|chua)\b.{0,12}\b(chay|hoat dong|nhan|ve|dung|duoc)\b/,
      /\b(khong|ko|k|chua)\b.{0,10}\bnhan\b.{0,10}\bkey\b/,
      /key loi/,
      /sai key/,
      /key het han.{0,16}\b(som|roi ma|moi mua)\b/,
      /\bdon\b.{0,14}\b(loi|sai|chua giao|khong giao|ko giao)\b/,
      /mua roi.{0,20}\b(khong|ko|k|chua)\b.{0,12}\b(nhan|thay|co|duoc)\b/,
      /acc.{0,16}\b(sai|khong vao duoc|ko vao duoc|doi mat khau|bi khoa)\b/,
    ],
  },
];

/**
 * The reason this message needs a human, or null when the bot may answer.
 * The caller writes the reason on the thread and pings Telegram.
 */
export function handoffReason(text: string): string | null {
  const folded = foldText(text);
  for (const rule of RULES) {
    for (const phrase of rule.phrases) {
      if (phrase.test(folded)) return rule.reason;
    }
  }
  return null;
}
