import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import type {
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementType,
} from "@/lib/announcements";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  startAt: Date;
  endAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

function toRow(row: {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  status: string;
  startAt: Date;
  endAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): AnnouncementRow {
  return {
    ...row,
    type: row.type as AnnouncementType,
    priority: row.priority as AnnouncementPriority,
    status: row.status as AnnouncementStatus,
  };
}

/** Everything, newest first — the admin table shows drafts and dead notices too. */
export async function listAnnouncements(take = 100): Promise<AnnouncementRow[]> {
  const rows = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(toRow);
}

/**
 * What a visitor should see, most important first.
 *
 * `startAt <= now <= endAt` is the whole test, which is why this needs no
 * scheduler: a notice becomes live because the clock moved, not because
 * something ran. The same rule is `isAnnouncementActive` in the pure module —
 * changing one without the other means the bell and the modal disagree.
 *
 * Capped low. This is read on every page load, and a visitor confronted with
 * twelve notices reads none of them.
 */
export async function activeAnnouncements(
  now: Date = new Date(),
  take = 5,
): Promise<AnnouncementRow[]> {
  const rows = await db.announcement.findMany({
    where: {
      status: "PUBLISHED",
      startAt: { lte: now },
      OR: [{ endAt: null }, { endAt: { gte: now } }],
    },
    // Descending over a Postgres enum sorts by declaration order, and
    // AnnouncementPriority is declared LOW → NORMAL → HIGH, so this puts HIGH
    // first. That coupling is quiet enough to break by accident: reordering
    // the enum in the schema silently reverses this list.
    orderBy: [{ priority: "desc" }, { startAt: "desc" }],
    take,
  });
  return rows.map(toRow);
}

/**
 * The same list, deduplicated within a request.
 *
 * The header renders on most pages and some of them render it more than once
 * on the way down the tree; without this each of those is a round trip to
 * Postgres for a list that cannot have changed between them.
 */
export const currentAnnouncements = cache(
  async (): Promise<AnnouncementRow[]> => activeAnnouncements(new Date()),
);
