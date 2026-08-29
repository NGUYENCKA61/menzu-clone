import { describe, expect, it } from "vitest";

import {
  currentOrderIdOf,
  deliversAutomatically,
  LOGIN_NOTE_MAX,
  LOGIN_PASSWORD_MAX,
  LOGIN_USERNAME_MAX,
  loginHandover,
  parseLoginInput,
  readLogin,
  tagOf,
} from "@/lib/accountLogin";

/**
 * Who sees a sold account's sign-in, and what the admin is allowed to store.
 * Reading and writing the row itself is a database round trip and is tested
 * by running it.
 */
const account = {
  productType: "ACCOUNT_GAME",
  currentOrderId: "order-1",
  tag: "NFA",
  loginUsername: "riot_user",
  loginPassword: "S3cret!",
  loginNote: "Đổi mật khẩu ngay sau khi nhận",
};

const bare = {
  productType: "ACCOUNT_GAME",
  currentOrderId: "order-1",
  tag: "NFA",
  loginUsername: null,
  loginPassword: null,
  loginNote: null,
};

describe("readLogin", () => {
  it("returns the sign-in when both halves are there", () => {
    expect(readLogin(account)).toEqual({
      username: "riot_user",
      password: "S3cret!",
      note: "Đổi mật khẩu ngay sau khi nhận",
    });
  });

  it("returns nothing for half a sign-in", () => {
    // A username alone is not something a buyer can use, and printing it
    // would only say the shop started and stopped.
    expect(readLogin({ ...bare, loginUsername: "riot_user" })).toBeNull();
    expect(readLogin({ ...bare, loginPassword: "S3cret!" })).toBeNull();
    expect(readLogin({ ...bare, loginUsername: "   ", loginPassword: "x" })).toBeNull();
  });

  it("leaves the note out when it is blank", () => {
    expect(readLogin({ ...account, loginNote: "  " })?.note).toBeNull();
    expect(readLogin({ ...account, loginNote: null })?.note).toBeNull();
  });
});

describe("loginHandover", () => {
  const paid = { id: "order-1", status: "PAID" };

  it("hides the row from a buyer whose order has been sold past", () => {
    // The account went back on the shelf and somebody else paid for it: the
    // row now holds their sign-in. Nothing moves the first order off PAID,
    // so the latest paid order is what says whose the row is.
    const resold = { ...account, currentOrderId: "order-2" };
    expect(loginHandover(paid, resold)).toEqual({ state: "none" });
    expect(loginHandover({ ...paid, id: "order-2" }, resold).state).toBe("ready");
    // Not even a "get in touch" line: the row is nobody's business but the
    // latest buyer's.
    expect(loginHandover(paid, { ...resold, tag: null })).toEqual({ state: "none" });
  });

  it("treats an order as current when the caller looked nothing up", () => {
    expect(loginHandover(paid, { ...account, currentOrderId: null }).state).toBe("ready");
  });

  it("reads the current order off the one-row include", () => {
    expect(currentOrderIdOf({ orders: [{ id: "order-9" }] })).toBe("order-9");
    expect(currentOrderIdOf({ orders: [] })).toBeNull();
  });

  it("hands a paid account order its sign-in", () => {
    expect(loginHandover(paid, account)).toEqual({
      state: "ready",
      login: {
        username: "riot_user",
        password: "S3cret!",
        note: "Đổi mật khẩu ngay sau khi nhận",
      },
    });
  });

  it("sends the buyer to the shop when an NFA row carries no sign-in", () => {
    // No queue: the buyer is told to get in touch. A sign-in typed onto the
    // row later still shows up, because the page reads the row live.
    expect(loginHandover(paid, bare)).toEqual({ state: "manual" });
  });

  it("hands anything that is not NFA over in person, sign-in or not", () => {
    // FULL THÔNG TIN comes with a mailbox to change hands; an untagged
    // account is not known to be NFA. Neither prints what is on the row.
    for (const tag of ["FULL THÔNG TIN", "", null]) {
      expect(loginHandover(paid, { ...account, tag })).toEqual({ state: "manual" });
      expect(loginHandover(paid, { ...bare, tag })).toEqual({ state: "manual" });
    }
  });

  it("reads the tag case-blind and off the one-row include", () => {
    expect(deliversAutomatically("nfa")).toBe(true);
    expect(deliversAutomatically(" NFA ")).toBe(true);
    expect(deliversAutomatically("FULL THÔNG TIN")).toBe(false);
    expect(deliversAutomatically(null)).toBe(false);
    expect(tagOf({ tags: [{ label: "NFA" }] })).toBe("NFA");
    expect(tagOf({ tags: [] })).toBeNull();
  });

  it("shows nothing on an order that was never paid or was reversed", () => {
    // The account went back on the shelf and may be sold to somebody else,
    // whose sign-in the first buyer must not keep reading.
    for (const status of ["PENDING", "CANCELLED", "REFUNDED"]) {
      expect(loginHandover({ ...paid, status }, account)).toEqual({ state: "none" });
    }
  });

  it("never applies to software, whatever its row looks like", () => {
    // Tools hand out keys. A software row with these columns filled — by a
    // script, by hand — must not put a "pending" badge on every key order.
    expect(loginHandover(paid, { ...account, productType: "SOFTWARE_GAME" })).toEqual({
      state: "none",
    });
    expect(loginHandover(paid, { ...bare, productType: "SOFTWARE_GAME" })).toEqual({
      state: "none",
    });
  });
});

