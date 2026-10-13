import { describe, expect, it } from "vitest";

import { floatingWidgetHidden } from "@/lib/supportWidgetRoutes";
import {
  buildInbox,
  inInbox,
  INBOX_LIMIT,
  orderInbox,
  toInboxTicket,
  waitingForShop,
  type InboxSource,
  type InboxTicket,
} from "@/lib/warrantyInbox";

/**
 * The admin's floating warranty inbox (13/10/2026): which tickets it lists,
 * which of them owe the buyer an answer, and in what order.
 */

const NOW = new Date("2026-10-13T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

function source(over: Partial<InboxSource> & { id: string }): InboxSource {
  return {
    status: "OPEN",
    createdAt: ago(3 * DAY),
    description: "Key báo sai ngay lần nhập đầu tiên, shop xem giúp.",
    imageUrl: null,
    orderCode: `DH${over.id.toUpperCase()}`,
    productName: "Tool A",
    buyerName: "khach",
    buyerAvatar: null,
    last: null,
    ...over,
  };
}

function ticket(over: Partial<InboxTicket> & { id: string; sentAt: string }): InboxTicket {
  const { sentAt, ...rest } = over;
  return {
    orderCode: "DH1",
    productName: "Tool A",
    buyerName: "khach",
    buyerAvatar: null,
    status: "OPEN",
    report: { body: "báo lỗi", imageUrl: null, at: "", sentAt },
    last: { fromShop: false, text: "x", at: "", sentAt },
    waitingForShop: false,
    ...rest,
  };
}

describe("waitingForShop", () => {
  it("waits when the buyer had the last word on an open ticket", () => {
    expect(waitingForShop("OPEN", false)).toBe(true);
    expect(waitingForShop("IN_PROGRESS", false)).toBe(true);
    expect(waitingForShop("REFUNDING", false)).toBe(true);
  });

  it("waits on an open ticket nobody from the shop has answered yet", () => {
    expect(waitingForShop("OPEN", null)).toBe(true);
    // "Đang xử lý" pressed without a note leaves no message behind.
    expect(waitingForShop("IN_PROGRESS", null)).toBe(true);
  });

  it("stops waiting once the shop has the last word", () => {
    expect(waitingForShop("OPEN", true)).toBe(false);
    expect(waitingForShop("IN_PROGRESS", true)).toBe(false);
  });

  it("never waits on a closed ticket, whose thread takes no replies", () => {
    expect(waitingForShop("RESOLVED", false)).toBe(false);
    expect(waitingForShop("REFUNDED", false)).toBe(false);
    expect(waitingForShop("REFUNDED", null)).toBe(false);
  });
});

describe("inInbox", () => {
  it("keeps every open ticket, however quiet", () => {
    expect(inInbox({ status: "OPEN", lastMessageAt: null }, NOW)).toBe(true);
    expect(inInbox({ status: "REFUNDING", lastMessageAt: ago(60 * DAY) }, NOW)).toBe(true);
  });

  it("keeps a closed ticket only while it had a message this week", () => {
    expect(inInbox({ status: "RESOLVED", lastMessageAt: ago(6 * DAY) }, NOW)).toBe(true);
    expect(inInbox({ status: "RESOLVED", lastMessageAt: ago(7 * DAY) }, NOW)).toBe(true);
    expect(inInbox({ status: "RESOLVED", lastMessageAt: ago(7 * DAY + 1) }, NOW)).toBe(false);
    expect(inInbox({ status: "REFUNDED", lastMessageAt: null }, NOW)).toBe(false);
  });
});

describe("toInboxTicket", () => {
  it("lists the report as the buyer's last word while nothing follows it", () => {
    const row = toInboxTicket(source({ id: "a", createdAt: ago(2 * HOUR) }));
    expect(row.last.fromShop).toBe(false);
    expect(row.last.sentAt).toBe(ago(2 * HOUR).toISOString());
    expect(row.last.text).toBe("Key báo sai ngay lần nhập đầu tiên, shop xem giúp.");
    expect(row.report.sentAt).toBe(row.last.sentAt);
    expect(row.waitingForShop).toBe(true);
  });

  it("shows the newest message, cut to one line, and a picture sent alone", () => {
    const long = `${"a".repeat(200)}\n\nb`;
    const row = toInboxTicket(
      source({ id: "b", last: { fromShop: true, body: long, createdAt: ago(HOUR) } }),
    );
    expect(row.last.fromShop).toBe(true);
    expect(row.last.text.length).toBeLessThanOrEqual(120);
    expect(row.last.text.endsWith("…")).toBe(true);
    expect(row.waitingForShop).toBe(false);

    const picture = toInboxTicket(
      source({ id: "c", last: { fromShop: false, body: "", createdAt: ago(HOUR) } }),
    );
    expect(picture.last.text).toBe("(ảnh)");
  });

  it("carries nothing the ticket page would not show", () => {
    const row = toInboxTicket(source({ id: "d" }));
    expect(Object.keys(row).sort()).toEqual(
      [
        "buyerAvatar",
        "buyerName",
        "id",
        "last",
        "orderCode",
        "productName",
        "report",
        "status",
        "waitingForShop",
      ].sort(),
    );
  });
});

describe("orderInbox", () => {
  it("lists newest activity first, the id settling a tie", () => {
    const rows = orderInbox([
      ticket({ id: "old", sentAt: "2026-10-10T00:00:00.000Z" }),
      ticket({ id: "new", sentAt: "2026-10-13T00:00:00.000Z" }),
      ticket({ id: "b-same", sentAt: "2026-10-12T00:00:00.000Z" }),
      ticket({ id: "a-same", sentAt: "2026-10-12T00:00:00.000Z" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["new", "a-same", "b-same", "old"]);
  });

  it("cuts by need, not by time: a waiting buyer is never pushed off", () => {
    const rows = orderInbox(
      [
        ticket({ id: "closed-1", status: "RESOLVED", sentAt: "2026-10-13T03:00:00.000Z" }),
        ticket({ id: "closed-2", status: "RESOLVED", sentAt: "2026-10-13T02:00:00.000Z" }),
        ticket({ id: "open", sentAt: "2026-10-12T00:00:00.000Z" }),
        ticket({ id: "waiting", waitingForShop: true, sentAt: "2026-10-01T00:00:00.000Z" }),
      ],
      2,
    );
    // The two kept are the waiting one and the open one, still newest first.
    expect(rows.map((r) => r.id)).toEqual(["open", "waiting"]);
  });

  it("does not reorder the array it was given", () => {
    const input = [
      ticket({ id: "x", sentAt: "2026-10-01T00:00:00.000Z" }),
      ticket({ id: "y", sentAt: "2026-10-02T00:00:00.000Z" }),
    ];
    orderInbox(input);
    expect(input.map((r) => r.id)).toEqual(["x", "y"]);
  });
});

describe("buildInbox", () => {
  it("drops closed tickets gone quiet and counts every waiting buyer", () => {
    const view = buildInbox(
      [
        source({ id: "w1", last: { fromShop: false, body: "còn lỗi", createdAt: ago(HOUR) } }),
        source({ id: "w2" }),
        source({ id: "answered", last: { fromShop: true, body: "đã cấp key", createdAt: ago(2 * HOUR) } }),
        source({
          id: "closed-recent",
          status: "RESOLVED",
          last: { fromShop: true, body: "xong", createdAt: ago(DAY) },
        }),
        source({
          id: "closed-old",
          status: "RESOLVED",
          last: { fromShop: true, body: "xong", createdAt: ago(30 * DAY) },
        }),
      ],
      NOW,
    );
    expect(view.tickets.map((t) => t.id)).toEqual(["w1", "answered", "closed-recent", "w2"]);
    expect(view.waiting).toBe(2);
  });

  it("keeps at most INBOX_LIMIT tickets but counts the waiting beyond them", () => {
    const rows = Array.from({ length: INBOX_LIMIT + 10 }, (_, i) =>
      source({ id: `t${String(i).padStart(3, "0")}`, createdAt: ago(i * HOUR) }),
    );
    const view = buildInbox(rows, NOW);
    expect(view.tickets).toHaveLength(INBOX_LIMIT);
    expect(view.waiting).toBe(INBOX_LIMIT + 10);
    expect(view.tickets[0].id).toBe("t000");
  });
});

describe("floatingWidgetHidden", () => {
  it("keeps the corner clear on /bio, the admin area and the basket", () => {
    expect(floatingWidgetHidden("/bio")).toBe(true);
    expect(floatingWidgetHidden("/admin")).toBe(true);
    expect(floatingWidgetHidden("/admin/warranty/abc")).toBe(true);
    expect(floatingWidgetHidden("/cart")).toBe(true);
  });

  it("shows on the storefront", () => {
    expect(floatingWidgetHidden("/")).toBe(false);
    expect(floatingWidgetHidden("/orders")).toBe(false);
    expect(floatingWidgetHidden("/cart/x")).toBe(false);
  });
});
