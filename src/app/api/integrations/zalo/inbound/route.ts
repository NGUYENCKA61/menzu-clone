import { NextResponse } from "next/server";

import { handleZaloMessage } from "@/lib/zaloShop";
import {
  sameZaloSecret,
  ZALO_INBOUND_HEADER,
  zaloInboundSecret,
} from "@/lib/zaloInbound";

/**
 * Where the Zalo bot hands over what a customer typed in a private chat and
 * collects what to answer (src/lib/zaloShop.ts). Only the bot may call it: the
 * secret header is derived from DATABASE_URL, which the bot process shares.
 *
 * Throttled per Zalo account, quietly: past the limit the bot is told to say
 * nothing, so a flood earns no replies and the shop's Zalo account is not
 * seen sending a stream of messages.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function tooMany(zaloId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(zaloId) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(zaloId, recent);
  if (hits.size > 5_000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (
    !databaseUrl ||
    !sameZaloSecret(
      request.headers.get(ZALO_INBOUND_HEADER) ?? "",
      zaloInboundSecret(databaseUrl),
    )
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    zaloId?: unknown;
    name?: unknown;
    text?: unknown;
    state?: unknown;
  } | null;
  const zaloId =
    typeof body?.zaloId === "string" ? body.zaloId.trim().slice(0, 64) : "";
  const text = typeof body?.text === "string" ? body.text.slice(0, 500) : "";
  const name =
    typeof body?.name === "string" ? body.name.trim().slice(0, 80) : null;
  if (!zaloId || !text.trim()) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (tooMany(zaloId)) {
    return NextResponse.json({ replies: [], state: body?.state ?? null });
  }

  try {
    const answer = await handleZaloMessage({
      zaloId,
      name,
      text,
      state: body?.state,
    });
    return NextResponse.json(answer);
  } catch (error) {
    console.error("[zalo-shop] failed:", error);
    return NextResponse.json({
      replies: [{ text: "Shop đang bận, bạn thử lại sau ít phút nhé." }],
      state: null,
    });
  }
}