describe("parseLoginInput", () => {
  it("ignores a request that says nothing about the sign-in", () => {
    // A price-only PATCH must not wipe the sign-in it did not mention.
    expect(parseLoginInput(null)).toEqual({ kind: "untouched" });
    expect(parseLoginInput({})).toEqual({ kind: "untouched" });
    expect(parseLoginInput({ price: 1 } as never)).toEqual({ kind: "untouched" });
  });

  it("stores a trimmed sign-in and note", () => {
    // Pasted off a spreadsheet, a cell arrives with the whitespace around it,
    // and a password with a trailing space fails the buyer's first login.
    expect(
      parseLoginInput({
        loginUsername: "  riot_user ",
        loginPassword: " S3cret! ",
        loginNote: " mail gốc: a@b.c ",
      }),
    ).toEqual({
      kind: "set",
      value: {
        loginUsername: "riot_user",
        loginPassword: "S3cret!",
        loginNote: "mail gốc: a@b.c",
      },
    });
  });

  it("clears the row when both fields are emptied", () => {
    // How a shop takes a sign-in back off an account it is re-listing.
    expect(
      parseLoginInput({ loginUsername: "", loginPassword: "  ", loginNote: "" }),
    ).toEqual({
      kind: "set",
      value: { loginUsername: null, loginPassword: null, loginNote: null },
    });
  });

  it("keeps a note without a sign-in, and drops a blank note", () => {
    expect(parseLoginInput({ loginNote: "liên hệ zalo" })).toEqual({
      kind: "set",
      value: { loginUsername: null, loginPassword: null, loginNote: "liên hệ zalo" },
    });
    expect(
      parseLoginInput({ loginUsername: "u", loginPassword: "p", loginNote: "   " }),
    ).toEqual({
      kind: "set",
      value: { loginUsername: "u", loginPassword: "p", loginNote: null },
    });
  });

  it("refuses half a sign-in", () => {
    expect(parseLoginInput({ loginUsername: "riot_user", loginPassword: "" }).kind).toBe(
      "invalid",
    );
    expect(parseLoginInput({ loginUsername: "", loginPassword: "S3cret!" }).kind).toBe(
      "invalid",
    );
    // One field mentioned and the other absent is the same shape: the row
    // would end up with one half filled.
    expect(parseLoginInput({ loginPassword: "S3cret!" }).kind).toBe("invalid");
  });

  it("caps each field", () => {
    const long = (n: number) => "x".repeat(n + 1);
    expect(
      parseLoginInput({ loginUsername: long(LOGIN_USERNAME_MAX), loginPassword: "p" }).kind,
    ).toBe("invalid");
    expect(
      parseLoginInput({ loginUsername: "u", loginPassword: long(LOGIN_PASSWORD_MAX) }).kind,
    ).toBe("invalid");
    expect(
      parseLoginInput({ loginUsername: "u", loginPassword: "p", loginNote: long(LOGIN_NOTE_MAX) })
        .kind,
    ).toBe("invalid");
  });

  it("treats a non-string as blank rather than storing it", () => {
    // A body that carries a number or an object where text was expected is a
    // malformed client, not a sign-in; it is read as empty and the both-or-
    // neither rule then says what to do with it.
    expect(parseLoginInput({ loginUsername: 42, loginPassword: 42 })).toEqual({
      kind: "set",
      value: { loginUsername: null, loginPassword: null, loginNote: null },
    });
    expect(parseLoginInput({ loginUsername: "u", loginPassword: { a: 1 } }).kind).toBe(
      "invalid",
    );
  });
});
