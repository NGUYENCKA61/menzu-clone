import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";

export async function POST(request: Request) {
  // Signing somebody out from another site is only a nuisance, but it is the
  // same one-line guard, and a visitor thrown out mid-checkout by a page they
  // happened to open would have no idea why.
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }

  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  if (token) {
    await db.session.delete({ where: { id: token } }).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
