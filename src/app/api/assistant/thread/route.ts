import { NextResponse } from "next/server";

import { readChatViewer, threadViewForViewer } from "@/lib/chatStore";

/**
 * The widget's view of its own conversation — restored on open, polled while
 * the panel is up so an admin's answer lands without a reload.
 *
 * Scope is the whole protection: a signed-in caller reads the thread of
 * their account, a visitor reads the thread of their own cookie, and there
 * is no id parameter to wander with. A fresh browser (no cookie, not signed
 * in) is answered `{ thread: null }` without minting anything — only sending
 * a message starts a conversation.
 *
 * `?after=<ISO>` trims the answer to messages newer than what the widget
 * already shows, which is what makes a 10-second poll cheap.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await readChatViewer();
  if (!viewer.userId && viewer.mintedGuestKey) {
    return NextResponse.json({ thread: null });
  }

  const afterRaw = new URL(request.url).searchParams.get("after");
  const after = afterRaw ? new Date(afterRaw) : undefined;
  const thread = await threadViewForViewer(
    viewer,
    after && !Number.isNaN(after.getTime()) ? after : undefined,
  );
  return NextResponse.json({ thread });
}
