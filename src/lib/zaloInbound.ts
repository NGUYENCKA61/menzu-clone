/**
 * The handshake between the Zalo bot and the website (the owner, 13/10/2026:
 * "làm bot zalo thử", a shop on Zalo like the Telegram one). The bot forwards
 * what a customer typed to the website, which owns the catalogue, the wallet
 * and the sale, and sends back what to answer; the bot only carries words.
 *
 * Shared by the bot process and the route, so no "server-only" and nothing
 * from the app: node:crypto and plain types.
 *
 * The secret is derived from DATABASE_URL, which both processes already hold
 * and which is a stronger secret than anything that would be added for this:
 * whoever knows it can already write to the shop's database directly.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { ZaloStyleRange } from "./zaloShared";

export const ZALO_INBOUND_PATH = "/api/integrations/zalo/inbound";
export const ZALO_INBOUND_HEADER = "x-zalo-bot-secret";

export function zaloInboundSecret(databaseUrl: string): string {
  return createHmac("sha256", databaseUrl)
    .update("zalo-inbound-v1")
    .digest("hex");
}

/** Constant-time, so the secret does not leak through response timing. */
export function sameZaloSecret(given: string, want: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && b.length > 0 && timingSafeEqual(a, b);
}

/** One message for the bot to send: styled text, or a picture with a caption. */
export interface ZaloShopReply {
  text: string;
  styles?: ZaloStyleRange[];
  /** An absolute image address (the VietQR code); the bot fetches and sends it. */
  imageUrl?: string;
}

export interface ZaloInboundAnswer {
  replies: ZaloShopReply[];
  /**
   * Where the conversation stands (which numbered list the customer is
   * looking at), held by the bot per chat and sent back with the next
   * message; null clears it.
   */
  state: unknown;
}
