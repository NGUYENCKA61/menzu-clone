import "server-only";

import { getCurrentUser, type CurrentUser } from "@/lib/session";

/**
 * Resolves the caller and confirms they are an admin.
 *
 * The role is read from the database row every time rather than trusted from
 * the cookie, so revoking admin takes effect immediately instead of when the
 * session happens to expire. Middleware cannot do this — it only sees whether
 * a session cookie exists — so every admin page and route handler calls this.
 */
export async function getAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

/** JSON 403 body shared by the admin API routes. */
export const FORBIDDEN = { error: "Bạn không có quyền truy cập" } as const;
