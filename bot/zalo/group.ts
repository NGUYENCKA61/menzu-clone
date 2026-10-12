/**
 * The shop's Zalo groups, minded by the notice bot (the owner, 12/10/2026:
 * "bot quản lý nhóm zalo, duyệt thêm thành viên, xóa thành viên cảnh báo
 * nếu thành viên spam, thông báo đăng vào nhóm").
 *
 * The bot account sits in each chosen group as an admin (Cấu hình may name
 * several). Every twenty seconds it reads Cấu hình, approves or refuses
 * whoever asked to join any of them (by the mode the shop set), and keeps a
 * snapshot of the groups it is in for the admin page. Every message in a
 * chosen group is weighed against the rules in
 * src/lib/zaloGroupRules.ts: a first offence is a warning in the group, a
 * second within a week is the door. Everything it does lands in
 * zalo_group_events, which Cấu hình shows and the strike count reads.
 *
 * Built around a small API surface so it can be run against a fake in tests.
 */
import type { PrismaClient } from "@prisma/client";
import { ThreadType } from "zca-js";

import { parseSettings, type ShopSettings } from "../../src/lib/settings";
import {
  RecentMessages,
  STRIKE_MEMORY_MS,
  joinDecision,
  parseBadWords,
  removeText,
  spamReason,
  strikeAction,
  warnText,
  welcomeText,
} from "../../src/lib/zaloGroupRules";

export type GroupApi = {
  getOwnId(): string;
  getAllGroups(): Promise<{ gridVerMap: Record<string, string> }>;
  getGroupInfo(groupId: string | string[]): Promise<{
    gridInfoMap: Record<
      string,
      | {
          name?: string;
          totalMember?: number;
          adminIds?: string[];
          creatorId?: string;
        }
      | undefined
    >;
  }>;
  getPendingGroupMembers(
    groupId: string,
  ): Promise<{ users: { uid: string; dpn: string }[] }>;
  reviewPendingMemberRequest(
    payload: { members: string | string[]; isApprove: boolean },
    groupId: string,
  ): Promise<unknown>;
  removeUserFromGroup(
    memberId: string | string[],
    groupId: string,
  ): Promise<unknown>;
  sendMessage(
    content:
      | string
      | { msg: string; mentions?: { pos: number; uid: string; len: number }[] },
    threadId: string,
    type: ThreadType,
  ): Promise<unknown>;
};

export type GroupSnapshot = {
  id: string;
  name: string;
  members: number;
  /** Whether the bot may approve and remove there. */
  admin: boolean;
};

export type GroupMessage = {
  type: ThreadType;
  threadId: string;
  isSelf: boolean;
  data: { uidFrom?: string; dName?: string; content: unknown };
};

const TICK_MS = 20_000;
const GROUPS_REFRESH_MS = 10 * 60_000;
const SETTINGS_FRESH_MS = 30_000;
const ACTION_GAP_MS = 1500;
/**
 * An approval Zalo accepts but never carries out (a deactivated account, say)
 * leaves the request in the queue; without this the bot would approve it again
 * on every tick and write a log line each time. Someone approved, gone and
 * back within the day waits for a human admin instead.
 */
