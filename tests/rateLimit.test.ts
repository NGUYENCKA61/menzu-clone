import { describe, expect, it } from "vitest";

import { clientIp } from "@/lib/clientIp";

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/auth/login", { method: "POST", headers });
}

describe("clientIp", () => {
  it("reads a single forwarded address", () => {
    expect(clientIp(requestWith({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("takes the first hop of a proxy chain, not the last", () => {
    // Every proxy appends itself, so the original client is leftmost. Reading
    // the right-hand entry would bucket every visitor behind one CDN node
    // together and lock them all out at once.
    expect(
      clientIp(requestWith({ "x-forwarded-for": "203.0.113.9, 70.41.3.18, 150.172.238.178" })),
    ).toBe("203.0.113.9");
  });

  it("trims the whitespace proxies insert after each comma", () => {
    expect(clientIp(requestWith({ "x-forwarded-for": "  203.0.113.9 , 70.41.3.18" }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to x-real-ip when no forwarded chain is present", () => {
    expect(clientIp(requestWith({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("prefers the forwarded chain over x-real-ip", () => {
    expect(
      clientIp(requestWith({ "x-forwarded-for": "203.0.113.9", "x-real-ip": "198.51.100.7" })),
    ).toBe("203.0.113.9");
  });

  it("returns a stable bucket when the address is unknown", () => {
    // Must never return "" — an empty key would collapse into whatever else
    // hashes to empty and could throttle unrelated callers together.
    expect(clientIp(requestWith({}))).toBe("unknown");
  });

  it("does not treat an empty header as an address", () => {
    expect(clientIp(requestWith({ "x-real-ip": "   " }))).toBe("unknown");
  });
});
