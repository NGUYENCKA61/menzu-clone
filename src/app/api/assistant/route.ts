import { NextResponse } from "next/server";

import Anthropic from "@anthropic-ai/sdk";

import { askAssistant, assistantConfigured } from "@/lib/assistant";
import { MAX_QUESTION, sanitizeHistory } from "@/lib/assistantPrompt";
import { clientIp } from "@/lib/clientIp";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * The AI assistant's one endpoint: a question in, an answer out.
 *
 * Every call here costs the shop money, and the page it is reached from is
 * public, so the throttle is not a nicety — it is the only thing between the
 * shop and somebody holding down a send button. Two windows, both hourly:
 * one per address, one per account, and a signed-in visitor must pass both.
 */

export const dynamic = "force-dynamic";
/** The SDK is a Node client, not an edge one. */
export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
/** A visitor with a real question asks a handful; this is well past that. */
const MAX_PER_IP = 25;
/** Looser for a signed-in customer: they have paid, or are about to. */
const MAX_PER_USER = 60;

export async function POST(request: Request) {
  if (!assistantConfigured()) {
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
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const history = sanitizeHistory((body as { messages?: unknown })?.messages);
  if (history.length === 0 || history[history.length - 1]!.role !== "user") {
    return NextResponse.json(
      { error: `Bạn nhập câu hỏi giúp mình (tối đa ${MAX_QUESTION} ký tự).` },
      { status: 400 },
    );
  }

  const ip = clientIp(request);
  const user = await getCurrentUser();
  const since = { gte: new Date(Date.now() - WINDOW_MS) };

  const [byIp, byUser] = await Promise.all([
    db.assistantHit.count({ where: { ip, createdAt: since } }),
    user
      ? db.assistantHit.count({ where: { userId: user.id, createdAt: since } })
      : Promise.resolve(0),
  ]);

  if (byIp >= MAX_PER_IP || (user && byUser >= MAX_PER_USER)) {
    return NextResponse.json(
      {
        error:
          "Bạn hỏi khá nhiều trong một giờ rồi. Nghỉ một lát rồi hỏi tiếp, " +
          "hoặc nhắn thẳng cho admin qua kênh hỗ trợ nhé.",
      },
      { status: 429 },
    );
  }

  // Written before the answer, not after: a request that dies halfway still
  // cost the shop tokens, and a throttle that only counts successes is a
  // throttle an attacker can walk through by making every call fail.
  await db.assistantHit.create({ data: { ip, userId: user?.id ?? null } });
  try {
    await db.assistantHit.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - WINDOW_MS) } },
    });
  } catch {
    // Housekeeping; the visitor's answer does not depend on it.
  }

  try {
    const reply = await askAssistant(history);
    return NextResponse.json({ reply });
  } catch (error) {
    // The visitor gets one sentence and somewhere else to go; the detail goes
    // to the server log, where the shop can see whether it is a bad key, a
    // rate limit at the model, or something else.
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[assistant] API key bị từ chối");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("[assistant] bị giới hạn tốc độ phía model");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`[assistant] lỗi API ${error.status}: ${error.message}`);
    } else {
      console.error("[assistant] lỗi không rõ", error);
    }

    return NextResponse.json(
      { error: "Trợ lý đang bận, bạn thử lại sau ít phút hoặc nhắn admin nhé." },
      { status: 502 },
    );
  }
}
