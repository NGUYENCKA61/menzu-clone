import { describe, expect, it } from "vitest";

import {
  chatCompletionsUrl,
  compatibleFailure,
  compatibleReady,
  readAssistantProvider,
  readChatCompletion,
} from "@/lib/assistantProviders";

/**
 * The reading side of the assistant's second door. The call itself is not
 * made here (it needs a key and spends an allowance); what is tested is how
 * the shop decides it may call, where, and what it makes of the answer.
 */
describe("the compatible door", () => {
  it("reads the answer however the service shapes it", () => {
    expect(
      readChatCompletion({
        choices: [
          { message: { role: "assistant", content: " Gói 1 ngày 50.000đ. " } },
        ],
      }),
    ).toBe("Gói 1 ngày 50.000đ.");
    expect(
      readChatCompletion({
        choices: [
          {
            message: {
              content: [
                { type: "text", text: "A" },
                { type: "text", text: "B" },
              ],
            },
          },
        ],
      }),
    ).toBe("AB");
    expect(
      readChatCompletion({
        choices: [{ message: { content: "<think>đắn đo</think>Trả lời." } }],
      }),
    ).toBe("Trả lời.");
    expect(readChatCompletion({ choices: [] })).toBeNull();
    expect(readChatCompletion({ error: { message: "x" } })).toBeNull();
    expect(readChatCompletion("not an object")).toBeNull();
    expect(
      readChatCompletion({ choices: [{ message: { content: "   " } }] }),
    ).toBeNull();
  });

  it("builds the address and knows when the three pieces are there", () => {
    expect(chatCompletionsUrl("https://api.groq.com/openai/v1/")).toBe(
      "https://api.groq.com/openai/v1/chat/completions",
    );
    expect(chatCompletionsUrl(" https://openrouter.ai/api/v1 ")).toBe(
      "https://openrouter.ai/api/v1/chat/completions",
    );
    const ok = {
      assistantBaseUrl: "https://x/v1",
      assistantModel: "m",
      assistantApiKey: "k",
    };
    expect(compatibleReady(ok)).toBe(true);
    expect(compatibleReady({ ...ok, assistantBaseUrl: "x/v1" })).toBe(false);
    expect(compatibleReady({ ...ok, assistantModel: "" })).toBe(false);
    expect(compatibleReady({ ...ok, assistantApiKey: " " })).toBe(false);
  });

  it("names a refusal for the log, and knows only two doors", () => {
    expect(compatibleFailure(401, '{"error":"bad key"}').kind).toBe("auth");
    expect(compatibleFailure(403, "").kind).toBe("auth");
    expect(compatibleFailure(429, "slow down").kind).toBe("rate");
    expect(compatibleFailure(500, "x".repeat(400)).kind).toBe("other");
    expect(compatibleFailure(500, "x".repeat(400)).detail.length).toBeLessThan(
      220,
    );
    expect(readAssistantProvider("compatible")).toBe("compatible");
    expect(readAssistantProvider("gpt")).toBe("claude");
    expect(readAssistantProvider(undefined)).toBe("claude");
  });
});
