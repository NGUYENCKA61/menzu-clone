import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import type {
  AnnouncementAudience,
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
  audience: AnnouncementAudience;
  bullets: string[];
  noticeTitle: string | null;
  noticeBody: string | null;
  startAt: Date;
  endAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  /** Who it is addressed to. Empty for an ALL notice, and admin-only. */
  recipients: string[];
}

interface RawRow {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  status: string;
  audience: string;
  bullets: string[];
  noticeTitle: string | null;
  noticeBody: string | null;
  startAt: Date;
  endAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  recipients?: { user: { username: string } }[];
}

function toRow(row: RawRow): AnnouncementRow {
  return {
    ...row,
    type: row.type as AnnouncementType,
    priority: row.priority as AnnouncementPriority,
    status: row.status as AnnouncementStatus,
    audience: row.audience as AnnouncementAudience,
    recipients: (row.recipients ?? []).map((r) => r.user.username),
  };
}

/** Everything, newest first — the admin table shows drafts and dead notices too. */
export async function listAnnouncements(take = 100): Promise<AnnouncementRow[]> {
  const rows = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      recipients: {
        select: { user: { select: { username: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return rows.map(toRow);
}

/**
 * What one reader should see, most important first.
 *
 * `startAt <= now <= endAt` is the whole schedule test, which is why this needs
 * no scheduler: a notice becomes live because the clock moved, not because
 * something ran. The same rule is `isAnnouncementActive` in the pure module —
 * changing one without the other means the bell and the modal disagree.
 *
 * Addressing is decided here too, and only here. A targeted notice is fetched
 * by matching the reader's own id against the recipient rows, so a notice
 * meant for one customer is never loaded for anybody else and cannot leak by
 * reaching the browser and being hidden there. `userId` is null for a guest,
 * who by definition matches no recipient row and so sees only ALL.
 *
 * Capped low. This is read on every page load, and a visitor confronted with
 * twelve notices reads none of them.
 */
export async function activeAnnouncements(
  userId: string | null,
  now: Date = new Date(),
  take = 5,
): Promise<AnnouncementRow[]> {
  const rows = await db.announcement.findMany({
    where: {
      status: "PUBLISHED",
      startAt: { lte: now },
      // Both conditions are an OR, and two of those cannot sit side by side in
      // one `where` — the second would replace the first, which here would
      // mean either every expired notice or every private one going out.
      AND: [
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        userId
          ? { OR: [{ audience: "ALL" }, { recipients: { some: { userId } } }] }
          : { audience: "ALL" },
      ],
    },
    // Descending over a Postgres enum sorts by declaration order, and
    // AnnouncementPriority is declared LOW → NORMAL → HIGH, so this puts HIGH
    // first. That coupling is quiet enough to break by accident: reordering
    // the enum in the schema silently reverses this list.
    orderBy: [{ priority: "desc" }, { startAt: "desc" }],
    take,
  });
  // No recipients included: the reader has no business knowing who else was
  // addressed, and this list is serialised into the page they receive.
  return rows.map(toRow);
}

/**
 * The same list, deduplicated within a request.
 *
 * The header renders on most pages and some of them render it more than once
 * on the way down the tree; without this each of those is a round trip to
 * Postgres for a list that cannot have changed between them.
 *
 * Keyed on the reader, so two different people in the same process never share
 * an entry.
 */
export const currentAnnouncements = cache(
  async (userId: string | null): Promise<AnnouncementRow[]> =>
    activeAnnouncements(userId, new Date()),
);
