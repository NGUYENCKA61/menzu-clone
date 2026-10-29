import "server-only";

import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import type { ChatRole, ChatThreadStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";

/**
 * The CRM desk's storage (29/10/2026): every support conversation the web
 * chat holds, who has it (bot or admin), and the append/hand-off moves both
 * sides share. The widget talks through api/assistant/*; the desk through
 * api/admin/crm. Nothing here renders — screens shape their own views.
 */

/** The visitor cookie: random bytes naming a guest's thread across visits. */
export const CHAT_GUEST_COOKIE = "chat_key";
const GUEST_KEY_RE = /^[a-f0-9]{32}$/;

export interface ChatViewer {
  userId: string | null;
  guestKey: string | null;
  /** Set when this request minted a fresh guest key the response must set. */
  mintedGuestKey: string | null;
}

/**
 * Who is chatting: the signed-in customer, else the guest cookie, minting
 * one when the browser carries none. The caller sets the cookie on its
 * response via `setGuestCookie` — a bare `cookies().set` inside a helper
 * would be invisible in the route's code and easy to lose.
 */
export async function readChatViewer(): Promise<ChatViewer> {
  const user = await getCurrentUser();
  if (user) return { userId: user.id, guestKey: null, mintedGuestKey: null };

  const store = await cookies();
  const raw = store.get(CHAT_GUEST_COOKIE)?.value ?? "";
  if (GUEST_KEY_RE.test(raw)) return { userId: null, guestKey: raw, mintedGuestKey: null };

  const minted = randomBytes(16).toString("hex");
  return { userId: null, guestKey: minted, mintedGuestKey: minted };
}

/** One year: a guest's history should survive a reboot, not expire mid-chat. */
export async function setGuestCookie(key: string): Promise<void> {
  const store = await cookies();
  store.set(CHAT_GUEST_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}

function viewerWhere(viewer: ChatViewer): Prisma.ChatThreadWhereInput {
  return viewer.userId ? { userId: viewer.userId } : { guestKey: viewer.guestKey ?? "∅" };
}

/** The newest thread of this viewer, closed or not — what the widget restores. */
export function latestThread(viewer: ChatViewer) {
  return db.chatThread.findFirst({
    where: viewerWhere(viewer),
    orderBy: { lastMessageAt: "desc" },
  });
}

/**
 * The thread a new message belongs to: the newest one still open. A DONE
 * conversation stays done — the next question starts a fresh thread, so the
 * desk's "Xong" means something.
 */
export async function threadForNewMessage(viewer: ChatViewer) {
  const open = await db.chatThread.findFirst({
    where: { ...viewerWhere(viewer), status: { not: "DONE" } },
    orderBy: { lastMessageAt: "desc" },
  });
  if (open) return open;
  return db.chatThread.create({
    data: viewer.userId ? { userId: viewer.userId } : { guestKey: viewer.guestKey },
  });
}

/** Append one line and keep the thread's sort key honest. */
export async function appendChatMessage(threadId: string, role: ChatRole, body: string) {
  const [message] = await db.$transaction([
    db.chatMessage.create({ data: { threadId, role, body } }),
    db.chatThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } }),
  ]);
  return message;
}

/**
 * The hand-off: BOT → NEED_ADMIN exactly once. The guarded updateMany is the
 * ping's dedupe — a second press, or a second trigger word in the same
 * conversation, changes nothing and pings nobody. The Telegram word goes out
 * after the status is already written, and a failed send never unwinds it.
 */
export async function handoffToAdmin(input: {
  threadId: string;
  reason: string;
  excerpt: string;
  customerName: string | null;
}): Promise<boolean> {
  const moved = await db.chatThread.updateMany({
    where: { id: input.threadId, status: "BOT" },
    data: { status: "NEED_ADMIN", needReason: input.reason },
  });
  if (moved.count === 0) return false;

  const who = input.customerName ?? "Khách vãng lai";
  const excerpt = input.excerpt.length > 160 ? `${input.excerpt.slice(0, 159)}…` : input.excerpt;
  void notifyTelegramAdmins(
    `💬 <b>Khách cần admin</b> (chat web)\n` +
      `${escapeTelegramHtml(who)}: ${escapeTelegramHtml(excerpt)}\n` +
      `Lý do: ${escapeTelegramHtml(input.reason)}\n` +
      `${absoluteUrl("/admin/crm")}`,
  );
  return true;
}

