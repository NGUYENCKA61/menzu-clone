import "server-only";

import { db } from "@/lib/db";
import { docHref } from "@/lib/routes";

/**
 * The bot's handbook and its retrieval — the "cho nó khôn" half of the
 * assistant (29/10/2026). The desk writes entries in CRM > Sổ tay; before
 * every answer the few entries that match the customer's words, plus the
 * wiki articles whose titles match, are handed to the model as the shop's
 * own instructions.
 *
 * Retrieval is folded-keyword scoring, not embeddings, on purpose: the
 * handbook is tens of entries, Vietnamese typed with or without diacritics,
 * and a word match the desk can predict beats a vector the desk cannot
 * debug. The day the handbook outgrows this, swap the scorer, keep the
 * shape.
 */

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

/** The question's useful words: folded, deduplicated, longest first. */
function termsOf(question: string): string[] {
  const words = fold(question)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 10);
}

export interface KnowledgeRow {
  id: string;
  title: string;
  body: string;
  internal: boolean;
  updatedAt: string;
}

export async function listKnowledge(q?: string): Promise<KnowledgeRow[]> {
  const query = q?.trim();
  const rows = await db.knowledgeEntry.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { body: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    internal: row.internal,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

/**
 * What the assistant reads before answering: the top handbook entries by
 * word overlap, and the wiki articles whose titles share a word, as
 * markdown links the model may quote. Everything is capped so a fat
 * handbook cannot blow the prompt.
 */
export async function retrieveForQuestion(question: string): Promise<string> {
  const terms = termsOf(question);
  if (terms.length === 0) return "";

  const [entries, docs] = await Promise.all([
    db.knowledgeEntry.findMany({
      // Internal entries are the desk's own reference and never reach the
      // model: what the bot reads, a patient customer can tease out of it.
      where: { internal: false },
      select: { title: true, body: true },
      take: 200,
      orderBy: { updatedAt: "desc" },
    }),
    db.docArticle.findMany({
      where: {
        body: { not: null },
        OR: terms.slice(0, 6).map((term) => ({ title: { contains: term, mode: "insensitive" } })),
      },
      select: { title: true, slug: true },
      take: 2,
      orderBy: { views: "desc" },
    }),
  ]);

  const scored = entries
    .map((entry) => {
      const title = fold(entry.title);
      const body = fold(entry.body);
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 3;
        if (body.includes(term)) score += 1;
      }
      return { entry, score };
    })
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const parts: string[] = [];
  if (scored.length > 0) {
    parts.push(
      "# SỔ TAY CỦA SHOP (ưu tiên làm theo khi khớp câu hỏi)\n" +
        scored
          .map(({ entry }) => `## ${entry.title}\n${entry.body.slice(0, 600)}`)
          .join("\n\n"),
    );
  }
  if (docs.length > 0) {
    parts.push(
      "# BÀI HƯỚNG DẪN LIÊN QUAN (gửi link cho khách khi hợp)\n" +
        docs.map((doc) => `- ${doc.title}: ${docHref(doc.slug)}`).join("\n"),
    );
  }
  return parts.join("\n\n").slice(0, 2400);
}
