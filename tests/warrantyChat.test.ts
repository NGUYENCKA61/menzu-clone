import { describe, expect, it } from "vitest";

import {
  awaitingShop,
  BURST_LIMIT,
  DAILY_LIMIT,
  mergeMessages,
  MESSAGE_MAX,
  messagePreview,
  needsShop,
  readMessage,
  sendingTooFast,
  transferDue,
  type ChatMessage,
} from "@/lib/warrantyChat";

/**
 * The conversation on a warranty ticket (01/10/2026): open until the shop
 * marks it done, a picture may stand in for words, a buyer cannot flood the
 * desk, and a ticket whose buyer spoke last is one the shop owes an answer.
 */
describe("readMessage", () => {
  it("trims and keeps a real message, line breaks and all", () => {
    expect(readMessage("  Shop ơi\r\nkey vẫn lỗi ạ  ", false)).toEqual({
      ok: true,
      body: "Shop ơi\nkey vẫn lỗi ạ",
    });
  });

  it("wants words unless a picture goes with it", () => {
    expect(readMessage("   ", false).ok).toBe(false);
    expect(readMessage(undefined, false).ok).toBe(false);
    expect(readMessage("", true)).toEqual({ ok: true, body: "" });
  });

  it("refuses an essay and anything that is not text", () => {
    expect(readMessage("x".repeat(MESSAGE_MAX + 1), false).ok).toBe(false);
    expect(readMessage("x".repeat(MESSAGE_MAX), false).ok).toBe(true);
    expect(readMessage(42, false).ok).toBe(false);
  });
});

describe("sendingTooFast", () => {
  it("lets a normal conversation through", () => {
    expect(sendingTooFast(BURST_LIMIT - 1, DAILY_LIMIT - 1)).toBeNull();
  });

  it("slows a burst, and caps a day", () => {
    expect(sendingTooFast(BURST_LIMIT, 0)).toMatch(/hơi nhanh/);
    expect(sendingTooFast(0, DAILY_LIMIT)).toMatch(/nhiều/);
  });
});

describe("awaitingShop", () => {
  it("is true while open and the buyer had the last word", () => {
    for (const status of ["OPEN", "IN_PROGRESS", "REFUNDING"] as const) {
      expect(awaitingShop(status, false)).toBe(true);
    }
  });

  it("is false once the shop answered, before anyone wrote, or when closed", () => {
    expect(awaitingShop("IN_PROGRESS", true)).toBe(false);
    expect(awaitingShop("OPEN", null)).toBe(false);
    // Done means done: nothing can be waiting on a closed ticket.
    expect(awaitingShop("RESOLVED", false)).toBe(false);
    expect(awaitingShop("REFUNDED", false)).toBe(false);
  });
});

describe("mergeMessages", () => {
  const line = (id: string, sentAt: string): ChatMessage => ({
    id,
    fromShop: false,
    body: id,
    imageUrl: null,
    status: null,
    at: "",
    sentAt,
  });

  it("shows a message the tab sent and then fetched again only once", () => {
    const sent = line("b", "2026-10-01T01:00:02.000Z");
    const merged = mergeMessages([line("a", "2026-10-01T01:00:01.000Z"), sent], [sent]);
    expect(merged.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("puts the thread in the order it was written", () => {
    const merged = mergeMessages(
      [line("c", "2026-10-01T01:00:03.000Z")],
      [line("a", "2026-10-01T01:00:01.000Z"), line("b", "2026-10-01T01:00:02.000Z")],
    );
    expect(merged.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});

describe("messagePreview", () => {
  it("flattens and shortens a message for a notice", () => {
    expect(messagePreview("Shop ơi\n\nkey   lỗi")).toBe("Shop ơi key lỗi");
    const long = messagePreview("x".repeat(300));
    expect(long.length).toBe(140);
    expect(long.endsWith("…")).toBe(true);
  });

  it("names a picture sent on its own", () => {
    expect(messagePreview("")).toBe("(ảnh)");
  });
});

describe("transferDue", () => {
  it("is a bank refund whose account has arrived", () => {
    expect(transferDue("REFUNDING", "MANUAL", "0123456789")).toBe(true);
  });

  it("waits on the buyer while the account is missing", () => {
    expect(transferDue("REFUNDING", "MANUAL", null)).toBe(false);
  });

  it("is never a wallet refund, nor a ticket that is not refunding", () => {
    expect(transferDue("REFUNDING", "WALLET", "0123456789")).toBe(false);
    expect(transferDue("REFUNDED", "MANUAL", "0123456789")).toBe(false);
  });
});

describe("needsShop", () => {
  const row = (status: "OPEN" | "IN_PROGRESS" | "REFUNDING" | "RESOLVED", awaiting = false, due = false) =>
    needsShop({ status, awaitingShop: awaiting, transferDue: due });

  it("takes a new report, the buyer's last word, or a transfer to make", () => {
    expect(row("OPEN")).toBe(true);
    expect(row("IN_PROGRESS", true)).toBe(true);
    expect(row("REFUNDING", false, true)).toBe(true);
  });

  it("leaves a ticket where the shop spoke last", () => {
    expect(row("IN_PROGRESS")).toBe(false);
    expect(row("RESOLVED")).toBe(false);
  });
});