/** What the widget sees — never more than its own conversation. */
export async function threadViewForViewer(viewer: ChatViewer, after?: Date) {
  const thread = await latestThread(viewer);
  if (!thread) return null;
  const messages = await db.chatMessage.findMany({
    where: { threadId: thread.id, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, role: true, body: true, createdAt: true },
  });
  return {
    id: thread.id,
    status: thread.status,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      body: m.body,
      at: m.createdAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// The desk's side.

export interface CrmCounts {
  needAdmin: number;
  bot: number;
  done: number;
}

export async function crmCounts(): Promise<CrmCounts> {
  const rows = await db.chatThread.groupBy({ by: ["status"], _count: { _all: true } });
  const of = (status: ChatThreadStatus) =>
    rows.find((row) => row.status === status)?._count._all ?? 0;
  return { needAdmin: of("NEED_ADMIN"), bot: of("BOT"), done: of("DONE") };
}

/**
 * The desk list: newest conversation first, hand-offs surfaced by the filter
 * rather than a second sort so "Tất cả" still reads as a timeline. 60 rows is
 * weeks of traffic today; a cursor can come with the volume.
 */
export async function listThreadsForDesk(input: {
  status?: ChatThreadStatus;
  q?: string;
  userId?: string;
}) {
  const where: Prisma.ChatThreadWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.q
      ? { user: { is: { username: { contains: input.q, mode: "insensitive" } } } }
      : {}),
  };
  const threads = await db.chatThread.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 60,
    include: {
      user: { select: { uid: true, username: true, crmTags: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { role: true, body: true } },
    },
  });
  return threads.map((thread) => ({
    id: thread.id,
    status: thread.status,
    channel: thread.channel,
    needReason: thread.needReason,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    customer: thread.user
      ? { uid: thread.user.uid, username: thread.user.username, tags: thread.user.crmTags }
      : null,
    preview: thread.messages[0]
      ? { role: thread.messages[0].role, body: thread.messages[0].body.slice(0, 90) }
      : null,
  }));
}

/**
 * The desk's customer book: a page of accounts with the figures a support
 * desk triages by — balance, money in and out, orders, labels, last seen.
 * Aggregates are scoped to the page's own ids, the same lesson the admin
 * users list learned at 8,000 accounts.
 */
export async function crmCustomers(input: { q?: string; skip?: number }) {
  const q = input.q?.trim();
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { crmTags: { has: q } },
        ],
      }
    : {};
  const users = await db.user.findMany({
    where,
    orderBy: [{ lastLoginAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    skip: input.skip ?? 0,
    take: 30,
    select: {
      id: true,
      uid: true,
      username: true,
      balance: true,
      crmNote: true,
      crmTags: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { orders: true, chatThreads: true } },
    },
  });
  const ids = users.map((user) => user.id);
  const [spent, topped] = await Promise.all([
    db.order.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, status: "PAID" },
      _sum: { total: true },
    }),
    db.topUp.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, status: "COMPLETED" },
      _sum: { credited: true },
    }),
  ]);
  const spentBy = new Map(spent.map((row) => [row.userId, Number(row._sum.total ?? 0n)]));
  const toppedBy = new Map(topped.map((row) => [row.userId, Number(row._sum.credited ?? 0n)]));
  return users.map((user) => ({
    id: user.id,
    uid: user.uid,
    username: user.username,
    balance: Number(user.balance),
    totalSpent: spentBy.get(user.id) ?? 0,
    totalToppedUp: toppedBy.get(user.id) ?? 0,
    orderCount: user._count.orders,
    threadCount: user._count.chatThreads,
    note: user.crmNote,
    tags: user.crmTags,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    memberSince: user.createdAt.toISOString(),
  }));
}

/**
 * One conversation with the customer's standing beside it — balance, money
 * in and out, open warranty — so the desk answers from the record instead of
 * asking the customer to prove what the shop already knows.
 */
export async function threadDetailForDesk(threadId: string) {
  const thread = await db.chatThread.findUnique({
    where: { id: threadId },
    include: {
      user: {
        select: {
          id: true,
          uid: true,
          username: true,
          balance: true,
          crmNote: true,
          crmTags: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 300,
        select: { id: true, role: true, body: true, createdAt: true },
      },
    },
  });
  if (!thread) return null;

  let customer = null;
  if (thread.user) {
    const [spent, topped, openWarranty] = await Promise.all([
      db.order.aggregate({
        where: { userId: thread.user.id, status: "PAID" },
        _sum: { total: true },
      }),
      db.topUp.aggregate({
        where: { userId: thread.user.id, status: "COMPLETED" },
        _sum: { credited: true },
      }),
      db.warrantyRequest.count({
        where: { userId: thread.user.id, status: { in: ["OPEN", "IN_PROGRESS", "REFUNDING"] } },
      }),
    ]);
    customer = {
      id: thread.user.id,
      uid: thread.user.uid,
      username: thread.user.username,
      balance: Number(thread.user.balance),
      totalSpent: Number(spent._sum.total ?? 0n),
      totalToppedUp: Number(topped._sum.credited ?? 0n),
      orderCount: thread.user._count.orders,
      openWarranty,
      note: thread.user.crmNote,
      tags: thread.user.crmTags,
      memberSince: thread.user.createdAt.toISOString(),
    };
  }

  return {
    id: thread.id,
    status: thread.status,
    channel: thread.channel,
    needReason: thread.needReason,
    customer,
    messages: thread.messages.map((m) => ({
      id: m.id,
      role: m.role,
      body: m.body,
      at: m.createdAt.toISOString(),
    })),
  };
}
