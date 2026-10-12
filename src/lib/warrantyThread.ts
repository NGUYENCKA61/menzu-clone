import "server-only";

import { dayStamp } from "@/lib/dayGroups";
import type { ChatMessage } from "@/lib/warrantyChat";
import type { WarrantyStatus } from "@/lib/warrantyRequests";

/** The columns a thread is drawn from — the same for the pages and the poll. */
export const MESSAGE_SELECT = {
  id: true,
  fromShop: true,
  body: true,
  imageUrl: true,
  status: true,
  createdAt: true,
  // Which admin answered, by name: the thread signs the shop's lines with
  // it (the owner, 12/10/2026: "Shop đổi thành tên của admin trả lời").
  author: { select: { username: true, avatarUrl: true } },
} as const;

/** A stored message as the screens take it. */
export function toChatMessage(row: {
  id: string;
  fromShop: boolean;
  body: string;
  imageUrl: string | null;
  status: WarrantyStatus | null;
  createdAt: Date;
  author?: { username: string; avatarUrl: string | null } | null;
}): ChatMessage {
  return {
    id: row.id,
    fromShop: row.fromShop,
    body: row.body,
    imageUrl: row.imageUrl,
    status: row.status,
    author: row.fromShop ? (row.author?.username ?? null) : null,
    authorAvatar: row.fromShop ? (row.author?.avatarUrl ?? null) : null,
    at: dayStamp(row.createdAt),
    sentAt: row.createdAt.toISOString(),
  };
}
