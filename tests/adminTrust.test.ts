import { describe, expect, it } from "vitest";

import { ADMIN_TRUST_DAYS, adminTrusted, issueAdminTrust, readCookie } from "@/lib/adminTrust";

const base = { userId: "u1", passwordHash: "scrypt$abc$def", secret: "s3cret" };
const now = Date.parse("2026-10-23T10:00:00Z");

describe("admin trust cookie", () => {
  it("signs in again without a code for 30 days on the same browser", () => {
    const { value, expires } = issueAdminTrust({ ...base, now });
    expect(expires.getTime() - now).toBe(ADMIN_TRUST_DAYS * 24 * 60 * 60 * 1000);
    expect(adminTrusted({ ...base, cookie: value, now })).toBe(true);
    expect(adminTrusted({ ...base, cookie: value, now: expires.getTime() - 1 })).toBe(true);
    expect(adminTrusted({ ...base, cookie: value, now: expires.getTime() })).toBe(false);
  });

  it("is one admin's and one password's", () => {
    const { value } = issueAdminTrust({ ...base, now });
    expect(adminTrusted({ ...base, cookie: value, userId: "u2", now })).toBe(false);
    expect(adminTrusted({ ...base, cookie: value, passwordHash: "scrypt$new$hash", now })).toBe(false);
    expect(adminTrusted({ ...base, cookie: value, secret: "other", now })).toBe(false);
  });

  it("refuses a tampered or missing cookie", () => {
    const { value } = issueAdminTrust({ ...base, now });
    const [id, exp, mac] = value.split(".");
    expect(adminTrusted({ ...base, cookie: `${id}.${Number(exp) + 1000}.${mac}`, now })).toBe(false);
    expect(adminTrusted({ ...base, cookie: `${id}.${exp}.${mac.slice(0, -1)}0`, now })).toBe(false);
    expect(adminTrusted({ ...base, cookie: "", now })).toBe(false);
    expect(adminTrusted({ ...base, cookie: null, now })).toBe(false);
    expect(adminTrusted({ ...base, cookie: "junk", now })).toBe(false);
  });

  it("reads one cookie out of the header", () => {
    expect(readCookie("a=1; menzu_session_admin_trust=u1.2.abc; b=2", "menzu_session_admin_trust")).toBe("u1.2.abc");
    expect(readCookie("a=1", "x")).toBeNull();
    expect(readCookie(null, "x")).toBeNull();
  });
});