const APPROVAL_MEMORY_MS = 24 * 60 * 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The hostnames a message may link to without being spam: the shop's own. */
function allowedHostsOf(settings: ShopSettings, siteHost: string | null): string[] {
  const hosts = new Set<string>();
  if (siteHost) hosts.add(siteHost.toLowerCase());
  for (const value of [
    settings.contactFacebook,
    settings.contactZalo,
    settings.contactTelegram,
    settings.contactFacebookGroup,
    settings.contactZaloGroup,
    settings.contactDiscord,
    settings.contactTiktok,
  ]) {
    try {
      if (/^https?:\/\//i.test(value)) hosts.add(new URL(value).hostname.toLowerCase());
    } catch {
      // Not an address; nothing to allow.
    }
  }
  return [...hosts];
}

export function createGroupManager(deps: {
  api: GroupApi;
  db: PrismaClient;
  log: (...parts: unknown[]) => void;
  /** The shop's own hostname, so its links are never spam. */
  siteHost: string | null;
  brand: () => Promise<string>;
  /** The breath between two actions; a test passes 0. */
  gapMs?: number;
}) {
  const { api, db, log } = deps;
  const gap = deps.gapMs ?? ACTION_GAP_MS;
  const recent = new RecentMessages();
  const admins = new Map<string, Set<string>>();
  let groups: GroupSnapshot[] = [];
  let groupsAt = 0;
  let settings: ShopSettings | null = null;
  let settingsAt = 0;
  let lastTick = 0;

  async function currentSettings(): Promise<ShopSettings> {
    if (!settings || Date.now() - settingsAt > SETTINGS_FRESH_MS) {
      settings = parseSettings(await db.setting.findMany());
      settingsAt = Date.now();
    }
    return settings;
  }

  async function event(
    groupId: string,
    kind: "JOIN_APPROVED" | "JOIN_REFUSED" | "WARNED" | "REMOVED" | "POSTED",
    zaloId: string | null,
    name: string | null,
    note: string | null,
  ): Promise<void> {
    try {
      await db.zaloGroupEvent.create({
        data: { groupId, kind, zaloId, name, note: note?.slice(0, 300) ?? null },
      });
    } catch (error) {
      log("could not log group event:", (error as Error).message);
    }
  }

  /** The groups the bot is in, with whether it is an admin there. */
  async function refreshGroups(): Promise<void> {
    const own = api.getOwnId();
    const ids = Object.keys((await api.getAllGroups()).gridVerMap);
    if (ids.length === 0) {
      groups = [];
      groupsAt = Date.now();
      return;
    }
    const info = await api.getGroupInfo(ids);
    groups = ids.map((id) => {
      const g = info.gridInfoMap[id];
      const adminIds = new Set([...(g?.adminIds ?? []), ...(g?.creatorId ? [g.creatorId] : [])]);
      admins.set(id, adminIds);
      return {
        id,
        name: g?.name ?? id,
        members: g?.totalMember ?? 0,
        admin: adminIds.has(own),
      };
    });
    groupsAt = Date.now();
  }

  /** Whoever asked to join any chosen group, decided by the mode the shop set. */
  async function approvePending(s: ShopSettings): Promise<void> {
    if (s.zaloGroupJoin === "off") return;
    // One group's failure (the bot demoted there, say) must not cost the others
    // their approvals.
    for (const groupId of s.zaloGroupIds) {
      await approvePendingIn(groupId, s).catch((error: Error) =>
        log("approvals failed in", groupId, error.message),
      );
    }
  }

  async function approvePendingIn(groupId: string, s: ShopSettings): Promise<void> {
    const { users } = await api.getPendingGroupMembers(groupId);
    if (!users || users.length === 0) return;
    const brand = await deps.brand();
    for (const user of users) {
      const approvedBefore = await db.zaloGroupEvent.count({
        where: {
          groupId,
          zaloId: user.uid,
          kind: "JOIN_APPROVED",
          createdAt: { gte: new Date(Date.now() - APPROVAL_MEMORY_MS) },
        },
      });
      if (approvedBefore > 0) continue;
      const linked = await db.user.findUnique({
        where: { zaloId: user.uid },
        select: { id: true, username: true },
      });
      const buyer = linked
        ? (await db.order.count({ where: { userId: linked.id, status: "PAID" } })) > 0
        : false;
      const decision = joinDecision(s.zaloGroupJoin, { linked: linked !== null, buyer });
      if (decision === "leave") continue;
      try {
        await api.reviewPendingMemberRequest(
          { members: user.uid, isApprove: decision === "approve" },
          groupId,
        );
      } catch (error) {
        log("review failed for", user.uid, (error as Error).message);
        continue;
      }
      const name = user.dpn || user.uid;
      if (decision === "approve") {
        log("approved", name, linked ? `(${linked.username})` : "");
        await event(groupId, "JOIN_APPROVED", user.uid, name, linked ? `tài khoản ${linked.username}` : null);
        const welcome = welcomeText(s.zaloGroupWelcome, name, brand);
        if (welcome) {
          await sleep(gap);
          await api
            .sendMessage(
              welcome.startsWith(`@${name}`)
                ? { msg: welcome, mentions: [{ pos: 0, len: name.length + 1, uid: user.uid }] }
                : welcome,
              groupId,
              ThreadType.Group,
            )
            .catch((error: Error) => log("welcome failed:", error.message));
        }
      } else {
        log("refused", name, "mode", s.zaloGroupJoin);
        await event(
          groupId,
          "JOIN_REFUSED",
          user.uid,
          name,
          s.zaloGroupJoin === "linked" ? "chưa liên kết Zalo với tài khoản web" : "chưa có đơn hàng đã thanh toán",
        );
      }
      await sleep(gap);
    }
  }

  /** A message in a chosen group: weighed, and answered when it is spam. */
  async function onMessage(message: GroupMessage): Promise<void> {
    if (message.isSelf || message.type !== ThreadType.Group) return;
    const s = await currentSettings();
    const groupId = message.threadId;
    if (!s.zaloGroupIds.includes(groupId)) return;
    const text = typeof message.data.content === "string" ? message.data.content : "";
    const uid = message.data.uidFrom;
    if (!text || !uid) return;
    // The group's own admins are never policed by the bot.
    if (admins.get(groupId)?.has(uid)) return;
    const reason = spamReason(text, recent, uid, Date.now(), {
      blockLinks: s.zaloGroupBlockLinks,
      allowedHosts: allowedHostsOf(s, deps.siteHost),
      badWords: parseBadWords(s.zaloGroupBadWords),
    });
    if (!reason) return;
    const name = message.data.dName?.trim() || "bạn";
    const prior = await db.zaloGroupEvent.count({
      where: {
        groupId,
        zaloId: uid,
        kind: "WARNED",
        createdAt: { gte: new Date(Date.now() - STRIKE_MEMORY_MS) },
      },
    });
    const action = strikeAction(prior);
    const say = action === "warn" ? warnText(name, reason) : removeText(name, reason);
    if (action === "remove") {
      try {
        await api.removeUserFromGroup(uid, groupId);
      } catch (error) {
        log("remove failed for", uid, (error as Error).message);
        return;
      }
      recent.forget(uid);
    }
    await api
      .sendMessage(
        { msg: say, mentions: [{ pos: 0, len: name.length + 1, uid }] },
        groupId,
        ThreadType.Group,
      )
      .catch((error: Error) => log("group reply failed:", error.message));
    log(action === "warn" ? "warned" : "removed", name, "for", reason);
    await event(groupId, action === "warn" ? "WARNED" : "REMOVED", uid, name, reason);
  }

  /** A join request wakes the next tick at once rather than in twenty seconds. */
  function onGroupEvent(ev: { type: string; data: { groupId?: string } }): void {
    if (ev.type === "join_request") lastTick = 0;
  }

  /** Called from the bot's loop every few seconds; does its work on its own clock. */
  async function tick(): Promise<void> {
    const now = Date.now();
    if (now - lastTick < TICK_MS) return;
    lastTick = now;
    const s = await currentSettings();
    if (now - groupsAt > GROUPS_REFRESH_MS) {
      await refreshGroups().catch((error: Error) => log("groups refresh failed:", error.message));
    }
    if (s.zaloGroupIds.length === 0) return;
    await approvePending(s).catch((error: Error) => log("approvals failed:", error.message));
  }

  /** A shop notice into the group, from the outbox. */
  async function post(groupId: string, text: string): Promise<void> {
    await api.sendMessage(text, groupId, ThreadType.Group);
    await event(groupId, "POSTED", null, null, text.split("\n")[0] ?? null);
  }

  return { onMessage, onGroupEvent, tick, post, snapshot: () => groups };
}
