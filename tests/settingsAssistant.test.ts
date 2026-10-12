import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  parseSettings,
  serializeSettings,
  validateSettings,
  type ShopSettings,
} from "@/lib/settings";

/** The assistant's four model settings survive the round trip through the table. */
describe("the assistant's model settings", () => {
  it("default to Claude through the environment, with nothing else filled", () => {
    const s = parseSettings([]);
    expect(s.assistantProvider).toBe("claude");
    expect(s.assistantBaseUrl).toBe("");
    expect(s.assistantModel).toBe("");
    expect(s.assistantApiKey).toBe("");
  });

  it("read back a compatible service, and refuse a provider nobody offers", () => {
    const saved = normalizeSettings({
      ...DEFAULT_SETTINGS,
      assistantProvider: "compatible",
      assistantBaseUrl: " https://api.groq.com/openai/v1 ",
      assistantModel: " llama-3.3-70b-versatile ",
      assistantApiKey: " gsk_x ",
    });
    const back = parseSettings(serializeSettings(saved));
    expect(back.assistantProvider).toBe("compatible");
    expect(back.assistantBaseUrl).toBe("https://api.groq.com/openai/v1");
    expect(back.assistantModel).toBe("llama-3.3-70b-versatile");
    expect(back.assistantApiKey).toBe("gsk_x");

    const odd = normalizeSettings({
      ...DEFAULT_SETTINGS,
      assistantProvider: "gpt" as unknown as ShopSettings["assistantProvider"],
    });
    expect(odd.assistantProvider).toBe("claude");
  });

  it("refuse an address that is not a URL, only when that door is chosen", () => {
    const bare = {
      ...DEFAULT_SETTINGS,
      assistantBaseUrl: "api.groq.com/openai/v1",
    };
    expect(
      validateSettings({ ...bare, assistantProvider: "compatible" }),
    ).toMatch(/http/);
    expect(
      validateSettings({ ...bare, assistantProvider: "claude" }),
    ).toBeNull();
    expect(
      validateSettings({
        ...bare,
        assistantProvider: "compatible",
        assistantBaseUrl: "https://api.groq.com/openai/v1",
      }),
    ).toBeNull();
  });
});
