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

/** Append one line and keep the thread's sort keys honest. */
export async function appendChatMessage(
  threadId: string,
  role: ChatRole,
  body: string,
  imageUrl?: string | null,
) {
  const now = new Date();
  const [message] = await db.$transaction([
    db.chatMessage.create({ data: { threadId, role, body, imageUrl: imageUrl ?? null } }),
    db.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: now, ...(role === "CUSTOMER" ? { lastCustomerAt: now } : {}) },
    }),
  ]);
  return message;
}

/**
 * The thread of an outside channel's subscriber (ManyChat hands us a
 * subscriber id, not a cookie): the newest open one, else a fresh one. The
 * display name is refreshed while the thread is open, since the first
 * webhook may not have carried it.
 */
export async function threadForChannelGuest(input: {
  channel: "FACEBOOK" | "ZALO" | "TELEGRAM";
  guestKey: string;
  guestName: string | null;
}) {
  const open = await db.chatThread.findFirst({
    where: { channel: input.channel, guestKey: input.guestKey, status: { not: "DONE" } },
    orderBy: { lastMessageAt: "desc" },
  });
  if (open) {
    if (input.guestName && open.guestName !== input.guestName) {
      return db.chatThread.update({
        where: { id: open.id },
        data: { guestName: input.guestName },
      });
    }
    return open;
  }
  return db.chatThread.create({
    data: { channel: input.channel, guestKey: input.guestKey, guestName: input.guestName },
  });
}

/** The desk opened it: the unread dot goes out. */
export async function markThreadSeen(threadId: string): Promise<void> {
  await db.chatThread.updateMany({ where: { id: threadId }, data: { adminSeenAt: new Date() } });
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
    select: { id: true, role: true, body: true, imageUrl: true, createdAt: true },
  });
  return {
    id: thread.id,
    status: thread.status,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      body: m.body,
      imageUrl: m.imageUrl,
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
  channel?: "WEB" | "FACEBOOK" | "ZALO" | "TELEGRAM";
}) {
  const q = input.q?.trim();
  const where: Prisma.ChatThreadWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.channel ? { channel: input.channel } : {}),
    // The search looks at who is talking and at what was said: a name, an
    // outside channel's display name, or a phrase inside the conversation.
    ...(q
      ? {
          OR: [
            { user: { is: { username: { contains: q, mode: "insensitive" } } } },
            { guestName: { contains: q, mode: "insensitive" } },
            { messages: { some: { body: { contains: q, mode: "insensitive" } } } },
          ],
        }
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
    kind: "CHAT" as const,
    status: thread.status,
    channel: thread.channel,
    needReason: thread.needReason,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    unread: Boolean(
      thread.lastCustomerAt &&
        (!thread.adminSeenAt || thread.lastCustomerAt > thread.adminSeenAt),
    ),
    customer: thread.user
      ? { uid: thread.user.uid, username: thread.user.username, tags: thread.user.crmTags }
      : null,
    guestName: thread.guestName,
    preview: thread.messages[0]
      ? { role: thread.messages[0].role, body: thread.messages[0].body.slice(0, 90) }
      : null,
  }));
}

/** The warranty statuses that still sit on the desk. */
const WARRANTY_OPEN = ["OPEN", "IN_PROGRESS", "REFUNDING"] as const;

/**
 * Open warranty tickets shaped like inbox rows, so the one inbox really is
 * one inbox. Their ids wear a `w_` prefix on the wire; actions beyond a
 * reply stay on the admin warranty desk, which owns the money moves.
 */
