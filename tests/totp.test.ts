import { describe, expect, it } from "vitest";

import { InvalidSecretError, base32Decode, generateTotp, secondsRemaining } from "@/lib/totp";

/**
 * RFC 6238 publishes vectors for the ASCII secret "12345678901234567890".
 * Base32-encoded that is GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ, and the SHA-1
 * variant must produce these codes at these instants. If this suite passes,
 * the implementation interoperates with real authenticator apps.
 */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("base32Decode", () => {
  it("decodes the RFC secret back to its ASCII bytes", () => {
    expect(new TextDecoder().decode(base32Decode(RFC_SECRET))).toBe("12345678901234567890");
  });

  it("accepts the lowercase, spaced, padded forms authenticators display", () => {
    const decoded = base32Decode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq==");
    expect(new TextDecoder().decode(decoded)).toBe("12345678901234567890");
  });

  it("rejects characters outside the base32 alphabet", () => {
    // 0, 1, 8 and 9 are excluded from base32 precisely because they are easy
    // to confuse with O, I and B when read off a screen.
    expect(() => base32Decode("ABC1DEF")).toThrow(InvalidSecretError);
  });

  it("rejects an empty secret instead of returning an empty key", () => {
    expect(() => base32Decode("   ")).toThrow(InvalidSecretError);
  });
});

describe("generateTotp", () => {
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("matches the RFC vector at t=%i", async (seconds, expected) => {
    expect(await generateTotp(RFC_SECRET, seconds * 1000)).toBe(expected);
  });

  it("stays past 2038, where a 32-bit counter would overflow", async () => {
    // 20000000000s is well beyond the signed 32-bit epoch limit. The counter
    // is written as two 32-bit halves for exactly this reason.
    await expect(generateTotp(RFC_SECRET, 20000000000 * 1000)).resolves.toMatch(/^\d{6}$/);
  });

  it("holds the same code for a whole 30-second window", async () => {
    const [start, end] = await Promise.all([
      generateTotp(RFC_SECRET, 1111111080 * 1000),
      generateTotp(RFC_SECRET, 1111111109 * 1000),
    ]);
    expect(start).toBe(end);
  });

  it("rolls to a new code once the window ends", async () => {
    const [before, after] = await Promise.all([
      generateTotp(RFC_SECRET, 1111111109 * 1000),
      generateTotp(RFC_SECRET, 1111111110 * 1000),
    ]);
    expect(before).not.toBe(after);
  });

  it("always pads to six digits", async () => {
    // The 1234567890 vector is 005924 — proof the leading zeros survive.
    expect(await generateTotp(RFC_SECRET, 1234567890 * 1000)).toHaveLength(6);
  });
});

describe("secondsRemaining", () => {
  it("counts down within the window and never reports zero", () => {
    expect(secondsRemaining(1111111080 * 1000)).toBe(30);
    expect(secondsRemaining(1111111109 * 1000)).toBe(1);
  });
});
