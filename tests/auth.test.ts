import { describe, expect, it } from "vitest";

import { createHash } from "node:crypto";

import {
  hashPassword,
  isLegacyHash,
  sessionExpiry,
  validateCredentials,
  verifyPassword,
} from "@/lib/auth";

/** What the old PHP site stored: sha1(md5(password)), as 40 hex characters. */
function oldSiteHash(password: string): string {
  const md5 = createHash("md5").update(password, "utf8").digest("hex");
  return `sha1md5$${createHash("sha1").update(md5, "utf8").digest("hex")}`;
}

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

describe("hashes imported from the old PHP site", () => {
  it("lets someone in with the password they already had", async () => {
    expect(await verifyPassword("matkhau123", oldSiteHash("matkhau123"))).toBe(true);
  });

  it("still refuses the wrong password", async () => {
    expect(await verifyPassword("matkhau124", oldSiteHash("matkhau123"))).toBe(false);
  });

  it("handles a Vietnamese password byte for byte", async () => {
    expect(await verifyPassword("mậtKhẩu@2020", oldSiteHash("mậtKhẩu@2020"))).toBe(true);
    expect(await verifyPassword("matKhau@2020", oldSiteHash("mậtKhẩu@2020"))).toBe(false);
  });

  it("refuses a hash of the wrong length or a made-up algorithm", async () => {
    expect(await verifyPassword("matkhau123", "sha1md5$abc")).toBe(false);
    expect(await verifyPassword("matkhau123", "sha1md5$")).toBe(false);
    expect(await verifyPassword("matkhau123", "md5$5f4dcc3b5aa765d61d8327deb882cf99")).toBe(
      false,
    );
    // Plain sha1(password) is NOT the old recipe — it must not verify.
    expect(
      await verifyPassword("matkhau123", `sha1$${createHash("sha1").update("matkhau123").digest("hex")}`),
    ).toBe(false);
    expect(await verifyPassword("matkhau123", "khongphaithuattoan$abcd")).toBe(false);
  });

  it("knows which stored hashes still need upgrading", async () => {
    expect(isLegacyHash(oldSiteHash("matkhau123"))).toBe(true);
    expect(isLegacyHash(await hashPassword("matkhau123"))).toBe(false);
    // Nothing stored is nothing to upgrade — the account signs in some other way.
    expect(isLegacyHash(null)).toBe(false);
  });

  it("a re-hash of the same password verifies under the new scheme", async () => {
    const old = oldSiteHash("matkhau123");
    expect(await verifyPassword("matkhau123", old)).toBe(true);

    // What the login route does the moment the old hash checks out.
    const upgraded = await hashPassword("matkhau123");
    expect(isLegacyHash(upgraded)).toBe(false);
    expect(await verifyPassword("matkhau123", upgraded)).toBe(true);
    expect(await verifyPassword("matkhau124", upgraded)).toBe(false);
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
