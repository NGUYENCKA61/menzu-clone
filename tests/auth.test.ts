import { describe, expect, it } from "vitest";

import {
  hashPassword,
  sessionExpiry,
  validateCredentials,
  verifyPassword,
} from "@/lib/auth";

describe("password hashing", () => {
  it("accepts the correct password", async () => {
    const stored = await hashPassword("matkhau123");
    expect(await verifyPassword("matkhau123", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("matkhau123");
    expect(await verifyPassword("matkhau124", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    // …and both still verify.
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("never stores the password in the hash", async () => {
    const stored = await hashPassword("plaintext-secret");
    expect(stored).not.toContain("plaintext-secret");
  });

  it("returns false rather than throwing on malformed stored values", async () => {
    for (const bad of [null, "", "notascrypthash", "scrypt$only-two", "bcrypt$a$b"]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });

  it("rejects a hash whose salt or key length was tampered with", async () => {
    const stored = await hashPassword("matkhau123");
    const [, salt, key] = stored.split("$");
    expect(await verifyPassword("matkhau123", `scrypt$${salt.slice(0, 8)}$${key}`)).toBe(false);
    expect(await verifyPassword("matkhau123", `scrypt$${salt}$${key.slice(0, 16)}`)).toBe(false);
  });
});

describe("credential validation", () => {
  it("requires a username of at least 3 characters", () => {
    expect(validateCredentials("ab", "matkhau123")).toContain("3 ký tự");
    expect(validateCredentials("abc", "matkhau123")).toBeNull();
  });

  it("requires a password of at least 6 characters", () => {
    expect(validateCredentials("abcdef", "12345")).toContain("6 ký tự");
    expect(validateCredentials("abcdef", "123456")).toBeNull();
  });

  it("ignores surrounding whitespace when measuring the username", () => {
    expect(validateCredentials("  ab  ", "matkhau123")).toContain("3 ký tự");
  });
});

describe("session expiry", () => {
  it("is in the future", () => {
    expect(sessionExpiry().getTime()).toBeGreaterThan(Date.now());
  });
});
