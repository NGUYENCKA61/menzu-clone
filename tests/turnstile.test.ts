import { describe, expect, it } from "vitest";

import { readVerifyResponse, turnstileEnabled } from "@/lib/turnstile";

describe("turnstileEnabled", () => {
  it("needs both halves", () => {
    expect(turnstileEnabled({ turnstileSiteKey: "a", turnstileSecretKey: "b" })).toBe(true);
  });

  it("stays off on a half-filled pair", () => {
    // With only the site key the browser draws a widget whose token nothing
    // can check; with only the secret there is no widget to produce one and
    // the form refuses everybody. A shop mid-way through pasting keys gets
    // yesterday's behaviour, not a locked front door.
    expect(turnstileEnabled({ turnstileSiteKey: "a", turnstileSecretKey: "" })).toBe(false);
    expect(turnstileEnabled({ turnstileSiteKey: "", turnstileSecretKey: "b" })).toBe(false);
    expect(turnstileEnabled({ turnstileSiteKey: "", turnstileSecretKey: "" })).toBe(false);
  });

  it("does not count whitespace as a key", () => {
    expect(turnstileEnabled({ turnstileSiteKey: "   ", turnstileSecretKey: "b" })).toBe(false);
  });
});

describe("readVerifyResponse", () => {
  it("passes only an explicit success", () => {
    expect(readVerifyResponse({ success: true })).toEqual({ ok: true, codes: [] });
  });

  it("refuses everything else", () => {
    // Written the other way round — treating an unexpected body as a pass — a
    // Cloudflare outage or a changed payload would quietly turn the check off
    // and nothing on screen would say so.
    expect(readVerifyResponse({ success: false }).ok).toBe(false);
    expect(readVerifyResponse({}).ok).toBe(false);
    expect(readVerifyResponse(null).ok).toBe(false);
    expect(readVerifyResponse("ok").ok).toBe(false);
    // Truthy but not the boolean true: a string "true" is not a pass.
    expect(readVerifyResponse({ success: "true" }).ok).toBe(false);
    expect(readVerifyResponse({ success: 1 }).ok).toBe(false);
  });

  it("keeps Cloudflare's codes for the log", () => {
    expect(
      readVerifyResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }).codes,
    ).toEqual(["timeout-or-duplicate"]);
    // A malformed codes field must not throw on the way to refusing.
    expect(readVerifyResponse({ success: false, "error-codes": "nope" }).codes).toEqual([]);
    expect(readVerifyResponse({ success: false, "error-codes": [1, "x"] }).codes).toEqual(["x"]);
  });
});
