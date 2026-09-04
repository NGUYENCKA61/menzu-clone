import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";

export interface CurrentUser {
  id: string;
  uid: number;
  username: string;
  email: string | null;
  avatarUrl: string | null;
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
  createdAt: Date;
}

/**
 * Resolves the signed-in user from the session cookie, or null.
 *
 * Expired rows are treated as absent and deleted on sight, so a stale cookie
 * can never authenticate. Session ids are opaque random tokens stored as the
 * primary key — there is nothing in the cookie to forge.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
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
    await db.session.deleteMany({ where: { userId: session.userId } }).catch(() => {});
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    email: u.email,
    avatarUrl: u.avatarUrl,
    role: u.role,
    tier: u.tier,
    balance: Number(u.balance),
    points: u.points,
    commissionBalance: Number(u.commissionBalance),
    telegramId: u.telegramId,
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
