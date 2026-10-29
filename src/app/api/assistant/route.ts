import { NextResponse } from "next/server";

import Anthropic from "@anthropic-ai/sdk";

import {
  askAssistant,
  assistantConfigured,
  AssistantUpstreamError,
} from "@/lib/assistant";
import { handoffReason } from "@/lib/chatHandoff";
import { MAX_QUESTION, sanitizeHistory } from "@/lib/assistantPrompt";
import { DAY_MS, HOUR_MS, throttleReason } from "@/lib/assistantThrottle";
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

/**
 * The AI assistant's one endpoint: a question in, an answer out — and since
 * the CRM desk (29/10/2026), a record. Every exchange lands in the thread
 * store so the admin can read it at /admin/crm, and three kinds of question
 * never reach the model at all: a thread already handed to the admin (the
 * bot has lost its turn), a message the hand-off rules catch (money, a dead
 * key, a customer past arguing), and anything over the throttle.
 *
 * Every model call costs the shop money or free allowance, and the page it
 * is reached from is public, so the throttle is not a nicety — it is the
 * only thing between the shop and somebody holding down a send button. Four
 * windows: an hour per address, an hour per account, and an hour and a day
 * for the whole shop (the numbers live in assistantThrottle). Only the
 * shop's own pages may call: another site's page would spend the allowance
 * under its visitors' addresses.
 */

export const dynamic = "force-dynamic";
/** The SDK is a Node client, not an edge one. */
export const runtime = "nodejs";

export async function POST(request: Request) {
  // The same door the sign-in and warranty routes use: a page elsewhere must
  // not be able to spend the allowance through its visitors' browsers.
  if (crossSiteRequest(request)) {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ" },
      { status: 403 },
    );
  }

  if (!assistantConfigured(await getShopSettings())) {
    // Not an error the visitor caused: the shop has not set a key. The widget
    // hides the chat when this is the case, so this is the belt to that brace.
    return NextResponse.json(
      { error: "Trợ lý AI chưa được bật. Bạn nhắn admin qua kênh hỗ trợ nhé." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ" },
      { status: 400 },
    );
  }

  const history = sanitizeHistory((body as { messages?: unknown })?.messages);
  if (history.length === 0 || history[history.length - 1]!.role !== "user") {
    return NextResponse.json(
      { error: `Bạn nhập câu hỏi giúp mình (tối đa ${MAX_QUESTION} ký tự).` },
      { status: 400 },
    );
  }
  const question = history[history.length - 1]!.content;

  // The conversation this message belongs to. The viewer is the signed-in
  // customer or the guest cookie; a cookie minted here is set on this same
  // response, so the next message finds the same thread.
  const viewer = await readChatViewer();
  const thread = await threadForNewMessage(viewer);
  if (viewer.mintedGuestKey) await setGuestCookie(viewer.mintedGuestKey);

  if (thread.status === "NEED_ADMIN") {
    // The admin holds this conversation: store the customer's words for them
    // and keep the model out of it. This path spends no allowance, so it has
    // its own small cap against someone leaning on the button.
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
    await appendChatMessage(thread.id, "CUSTOMER", question);
    return NextResponse.json({ threadId: thread.id, status: "NEED_ADMIN" });
  }

  await appendChatMessage(thread.id, "CUSTOMER", question);

  // Money, a key that still fails, a customer past arguing: the desk's
  // cases, decided before any model gets to improvise about a refund.
  const user = await getCurrentUser();
  const reason = handoffReason(question);
  if (reason) {
    await handoffToAdmin({
      threadId: thread.id,
      reason,
      excerpt: question,
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
  if (refused === "shop") {
    return NextResponse.json(
      {
        error:
          "Trợ lý đang bận vì nhiều người hỏi cùng lúc. Bạn thử lại sau, " +
          "hoặc bấm Gặp admin để admin trả lời nhé.",
      },
      { status: 429 },
    );
  }
  if (refused === "visitor") {
    return NextResponse.json(
      {
        error:
          "Bạn hỏi khá nhiều trong một giờ rồi. Nghỉ một lát rồi hỏi tiếp, " +
          "hoặc bấm Gặp admin để admin trả lời nhé.",
      },
      { status: 429 },
    );
  }

  // Written before the answer, not after: a request that dies halfway still
  // cost the shop tokens, and a throttle that only counts successes is a
  // throttle an attacker can walk through by making every call fail.
  await db.assistantHit.create({ data: { ip, userId: user?.id ?? null } });
  try {
    // A day's rows are kept for the shop's daily window; older ones go.
    await db.assistantHit.deleteMany({
      where: { createdAt: { lt: new Date(now - DAY_MS) } },
    });
  } catch {
    // Housekeeping; the visitor's answer does not depend on it.
  }

  try {
    const reply = await askAssistant(history);
    await appendChatMessage(thread.id, "BOT", reply);
    return NextResponse.json({ reply, threadId: thread.id, status: "BOT" });
  } catch (error) {
    // The visitor gets one sentence and somewhere else to go; the detail goes
    // to the server log, where the shop can see whether it is a bad key, a
    // rate limit at the model, or something else.
    if (error instanceof AssistantUpstreamError) {
      const what =
        error.kind === "auth"
          ? "API key bị từ chối"
          : error.kind === "rate"
            ? "bị giới hạn tốc độ phía model"
            : "dịch vụ model trả lỗi";
      console.error(`[assistant] ${what}: ${error.message}`);
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.error("[assistant] API key bị từ chối");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("[assistant] bị giới hạn tốc độ phía model");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`[assistant] lỗi API ${error.status}: ${error.message}`);
    } else {
      console.error("[assistant] lỗi không rõ", error);
    }

    return NextResponse.json(
      {
        error: "Trợ lý đang bận, bạn thử lại sau ít phút hoặc bấm Gặp admin nhé.",
      },
      { status: 502 },
    );
  }
}
