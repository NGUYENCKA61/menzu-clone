/**
 * The assistant's second door (the owner, 13/10/2026: "tích hợp AI chat bot
 * free vào web thử"). Claude has no free tier; Google's AI Studio, Groq,
 * OpenRouter and Mistral all hand out keys with a free allowance, and all of
 * them answer at POST {base}/chat/completions in the OpenAI dialect. No SDK:
 * one fetch and one JSON shape, read here with no network in sight so the
 * reading can be tested.
 */

export const ASSISTANT_PROVIDERS = ["claude", "compatible"] as const;
export type AssistantProvider = (typeof ASSISTANT_PROVIDERS)[number];

export function readAssistantProvider(value: unknown): AssistantProvider {
  return value === "compatible" ? "compatible" : "claude";
}

/**
 * Services with a free allowance, as Cấu hình offers them. The address and
 * the model are starting points the admin may edit: a model name is retired
 * every few months, the address almost never.
 */
export const ASSISTANT_PRESETS = [
  {
    id: "gemini",
    name: "Google Gemini (AI Studio)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
] as const;

/** "https://host/v1/" → "https://host/v1/chat/completions". */
export function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.trim().replace(/\/+$/, "")}/chat/completions`;
}

/** Whether the three things a call needs are all there. */
export function compatibleReady(s: {
  assistantBaseUrl: string;
  assistantModel: string;
  assistantApiKey: string;
}): boolean {
  return (
    /^https?:\/\//i.test(s.assistantBaseUrl.trim()) &&
    s.assistantModel.trim().length > 0 &&
    s.assistantApiKey.trim().length > 0
  );
}

/**
 * The answer in such a service's reply, or null when there is none. The text
 * is a string for most services and a list of parts for some; a reasoning
 * model may wrap its thinking in <think> tags, which a customer never sees.
 */
export function readChatCompletion(body: unknown): string | null {
  const choices = (body as { choices?: unknown } | null)?.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const content = (choices[0] as { message?: { content?: unknown } } | null)
    ?.message?.content;
  let text: string;
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .map((part) =>
        part &&
        typeof part === "object" &&
        typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : "",
      )
      .join("");
  } else {
    return null;
  }
  const clean = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  return clean || null;
}

/** What a refused call tells the log: the kind, and the service's own words, short. */
export function compatibleFailure(
  status: number,
  body: string,
): { kind: "auth" | "rate" | "other"; detail: string } {
  const kind =
    status === 401 || status === 403
      ? "auth"
      : status === 429
        ? "rate"
        : "other";
  return {
    kind,
    detail: `${status}: ${body.replace(/\s+/g, " ").slice(0, 200)}`,
  };
}
