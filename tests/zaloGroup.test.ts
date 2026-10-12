import type { PrismaClient } from "@prisma/client";
import { ThreadType } from "zca-js";
import { describe, expect, it } from "vitest";

import { createGroupManager, type GroupApi } from "../bot/zalo/group";

/**
 * The group minder against a fake Zalo and a fake database: who it lets in,
 * whom it warns and removes, and whom it leaves alone. The real bot runs the
 * same code against zca-js; only the two ends are stood in for here.
 */

type Row = { key: string; value: string };

function fakes(settings: Record<string, string>) {
  const calls: {
    review: unknown[];
    /** The group each review was sent to, in order. */
    reviewIn: string[];
    removed: string[];
    sent: unknown[];
  } = {
    review: [],
    reviewIn: [],
    removed: [],
    sent: [],
  };
  const events: {
    groupId: string;
    kind: string;
    zaloId: string | null;
    name: string | null;
    note: string | null;
    createdAt: Date;
  }[] = [];
  let pendingReads = 0;
  const api: GroupApi = {
    getOwnId: () => "bot",
    getAllGroups: async () => ({ gridVerMap: { g1: "1" } }),
    getGroupInfo: async () => ({
      gridInfoMap: {
        g1: { name: "Nhóm shop", totalMember: 12, adminIds: ["bot"], creatorId: "owner" },
      },
    }),
    getPendingGroupMembers: async () => {
      pendingReads += 1;
      return {
        users: [
          { uid: "u-linked", dpn: "An" },
          { uid: "u-stranger", dpn: "Bo" },
        ],
      };
    },
    reviewPendingMemberRequest: async (payload, groupId) => {
      calls.review.push(payload);
      calls.reviewIn.push(groupId);
      return {};
    },
    removeUserFromGroup: async (memberId) => {
      calls.removed.push(String(memberId));
      return { errorMembers: [] };
    },
    sendMessage: async (content) => {
      calls.sent.push(content);
      return {};
    },
  };
  const rows: Row[] = Object.entries(settings).map(([key, value]) => ({ key, value }));
  const db = {
    setting: { findMany: async () => rows },
    user: {
      findUnique: async ({ where }: { where: { zaloId: string } }) =>
        where.zaloId === "u-linked" ? { id: "acc-1", username: "an123" } : null,
    },
    order: { count: async () => 0 },
    zaloGroupEvent: {
      create: async ({ data }: { data: (typeof events)[number] }) => {
        events.push({ ...data, createdAt: new Date() });
        return data;
      },
      count: async ({
        where,
      }: {
        where: { zaloId: string; kind: string };
      }) => events.filter((e) => e.zaloId === where.zaloId && e.kind === where.kind).length,
    },
  } as unknown as PrismaClient;
  const manager = createGroupManager({
    api,
    db,
    log: () => undefined,
    siteHost: "thichthihack.com",
    brand: async () => "THICHTHIHACK",
    gapMs: 0,
  });
  return { manager, calls, events, pendingReads: () => pendingReads };
}

const GROUP = {
  "integrations.zalo.group.id": "g1",
  "integrations.zalo.group.join": "linked",
  "integrations.zalo.group.welcome": "@{name} chào mừng vào nhóm {shop}",
  "integrations.zalo.group.badwords": "scam",
  "integrations.zalo.group.links": "true",
};

const msg = (uid: string, text: string, name = "Khach") => ({
  type: ThreadType.Group,
  threadId: "g1",
  isSelf: false,
  data: { uidFrom: uid, dName: name, content: text },
});

describe("who the bot lets in", () => {
  it("approves the linked, refuses the stranger, welcomes with a mention", async () => {
    const { manager, calls, events } = fakes(GROUP);
    await manager.tick();
    expect(calls.review).toEqual([
      { members: "u-linked", isApprove: true },
      { members: "u-stranger", isApprove: false },
    ]);
    expect(calls.sent[0]).toEqual({
      msg: "@An chào mừng vào nhóm THICHTHIHACK",
      mentions: [{ pos: 0, len: 3, uid: "u-linked" }],
    });
    expect(events.map((e) => e.kind)).toEqual(["JOIN_APPROVED", "JOIN_REFUSED"]);
    expect(manager.snapshot()).toEqual([
      { id: "g1", name: "Nhóm shop", members: 12, admin: true },
    ]);
  });

  it("leaves the queue alone when the mode is off, and reads it once per tick", async () => {
    const off = fakes({ ...GROUP, "integrations.zalo.group.join": "off" });
    await off.manager.tick();
    expect(off.calls.review).toEqual([]);

    const on = fakes(GROUP);
    await on.manager.tick();
    await on.manager.tick();
    expect(on.pendingReads()).toBe(1);
    on.manager.onGroupEvent({ type: "join_request", data: { groupId: "g1" } });
    await on.manager.tick();
    expect(on.pendingReads()).toBe(2);
  });
});

describe("what the bot does about spam", () => {
  it("warns once with a mention, then removes on the next offence", async () => {
    const { manager, calls, events } = fakes(GROUP);
    await manager.tick();
    calls.sent.length = 0;
    await manager.onMessage(msg("u-x", "rẻ hơn ở shopkhac.vn nè", "Xuan"));
    expect(calls.removed).toEqual([]);
    expect(calls.sent[0]).toMatchObject({
      msg: expect.stringContaining("@Xuan nhóm không cho gửi link ngoài"),
      mentions: [{ pos: 0, len: 5, uid: "u-x" }],
    });
    await manager.onMessage(msg("u-x", "này scam đó", "Xuan"));
    expect(calls.removed).toEqual(["u-x"]);
    expect(events.filter((e) => e.zaloId === "u-x").map((e) => e.kind)).toEqual([
      "WARNED",
      "REMOVED",
    ]);
  });

  it("lets the shop's own links, clean talk and the admins through", async () => {
    const { manager, calls } = fakes(GROUP);
    await manager.tick();
    calls.sent.length = 0;
    await manager.onMessage(msg("u-y", "mua ở thichthihack.com/hack-cs2 nhé"));
    await manager.onMessage(msg("u-y", "chào cả nhóm"));
    await manager.onMessage(msg("owner", "xem shopkhac.vn", "Owner"));
    await manager.onMessage({ ...msg("u-y", "spam spam"), threadId: "g-other" });
    expect(calls.sent).toEqual([]);
    expect(calls.removed).toEqual([]);
  });

  it("minds every chosen group, and only those", async () => {
    const { manager, calls, events } = fakes({
      ...GROUP,
      "integrations.zalo.group.id": "g1, g2",
    });
    await manager.tick();
    expect(calls.reviewIn).toEqual(["g1", "g1", "g2", "g2"]);
    expect(
      events.filter((e) => e.kind === "JOIN_APPROVED").map((e) => e.groupId),
    ).toEqual(["g1", "g2"]);
    calls.sent.length = 0;
    await manager.onMessage({ ...msg("u-z", "xem shopkhac.vn", "Zed"), threadId: "g2" });
    await manager.onMessage({ ...msg("u-z", "xem shopkhac.vn", "Zed"), threadId: "g-other" });
    expect(calls.sent).toHaveLength(1);
    expect(events.filter((e) => e.kind === "WARNED").map((e) => e.groupId)).toEqual(["g2"]);
  });

  it("does nothing at all while no group is named", async () => {
    const { manager, calls } = fakes({ ...GROUP, "integrations.zalo.group.id": "" });
    await manager.tick();
    await manager.onMessage(msg("u-x", "xem shopkhac.vn"));
    expect(calls.review).toEqual([]);
    expect(calls.sent).toEqual([]);
  });
});
