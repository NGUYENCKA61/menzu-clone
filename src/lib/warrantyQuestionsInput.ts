import type { Prisma } from "@prisma/client";

import { parseQuestionSet } from "@/lib/warrantyDetails";

/**
 * The "warrantyQuestions" field of an admin edit, as the three routes that
 * take it (categories, software, products) read it:
 *
 * - absent: leave the stored set alone;
 * - null or an empty list: clear it, so the product inherits;
 * - a list that reads back: the set;
 * - anything else: refused, with QUESTIONS_BAD_MESSAGE for the admin. A set
 *   that does not read back is a mistake they should see, not a product
 *   quietly back on the defaults.
 */
export const QUESTIONS_BAD = Symbol("warranty questions refused");

export const QUESTIONS_BAD_MESSAGE =
  "Bộ câu hỏi bổ sung chưa hợp lệ: mỗi câu cần tiêu đề, và hoặc không có đáp án (khách tự ghi), hoặc từ 2 đến 6 đáp án khác nhau.";

export function readQuestionSet(
  raw: unknown,
): Prisma.InputJsonValue | null | undefined | typeof QUESTIONS_BAD {
  if (raw === undefined) return undefined;
  if (raw === null || (Array.isArray(raw) && raw.length === 0)) return null;
  const set = parseQuestionSet(raw);
  // Stored as the parsed, trimmed shape, as plain JSON.
  return set
    ? (JSON.parse(JSON.stringify(set)) as Prisma.InputJsonValue)
    : QUESTIONS_BAD;
}
