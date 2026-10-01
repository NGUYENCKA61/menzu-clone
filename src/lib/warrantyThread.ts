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
} as const;

/** A stored message as the screens take it. */
export function toChatMessage(row: {
  id: string;
  fromShop: boolean;
  body: string;
  imageUrl: string | null;
  status: WarrantyStatus | null;
  createdAt: Date;
}): ChatMessage {
  return {
    id: row.id,
    fromShop: row.fromShop,
    body: row.body,
    imageUrl: row.imageUrl,
    status: row.status,
    at: dayStamp(row.createdAt),
    sentAt: row.createdAt.toISOString(),
  };
}
