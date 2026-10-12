import { NextResponse } from "next/server";

import Anthropic from "@anthropic-ai/sdk";

import {
  askAssistant,
  assistantConfigured,
  AssistantUpstreamError,
} from "@/lib/assistant";
import { MAX_QUESTION, sanitizeHistory } from "@/lib/assistantPrompt";
import { DAY_MS, HOUR_MS, throttleReason } from "@/lib/assistantThrottle";
import { clientIp } from "@/lib/clientIp";
import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

/**
 * The AI assistant's one endpoint: a question in, an answer out.
 *
 * Every call here costs the shop money or free allowance, and the page it is
 * reached from is public, so the throttle is not a nicety — it is the only
 * thing between the shop and somebody holding down a send button. Four
 * windows: an hour per address, an hour per account, and an hour and a day
 * for the whole shop (the numbers live in assistantThrottle). Only the shop's
 * own pages may call: another site's page would spend the allowance under
 * its visitors' addresses.
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

  const ip = clientIp(request);
  const user = await getCurrentUser();
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
          "hoặc nhắn thẳng cho admin qua kênh hỗ trợ nhé.",
      },
      { status: 429 },
    );
  }
  if (refused === "visitor") {
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
    // A day's rows are kept for the shop's daily window; older ones go.
    await db.assistantHit.deleteMany({
      where: { createdAt: { lt: new Date(now - DAY_MS) } },
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
        error: "Trợ lý đang bận, bạn thử lại sau ít phút hoặc nhắn admin nhé.",
      },
      { status: 502 },
    );
  }
}
