import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";

export interface CurrentUser {
  id: string;
  uid: number;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  /** The member's own overview cover; null falls back to the shop's. */
  bannerUrl: string | null;
  role: string;
  tier: string;
  balance: number;
  points: number;
  /** Referral earnings waiting to be moved into `balance`. */
  commissionBalance: number;
  /** The đại lý's own negotiated percent; 0 for everyone else. */
  agencyPercent: number;
  /** Telegram user id when the account is reachable through the shop bot. */
  telegramId: string | null;
  /** Zalo peer id and the name the notice bot saw, once linked from Bảo mật. */
  zaloId: string | null;
  zaloName: string | null;
  /** When the shop granted "xác thực cấp 2"; null is level 1. */
  verifiedAt: Date | null;
  createdAt: Date;
}

/**
 * Resolves the signed-in user from the session cookie, or null.
 *
 * Expired rows are treated as absent and deleted on sight, so a stale cookie
 * can never authenticate. Session ids are opaque random tokens stored as the
 * primary key — there is nothing in the cookie to forge.
 *
 * Memoised per request, as getShopSettings is: the header, the page, the
 * account frame and the floating widget each ask who is signed in, and one
 * page view should cost one session read, not four. The memo lives for one
 * request only, so a sign-in or a block is seen on the very next one; outside
 * a render (a script, a test) `cache` is a plain call.
 */
export const getCurrentUser = cache(readCurrentUser);

async function readCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: token } }).catch(() => {});
    return null;
  }

  // Blocking has to bite here, not only at sign-in: someone already holding a
  // valid session would otherwise keep spending and buying until it expired.
  // Their sessions are dropped so the block survives a page reload.
  if (session.user.blockedAt) {
    await db.session
      .deleteMany({ where: { userId: session.userId } })
      .catch(() => {});
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    email: u.email,
    avatarUrl: u.avatarUrl,
    bannerUrl: u.bannerUrl,
    role: u.role,
    tier: u.tier,
    balance: Number(u.balance),
    points: u.points,
    commissionBalance: Number(u.commissionBalance),
    telegramId: u.telegramId,
    zaloId: u.zaloId,
    zaloName: u.zaloName,
    verifiedAt: u.verifiedAt,
    agencyPercent: u.agencyPercent,
    createdAt: u.createdAt,
  };
}

/** For route handlers that must have a user. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
