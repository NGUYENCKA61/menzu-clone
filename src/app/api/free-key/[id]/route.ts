import { NextResponse } from "next/server";

import { freeClaimStatus } from "@/lib/freeKey";
import { getCurrentUser } from "@/lib/session";

/** The tool page polling its ticket while the customer passes the shortlink. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  const { id } = await context.params;
  const outcome = await freeClaimStatus(id, user.id);
  return NextResponse.json(outcome, {
    headers: { "cache-control": "no-store" },
  });
}
