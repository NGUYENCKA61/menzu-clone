import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import {
  appendChatMessage,
  crmCounts,
  crmCustomers,
  listThreadsForDesk,
  threadDetailForDesk,
} from "@/lib/chatStore";
import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";

/**
 * The CRM desk's API: the thread list with its counters, one conversation
 * with the customer's standing, the admin's reply, the status moves, and the
 * desk's margin note on a customer. Every handler resolves the caller
 * through getAdmin — the desk reads customers' words, so a member must get
 * nothing here, not even a count.
 */

export const dynamic = "force-dynamic";

const THREAD_STATUSES = ["BOT", "NEED_ADMIN", "DONE"] as const;
type ThreadStatus = (typeof THREAD_STATUSES)[number];

function isStatus(value: unknown): value is ThreadStatus {
  return typeof value === "string" && (THREAD_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const thread = await threadDetailForDesk(id);
    if (!thread) {
      return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    }
    return NextResponse.json({ thread });
  }

  const q = url.searchParams.get("q")?.trim().slice(0, 60) || undefined;

  // The customer book, paged.
  if (url.searchParams.get("view") === "customers") {
    const skip = Math.max(0, Math.min(5000, Number(url.searchParams.get("skip")) || 0));
    return NextResponse.json({ customers: await crmCustomers({ q, skip }) });
  }

  // One customer's conversations, for the drawer on the customer book.
  const userId = url.searchParams.get("userId");
  if (userId) {
    return NextResponse.json({ threads: await listThreadsForDesk({ userId }) });
  }

  const statusRaw = url.searchParams.get("status");
  const [threads, counts] = await Promise.all([
    listThreadsForDesk({ status: isStatus(statusRaw) ? statusRaw : undefined, q }),
    crmCounts(),
  ]);
  return NextResponse.json({ threads, counts });
}

export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  let body: {
    action?: unknown;
    id?: unknown;
    body?: unknown;
    status?: unknown;
    userId?: unknown;
    note?: unknown;
    tags?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  // --- the admin's answer --------------------------------------------------
  if (body.action === "reply") {
    const id = typeof body.id === "string" ? body.id : "";
    const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
    if (!id || !text) {
      return NextResponse.json({ error: "Bạn nhập nội dung trả lời" }, { status: 400 });
    }
    const thread = await db.chatThread.findUnique({ where: { id }, select: { id: true } });
    if (!thread) {
      return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    }
    await appendChatMessage(id, "ADMIN", text);
    return NextResponse.json({ ok: true });
  }

  // --- who holds the conversation ------------------------------------------
  if (body.action === "status") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id || !isStatus(body.status)) {
      return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
    }
    const moved = await db.chatThread.updateMany({
      where: { id },
      data: {
        status: body.status,
        // The reason names why the bot handed over; leaving the desk's own
        // moves (back to bot, closed) carrying a stale reason would lie.
        ...(body.status === "NEED_ADMIN" ? {} : { needReason: null }),
      },
    });
    if (moved.count === 0) {
      return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  // --- the margin note on a customer ---------------------------------------
  if (body.action === "note") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
    const tags = Array.isArray(body.tags)
      ? body.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim().slice(0, 24))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    if (!userId) {
      return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
    }
    const updated = await db.user.updateMany({
      where: { id: userId },
      data: { crmNote: note, crmTags: tags },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
}
