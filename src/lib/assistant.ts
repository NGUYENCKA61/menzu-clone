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
import {
  chatCompletionsUrl,
  compatibleFailure,
  compatibleReady,
  readChatCompletion,
} from "@/lib/assistantProviders";
import { db } from "@/lib/db";
import { docHtmlToPlainText } from "@/lib/docHtml";
import { CRM_KEYS, getSettingValue } from "@/lib/crmSettings";
import { retrieveForQuestion } from "@/lib/knowledge";
import { featuresOrDefault, parseFeatures } from "@/lib/productFeatures";
import { DEFAULT_GUIDE } from "@/lib/productGuide";
import { productHref } from "@/lib/routes";
import { runningPackageSales, tierPriceNow } from "@/lib/queries";
import type { ShopSettings } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/**
 * The shop's assistant: the half that talks to the database and to the model.
 *
 * Two jobs, both of which the shop's own data can answer — which tool a
 * customer should buy, and how to get one running. Everything it knows about
 * the catalogue is read fresh on each request rather than written into the
 * prompt by hand: a price typed into a prompt is a price that goes stale the
 * first time the shop edits a product.
 *
 * Two doors to a model: Claude through the key in the environment, or any
 * service speaking the OpenAI dialect through the address, model and key the
 * shop pastes into Cấu hình (the free allowances of Gemini, Groq, OpenRouter,
 * Mistral). Cấu hình says which; the catalogue and the rules are the same.
 */

/**
 * The Claude model. Haiku by default (the owner, 29/10/2026): a support
 * answer is a dozen lines over a cached catalogue, which is exactly the
 * small model's job at about a twentieth of the big ones' price.
 * Overridable, because the bill for this lands on the shop.
 */
export const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL ?? "claude-haiku-5-5";

/** Whether the shop has given the site a way to answer. */
export function assistantConfigured(settings: ShopSettings): boolean {
  if (settings.assistantProvider === "compatible") return compatibleReady(settings);
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** A refusal from the model's side, with what the log should say about it. */
export class AssistantUpstreamError extends Error {
  constructor(
    readonly kind: "auth" | "rate" | "other",
    detail: string,
  ) {
    super(detail);
    this.name = "AssistantUpstreamError";
  }
}

/** How many account listings are worth carrying; the cheapest are the ones asked about. */
const ACCOUNTS_SHOWN = 20;

/** A free service that has not answered in this long is not going to. */
const COMPATIBLE_TIMEOUT_MS = 60_000;

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
          select: { id: true, label: true, price: true, durationHours: true },
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

  // A tier on flash sale is quoted at the price the buyer would pay today.
  const tierSale = await runningPackageSales(
    software.flatMap((p) => p.packages.map((t) => t.id)),
  );

  const tools: CatalogueSoftware[] = software.map((p) => ({
    name: p.name ?? p.code,
    href: productHref(p.category.slug, p.slug),
    categoryName: p.category.name,
    available: p.status === "AVAILABLE",
    softwareStatus: p.softwareStatus,
    price: Number(p.price),
    tiers: p.packages.map((t) => ({
      label: t.label,
      price: Number(tierPriceNow(t, tierSale)),
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

/** A customer's screenshot, riding with the last turn of the history. */
export interface AssistantImage {
  /** The processed WebP bytes, base64 — the same file the desk stores. */
  base64: string;
  mediaType: "image/webp";
}

/** One answer, through whichever door Cấu hình names. */
export async function askAssistant(history: ChatTurn[], image?: AssistantImage): Promise<string> {
  const question = history[history.length - 1]?.content ?? "";
  const settings = await getShopSettings();
  const [catalogue, retrieved, voice] = await Promise.all([
    buildCatalogue(),
    // The handbook and matching wiki titles, pulled per question — the part
    // of the prompt that varies, so it rides OUTSIDE the cached block.
    retrieveForQuestion(question).catch(() => ""),
    // The shop's voice (CRM > Sổ tay bot): how the owner talks to customers,
    // distilled from their own fanpage answers. Read into every reply; it
    // changes rarely, so it lives in the cached half of the prompt.
    getSettingValue(CRM_KEYS.assistantVoice).catch(() => ""),
  ]);
  const voiceBlock = voice.trim()
    ? `\n\n# GIỌNG ĐIỆU CỦA SHOP (áp dụng cho mọi câu trả lời)\n${voice.trim().slice(0, 1500)}`
    : "";
  const system = `${SYSTEM_RULES}${voiceBlock}\n\n# DỮ LIỆU SHOP\n${catalogue}`;
  return settings.assistantProvider === "compatible"
    ? askCompatible(settings, retrieved ? `${system}\n\n${retrieved}` : system, history, image)
    : askClaude(system, retrieved, history, image);
}

/** The last user turn's content, with the screenshot attached when there is one. */
function claudeContent(
  turn: ChatTurn,
  last: boolean,
  image?: AssistantImage,
): string | Anthropic.ContentBlockParam[] {
  if (!last || !image) return turn.content;
  return [
    {
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64 },
    },
    { type: "text", text: turn.content },
  ];
}

/**
 * One standalone drafting call for the desk's own writing (a post for a
 * product, CRM > Đăng bài). Same doors, same keys, no catalogue: the
 * caller hands over exactly the facts the draft may use.
 */
export async function draftOnce(system: string, ask: string): Promise<string> {
  const settings = await getShopSettings();
  const history: ChatTurn[] = [{ role: "user", content: ask }];
  return settings.assistantProvider === "compatible"
    ? askCompatible(settings, system, history)
    : askClaude(system, "", history);
}

/**
 * Claude.
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
async function askClaude(
  system: string,
  retrieved: string,
  history: ChatTurn[],
  image?: AssistantImage,
): Promise<string> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: ASSISTANT_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
      // The per-question handbook block sits after the breakpoint so the
      // cached half stays identical for every visitor.
      ...(retrieved ? [{ type: "text" as const, text: retrieved }] : []),
    ],
    messages: history.map((turn, index) => ({
      role: turn.role,
      content: claudeContent(turn, index === history.length - 1, image),
    })),
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

/**
 * Any service in the OpenAI dialect. No caching to lean on, so the whole
 * prompt is paid for each time; the free allowances are counted in requests
 * and tokens per minute, and a refusal for that comes back as a 429, which
 * the route turns into "trợ lý đang bận".
 */
async function askCompatible(
  settings: ShopSettings,
  system: string,
  history: ChatTurn[],
  image?: AssistantImage,
): Promise<string> {
  const res = await fetch(chatCompletionsUrl(settings.assistantBaseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.assistantApiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.assistantModel.trim(),
      max_tokens: MAX_ANSWER_TOKENS,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        // The OpenAI dialect carries a picture as a data URL on the last
        // user turn; Gemini's compatible endpoint reads it the same way.
        ...history.map((turn, index) =>
          index === history.length - 1 && image
            ? {
                role: turn.role,
                content: [
                  {
                    type: "image_url",
                    image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
                  },
                  { type: "text", text: turn.content },
                ],
              }
            : { role: turn.role, content: turn.content },
        ),
      ],
    }),
    signal: AbortSignal.timeout(COMPATIBLE_TIMEOUT_MS),
  });

  const body = await res.text();
  if (!res.ok) {
    const failure = compatibleFailure(res.status, body);
    throw new AssistantUpstreamError(failure.kind, failure.detail);
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new AssistantUpstreamError("other", `không phải JSON: ${body.slice(0, 120)}`);
  }
  return readChatCompletion(json) ?? "Mình chưa hiểu ý bạn, bạn nói rõ hơn giúp mình nhé.";
}
