import { NextResponse } from "next/server";

import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import {
  phoneOtpStatus,
  startPhoneOtp,
  verificationFailure,
} from "@/lib/verification";

/**
 * "Lấy mã": a code for the number typed, which the customer sends to the
 * shop's Zalo bot from their linked Zalo (the bot never writes first); the
 * bot only looks the number up to see it is that Zalo's. The form then polls
 * GET ?id= until the code has come back right or the number was refused.
 */
export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ" },
      { status: 403 },
    );
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    phone?: unknown;
  } | null;
  try {
    return NextResponse.json(await startPhoneOtp(user.id, body?.phone));
  } catch (error) {
    const failure = verificationFailure(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });
  return NextResponse.json(await phoneOtpStatus(user.id, id), {
    headers: { "cache-control": "no-store" },
  });
}
