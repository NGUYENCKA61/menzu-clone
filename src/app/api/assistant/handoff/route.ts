import { NextResponse } from "next/server";

import { HANDOFF_BUTTON_REASON } from "@/lib/chatHandoff";
import {
  handoffToAdmin,
  readChatViewer,
  setGuestCookie,
  threadForNewMessage,
} from "@/lib/chatStore";
import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";

/**
 * The "Gặp admin" button: the customer asks for a human and the bot steps
 * aside. The guarded update inside handoffToAdmin makes the Telegram ping
 * once per conversation, however often the button is pressed.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }

  const viewer = await readChatViewer();
  const thread = await threadForNewMessage(viewer);
  if (viewer.mintedGuestKey) await setGuestCookie(viewer.mintedGuestKey);

  if (thread.status === "BOT") {
    const user = await getCurrentUser();
    const last = await db.chatMessage.findFirst({
      where: { threadId: thread.id, role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      select: { body: true },
    });
    await handoffToAdmin({
      threadId: thread.id,
      reason: HANDOFF_BUTTON_REASON,
      excerpt: last?.body ?? "(chưa nhắn gì, bấm thẳng nút Gặp admin)",
      customerName: user?.username ?? null,
    });
  }

  return NextResponse.json({ threadId: thread.id, status: "NEED_ADMIN" });
}
