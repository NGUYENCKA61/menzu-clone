import { NextResponse } from "next/server";

import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import {
  phoneOtpStatus,
  startPhoneOtp,
  verificationFailure,
} from "@/lib/verification";

/**
 * "Gửi mã qua Zalo": a code for the number typed, carried by the shop's Zalo
 * bot to that number's own Zalo once it has checked the number is the linked
 * account's. The form then polls GET ?id= until the bot has sent or refused.
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
