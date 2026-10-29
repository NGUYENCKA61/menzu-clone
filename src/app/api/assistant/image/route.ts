import { NextResponse } from "next/server";

import Anthropic from "@anthropic-ai/sdk";

import {
  askAssistant,
  assistantConfigured,
  AssistantUpstreamError,
} from "@/lib/assistant";
import { MAX_QUESTION, type ChatTurn } from "@/lib/assistantPrompt";
import { DAY_MS, HOUR_MS, throttleReason } from "@/lib/assistantThrottle";
import { handoffReason } from "@/lib/chatHandoff";
import {
  appendChatMessage,
  handoffToAdmin,
  readChatViewer,
  setGuestCookie,
  threadForNewMessage,
} from "@/lib/chatStore";
import { clientIp } from "@/lib/clientIp";
import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { storeCheckedImage } from "@/lib/warrantyImage";

/**
 * The chat's picture lane: a screenshot in, the same answer flow as text
 * out. The file goes through the shop's one image pipeline (sniffed,
 * re-encoded, stored under /uploads/chat), the models read the processed
 * bytes, and every rule of the text endpoint holds — the hand-off words in
 * the caption reach the desk before any model does, a thread the admin
 * holds stays quiet, and the throttle counts a picture like a question.
 *
 * The history sent to the model is rebuilt from the thread's own stored
 * lines rather than trusted from the browser: the server has the truth and
 * a picture request should not carry a parallel version of it.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** How much stored conversation rides along with the picture. */
const HISTORY_TURNS = 12;

export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }

  if (!assistantConfigured(await getShopSettings())) {
    return NextResponse.json(
      { error: "Trợ lý AI chưa được bật. Bạn nhắn admin qua kênh hỗ trợ nhé." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Bạn chọn một ảnh để gửi" }, { status: 400 });
  }
  const caption = String(form.get("body") ?? "")
    .trim()
    .slice(0, MAX_QUESTION);

  const viewer = await readChatViewer();
  const thread = await threadForNewMessage(viewer);
  if (viewer.mintedGuestKey) await setGuestCookie(viewer.mintedGuestKey);

  // One picture counts like one message against the quiet-mode cap.
  const hourAgo = new Date(Date.now() - HOUR_MS);
  const recent = await db.chatMessage.count({
    where: { threadId: thread.id, role: "CUSTOMER", createdAt: { gte: hourAgo } },
  });
  if (recent >= 60) {
    return NextResponse.json(
      { error: "Bạn gửi khá nhiều rồi, admin sẽ trả lời sớm nhé." },
      { status: 429 },
    );
  }

  const stored = await storeCheckedImage(file, "chat", "c");
  if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: 400 });
  if (!stored.url || !stored.data) {
    return NextResponse.json({ error: "Không đọc được ảnh" }, { status: 400 });
  }

  const body = caption || "[Ảnh]";
  await appendChatMessage(thread.id, "CUSTOMER", body, stored.url);

  if (thread.status === "NEED_ADMIN") {
    return NextResponse.json({ threadId: thread.id, status: "NEED_ADMIN" });
  }

  // A caption about money hands over exactly like a typed line would — a
  // photographed bank slip is the desk's business, never the model's.
  const user = await getCurrentUser();
  const reason = caption ? handoffReason(caption) : null;
  if (reason) {
    await handoffToAdmin({
      threadId: thread.id,
      reason,
      excerpt: caption,
      customerName: user?.username ?? null,
    });
    return NextResponse.json({ threadId: thread.id, status: "NEED_ADMIN", handoff: true });
  }

  const ip = clientIp(request);
  const now = Date.now();
  const hour = { gte: new Date(now - HOUR_MS) };
  const day = { gte: new Date(now - DAY_MS) };
  const [byIp, byUser, shopHour, shopDay] = await Promise.all([
    db.assistantHit.count({ where: { ip, createdAt: hour } }),
    user
      ? db.assistantHit.count({ where: { userId: user.id, createdAt: hour } })
      : Promise.resolve(null),
    db.assistantHit.count({ where: { createdAt: hour } }),
    db.assistantHit.count({ where: { createdAt: day } }),
  ]);
  const refused = throttleReason({ byIp, byUser, shopHour, shopDay });
  if (refused) {
    return NextResponse.json(
      {
        error:
          refused === "shop"
            ? "Trợ lý đang bận vì nhiều người hỏi cùng lúc. Bạn thử lại sau, hoặc bấm Gặp admin nhé."
            : "Bạn hỏi khá nhiều trong một giờ rồi. Nghỉ một lát rồi hỏi tiếp, hoặc bấm Gặp admin nhé.",
      },
      { status: 429 },
    );
  }
  await db.assistantHit.create({ data: { ip, userId: user?.id ?? null } });

  // The thread's own record is the history; the picture rides on its last turn.
  const lines = await db.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS,
    select: { role: true, body: true },
  });
  const history: ChatTurn[] = lines
    .reverse()
    .map((line) => ({
      role: line.role === "CUSTOMER" ? ("user" as const) : ("assistant" as const),
      content: line.body,
    }));
  if (history.length === 0 || history[history.length - 1]!.role !== "user") {
    history.push({ role: "user", content: body });
  }
  history[history.length - 1] = {
    role: "user",
    content: caption || "Mình gửi ảnh chụp màn hình, bạn xem giúp mình với.",
  };

  try {
    const reply = await askAssistant(history, {
      base64: stored.data.toString("base64"),
      mediaType: "image/webp",
    });
    await appendChatMessage(thread.id, "BOT", reply);
    return NextResponse.json({ reply, threadId: thread.id, status: "BOT" });
  } catch (error) {
    if (error instanceof AssistantUpstreamError) {
      console.error(`[assistant] ảnh: ${error.message}`);
    } else if (error instanceof Anthropic.APIError) {
      console.error(`[assistant] ảnh, lỗi API ${error.status}: ${error.message}`);
    } else {
      console.error("[assistant] ảnh, lỗi không rõ", error);
    }
    return NextResponse.json(
      { error: "Trợ lý chưa xem được ảnh, bạn thử lại hoặc bấm Gặp admin nhé." },
      { status: 502 },
    );
  }
}
