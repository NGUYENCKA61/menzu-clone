import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { appendChatMessage, handoffToAdmin, threadForChannelGuest } from "@/lib/chatStore";
import { CRM_KEYS, getSettingValue } from "@/lib/crmSettings";
import { db } from "@/lib/db";
import { MANYCHAT_GUEST_PREFIX } from "@/lib/manychat";

/**
 * Messenger's way into the CRM inbox, by way of ManyChat.
 *
 * In ManyChat the owner adds an External Request step that POSTs here with
 * the shared secret and the subscriber's id, name and message. Three gates,
 * the same shape as the Telegram webhook's: a secret must be configured
 * (blank means the door is shut), the caller's copy must match it in
 * constant time, and only then is anything written.
 *
 * Every Messenger conversation lands as NEED_ADMIN: the web bot's rules and
 * throttles were built for the web widget, and Messenger has ManyChat's own
 * automation in front of this hook anyway. The desk answers from the inbox
 * and the reply rides back through ManyChat's API.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = (await getSettingValue(CRM_KEYS.manychatSecret)).trim();
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 404 });

  const given = request.headers.get("x-crm-secret") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    subscriber_id?: unknown;
    name?: unknown;
    text?: unknown;
  } | null;
  const subscriberId =
    typeof body?.subscriber_id === "string" || typeof body?.subscriber_id === "number"
      ? String(body.subscriber_id).trim().slice(0, 64)
      : "";
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!subscriberId || !text) {
    return NextResponse.json({ error: "subscriber_id và text là bắt buộc" }, { status: 400 });
  }

  const thread = await threadForChannelGuest({
    channel: "FACEBOOK",
    guestKey: `${MANYCHAT_GUEST_PREFIX}${subscriberId}`,
    guestName: name ? `FB: ${name}` : null,
  });

  // A quiet cap, like the web widget's: Messenger floods stay ManyChat's
  // problem, not the database's.
  const hourAgo = new Date(Date.now() - 3_600_000);
  const recent = await db.chatMessage.count({
    where: { threadId: thread.id, role: "CUSTOMER", createdAt: { gte: hourAgo } },
  });
  if (recent >= 60) return NextResponse.json({ ok: true, throttled: true });

  await appendChatMessage(thread.id, "CUSTOMER", text);
  if (thread.status === "BOT") {
    await handoffToAdmin({
      threadId: thread.id,
      reason: "Tin nhắn Messenger",
      excerpt: text,
      customerName: name ? `FB: ${name}` : "Khách Messenger",
    });
  }
  return NextResponse.json({ ok: true, threadId: thread.id });
}
