import "server-only";

import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { zaloTopUpCreditedMessage } from "@/lib/zaloShared";

/**
 * Money in, told on Zalo (the Zalo review, 23/10/2026): queued for the bot
 * the way every notice is; best-effort, after the credit is safely written.
 */
export async function notifyTopUpOnZalo(
  userId: string,
  code: string,
  received: bigint,
  balance: bigint,
): Promise<void> {
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { zaloId: true } });
    if (!user?.zaloId) return;
    const message = zaloTopUpCreditedMessage({
      code,
      received,
      balance,
      walletUrl: absoluteUrl(`/wallet/${encodeURIComponent(code)}`),
    });
    await db.zaloOutbox.create({
      data: { zaloId: user.zaloId, text: message.text, styles: message.styles },
    });
  } catch (error) {
    console.error("[zalo] top-up notice failed", error);
  }
}
