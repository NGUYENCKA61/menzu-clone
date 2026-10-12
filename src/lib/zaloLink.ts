import "server-only";

import { randomInt } from "node:crypto";

import { db } from "@/lib/db";
import { LINK_CODE_TTL_MS, makeLinkCodeValue } from "@/lib/zaloShared";

/**
 * A fresh link code for one account, good for LINK_CODE_TTL_MS. One live
 * code per account: the older ones go, so a code read off a screen a week
 * ago opens nothing. The bot (bot/zalo) redeems it.
 */
export async function issueLinkCode(
  userId: string,
): Promise<{ code: string; expiresAt: Date }> {
  await db.zaloLinkCode.deleteMany({ where: { userId } });
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeLinkCodeValue((max) => randomInt(max));
    try {
      await db.zaloLinkCode.create({ data: { code, userId, expiresAt } });
      return { code, expiresAt };
    } catch {
      // Another customer holds this code right now: draw again.
    }
  }
  throw new Error("Không tạo được mã liên kết");
}

/** The account forgets its Zalo; the next notice no longer goes there. */
export async function unlinkZalo(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { zaloId: null, zaloName: null },
  });
}
