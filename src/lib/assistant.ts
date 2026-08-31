import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import {
  catalogueToText,
  MAX_ANSWER_TOKENS,
  SYSTEM_RULES,
  type CatalogueAccount,
  type CatalogueSoftware,
  type ChatTurn,
} from "@/lib/assistantPrompt";
import { db } from "@/lib/db";
import { docHtmlToPlainText } from "@/lib/docHtml";
import { featuresOrDefault, parseFeatures } from "@/lib/productFeatures";
import { DEFAULT_GUIDE } from "@/lib/productGuide";
import { productHref } from "@/lib/routes";

/**
 * The shop's assistant: the half that talks to the database and to the model.
 *
 * Two jobs, both of which the shop's own data can answer — which tool a
 * customer should buy, and how to get one running. Everything it knows about
 * the catalogue is read fresh on each request rather than written into the
 * prompt by hand: a price typed into a prompt is a price that goes stale the
 * first time the shop edits a product.
 */

/** The model. Overridable, because the bill for this lands on the shop. */
export const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL ?? "claude-opus-5";

/** Whether the shop has given the site a key to answer with. */
export function assistantConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** How many account listings are worth carrying; the cheapest are the ones asked about. */
const ACCOUNTS_SHOWN = 20;

/** Reads the catalogue and hands it to the writer in `assistantPrompt`. */
export async function buildCatalogue(): Promise<string> {
  const [software, accounts] = await Promise.all([
    db.product.findMany({
      where: { deletedAt: null, productType: "SOFTWARE_GAME" },
      select: {
        name: true,
        code: true,
        slug: true,
        status: true,
        softwareStatus: true,
        description: true,
        features: true,
        guide: true,
        price: true,
        category: { select: { name: true, slug: true } },
        packages: {
          orderBy: { price: "asc" },
          select: { label: true, price: true, durationHours: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { deletedAt: null, productType: "ACCOUNT_GAME", status: "AVAILABLE" },
      select: {
        code: true,
        rank: true,
        price: true,
        slug: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: { price: "asc" },
      take: ACCOUNTS_SHOWN,
    }),
  ]);

  const tools: CatalogueSoftware[] = software.map((p) => ({
    name: p.name ?? p.code,
    href: productHref(p.category.slug, p.slug),
    categoryName: p.category.name,
    available: p.status === "AVAILABLE",
    softwareStatus: p.softwareStatus,
    price: Number(p.price),
    tiers: p.packages.map((t) => ({
      label: t.label,
      price: Number(t.price),
      durationHours: t.durationHours,
    })),
    features: featuresOrDefault(parseFeatures(p.features)).map((f) => ({ ...f })),
    // The editor stores HTML; markup in a prompt is tokens spent on angle
    // brackets. A product with no guide of its own carries the shop's default.
    // The setup guide is deliberately NOT here: it is sold with the tool and
    // shown only to a buyer, and this catalogue goes to whoever is chatting.
    guide: p.guide ? docHtmlToPlainText(p.guide, 900) : DEFAULT_GUIDE,
    description: p.description ? docHtmlToPlainText(p.description, 400) : "",
  }));

  const listings: CatalogueAccount[] = accounts.map((a) => ({
    code: a.code,
    href: productHref(a.category.slug, a.slug),
    categoryName: a.category.name,
    rank: a.rank,
    price: Number(a.price),
  }));

  return catalogueToText(tools, listings);
}

/**
 * One answer.
 *
 * The rules and the catalogue go in the system block behind a cache
 * breakpoint: they are identical for every visitor and change only when the
 * shop edits a product, so after the first question in each five-minute window
 * the shop pays about a tenth of the usual rate for that half of the prompt.
 *
 * Effort is low rather than thinking being switched off: this model thinks by
 * default, disabling it invites tool-call text and stray tags into the visible
 * answer, and a support reply does not need deep reasoning anyway.
 */
export async function askAssistant(history: ChatTurn[]): Promise<string> {
  const client = new Anthropic();
  const catalogue = await buildCatalogue();

  const response = await client.messages.create({
    model: ASSISTANT_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: `${SYSTEM_RULES}\n\n# DỮ LIỆU SHOP\n${catalogue}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: history.map((turn) => ({ role: turn.role, content: turn.content })),
  });

  // A safety decline is not an error — the request succeeded and the model
  // chose not to answer. The customer gets somewhere else to go.
  if (response.stop_reason === "refusal") {
    return "Xin lỗi, câu này mình không trả lời được. Bạn nhắn cho admin qua kênh hỗ trợ nhé.";
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return text || "Mình chưa hiểu ý bạn, bạn nói rõ hơn giúp mình nhé.";
}