export async function listWarrantyForDesk(q?: string) {
  const query = q?.trim();
  const tickets = await db.warrantyRequest.findMany({
    where: {
      status: { in: [...WARRANTY_OPEN] },
      ...(query
        ? { user: { is: { username: { contains: query, mode: "insensitive" } } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      user: { select: { uid: true, username: true, crmTags: true } },
      order: { select: { code: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { fromShop: true, body: true, createdAt: true },
      },
    },
  });
  return tickets.map((ticket) => {
    const last = ticket.messages[0];
    return {
      id: `w_${ticket.id}`,
      kind: "WARRANTY" as const,
      status: "NEED_ADMIN" as const,
      warrantyStatus: ticket.status,
      channel: "WARRANTY",
      needReason: `Bảo hành đơn ${ticket.order?.code ?? ""}`.trim(),
      lastMessageAt: (last?.createdAt ?? ticket.createdAt).toISOString(),
      unread: Boolean(last && !last.fromShop),
      customer: ticket.user
        ? { uid: ticket.user.uid, username: ticket.user.username, tags: ticket.user.crmTags }
        : null,
      guestName: null,
      preview: last
        ? { role: last.fromShop ? ("ADMIN" as const) : ("CUSTOMER" as const), body: last.body.slice(0, 90) }
        : null,
    };
  });
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
      email: true,
      balance: true,
      points: true,
      role: true,
      tier: true,
      agencyPercent: true,
      crmNote: true,
      crmTags: true,
      lastLoginAt: true,
      lastIp: true,
      blockedAt: true,
      blockedReason: true,
      verifiedAt: true,
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
    email: user.email,
    balance: Number(user.balance),
    points: user.points,
    role: user.role,
    tier: user.tier,
    agencyPercent: user.agencyPercent,
    totalSpent: spentBy.get(user.id) ?? 0,
    totalToppedUp: toppedBy.get(user.id) ?? 0,
    orderCount: user._count.orders,
    threadCount: user._count.chatThreads,
    note: user.crmNote,
    tags: user.crmTags,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lastIp: user.lastIp,
    blocked: user.blockedAt !== null,
    blockedReason: user.blockedReason,
    verified: user.verifiedAt !== null,
    memberSince: user.createdAt.toISOString(),
  }));
}

/**
 * The customer's standing, as the panel beside a conversation shows it —
 * balance, money in and out, open warranty, the desk's note and labels —
 * so the desk answers from the record instead of asking the customer to
 * prove what the shop already knows.
 */
export async function customerSummary(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      uid: true,
      username: true,
      balance: true,
      crmNote: true,
      crmTags: true,
      role: true,
      tier: true,
      blockedAt: true,
      verifiedAt: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  if (!user) return null;
  const [spent, topped, openWarranty] = await Promise.all([
    db.order.aggregate({ where: { userId, status: "PAID" }, _sum: { total: true } }),
    db.topUp.aggregate({ where: { userId, status: "COMPLETED" }, _sum: { credited: true } }),
    db.warrantyRequest.count({
      where: { userId, status: { in: [...WARRANTY_OPEN] } },
    }),
  ]);
  return {
    id: user.id,
    uid: user.uid,
    username: user.username,
    balance: Number(user.balance),
    totalSpent: Number(spent._sum.total ?? 0n),
    totalToppedUp: Number(topped._sum.credited ?? 0n),
    orderCount: user._count.orders,
    openWarranty,
    note: user.crmNote,
    tags: user.crmTags,
    tier: user.tier as string,
    role: user.role as string,
    blocked: user.blockedAt !== null,
    verified: user.verifiedAt !== null,
    memberSince: user.createdAt.toISOString(),
  };
}

/** The drawer's "what has this customer done lately": orders and top-ups. */
export async function customerActivity(userId: string) {
  const [orders, topUps] = await Promise.all([
    db.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        code: true,
        total: true,
        status: true,
        createdAt: true,
        product: { select: { name: true } },
      },
    }),
    db.topUp.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { code: true, amount: true, credited: true, status: true, createdAt: true },
    }),
  ]);
  return {
    orders: orders.map((order) => ({
      code: order.code,
      total: Number(order.total),
      status: order.status,
      at: order.createdAt.toISOString(),
      product: order.product?.name ?? "",
    })),
    topUps: topUps.map((topUp) => ({
      code: topUp.code,
      amount: Number(topUp.credited ?? topUp.amount),
      status: topUp.status,
      at: topUp.createdAt.toISOString(),
    })),
  };
}

export async function threadDetailForDesk(threadId: string) {
  const thread = await db.chatThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 300,
        select: { id: true, role: true, body: true, imageUrl: true, createdAt: true },
      },
    },
  });
  if (!thread) return null;

  return {
    id: thread.id,
    kind: "CHAT" as const,
    status: thread.status,
    channel: thread.channel,
    needReason: thread.needReason,
    guestName: thread.guestName,
    customer: thread.userId ? await customerSummary(thread.userId) : null,
    messages: thread.messages.map((m) => ({
      id: m.id,
      role: m.role,
      body: m.body,
      imageUrl: m.imageUrl,
      at: m.createdAt.toISOString(),
    })),
  };
}

/**
 * One warranty ticket in the inbox's own shape. Read and reply only: the
 * refund buttons, the bank form and the status moves live on the admin
 * warranty desk, which was built around the money rules.
 */
export async function warrantyDetailForDesk(ticketId: string) {
  const ticket = await db.warrantyRequest.findUnique({
    where: { id: ticketId },
    include: {
      order: { select: { code: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 300,
        select: { id: true, fromShop: true, body: true, imageUrl: true, createdAt: true },
      },
    },
  });
  if (!ticket) return null;

  return {
    id: `w_${ticket.id}`,
    kind: "WARRANTY" as const,
    status: "NEED_ADMIN" as const,
    warrantyStatus: ticket.status,
    warrantyOpen: (WARRANTY_OPEN as readonly string[]).includes(ticket.status),
    channel: "WARRANTY",
    needReason: `Bảo hành đơn ${ticket.order?.code ?? ""}`.trim(),
    guestName: null,
    customer: ticket.userId ? await customerSummary(ticket.userId) : null,
    messages: ticket.messages.map((m) => ({
      id: m.id,
      role: m.fromShop ? ("ADMIN" as const) : ("CUSTOMER" as const),
      body: m.body,
      imageUrl: m.imageUrl,
      at: m.createdAt.toISOString(),
    })),
  };
}
