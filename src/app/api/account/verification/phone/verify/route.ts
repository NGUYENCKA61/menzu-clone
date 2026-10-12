import { NextResponse } from "next/server";

import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import { confirmPhoneOtp, verificationFailure } from "@/lib/verification";

/** The code from Zalo, typed back: right, and the number counts as proved. */
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
    code?: unknown;
  } | null;
  try {
    return NextResponse.json(await confirmPhoneOtp(user.id, body?.code));
  } catch (error) {
    const failure = verificationFailure(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
