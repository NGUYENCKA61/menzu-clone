import "server-only";

import { BODY_MAX, RECIPIENTS_MAX, TITLE_MAX, type AnnouncementType } from "@/lib/announcements";
import { db } from "@/lib/db";
import { categoryHref, productHref } from "@/lib/routes";
import { SOFTWARE_STATUS, STATUS_EVENT_COPY, type SoftwareStatusValue } from "@/lib/softwareStatus";
import { clauseAsSentence, statusNoteToPlainText } from "@/lib/statusNote";

/** How long a follower's notice stays listed. */
const NOTICE_DAYS = 14;

/** The notice's type pill: an update in progress reads as maintenance. */
const TYPE_FOR: Record<SoftwareStatusValue, AnnouncementType> = {
  UPDATING: "MAINTENANCE",
  UPDATED: "UPDATE",
  DETECTED: "INFO",
  RISKY: "INFO",
  UNDETECTED: "INFO",
  STABLE: "INFO",
};

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Tells the people following a tool that it changed state.
 *
 * Following used to mean a row on the header's bell; the bell came off the
 * storefront (25/09/2026) and left following with nowhere to arrive. Now a
 * change reaches each follower as a notice of their own — addressed, so no
 * one else reads it — that opens by itself on their next page (the
 * storefront's notice sheet) and stays listed on /thong-bao. The owner,
 * 01/10/2026: "thử đi" to that plan.
 *
 * One notice per change, named for the tool, or for the category when a
 * whole shelf moved at once; followers of any tool in the batch get it once.
 * The shop's note rides along as plain text (notices are plain text), and
 * the button opens the tool or the shelf.
 *
 * Called after the change is saved and fails quietly, like the Telegram post
 * beside it: the status has changed either way, and a notice that could not
 * be written must not turn the desk's save into an error.
 */
export async function notifyStatusFollowers(change: {
  productIds: string[];
  status: SoftwareStatusValue;
  note: string | null;
  imageUrl: string | null;
  /** Set when a whole category moved at once. */
  category?: { name: string; slug: string };
}): Promise<void> {
  try {
    if (change.productIds.length === 0) return;
    const followers = await db.softwareStatusSubscription.findMany({
      where: { productId: { in: change.productIds }, user: { blockedAt: null } },
      select: { userId: true },
      distinct: ["userId"],
    });
    if (followers.length === 0) return;

    let name: string;
    let href: string;
    if (change.category) {
      name = `${change.category.name} · cả danh mục`;
      href = categoryHref(change.category.slug);
    } else {
      const product = await db.product.findUnique({
        where: { id: change.productIds[0] },
        select: { name: true, code: true, slug: true, category: { select: { slug: true } } },
      });
      if (!product) return;
      name = product.name ?? product.code;
      href = productHref(product.category.slug, product.slug);
    }

    const said = change.note
      ? statusNoteToPlainText(change.note)
      : clauseAsSentence(STATUS_EVENT_COPY[change.status]);
    const notice = {
      title: clip(`${SOFTWARE_STATUS[change.status].label}: ${name}`, TITLE_MAX),
      body: clip(said, BODY_MAX),
      type: TYPE_FOR[change.status],
      priority: change.status === "DETECTED" ? ("HIGH" as const) : ("NORMAL" as const),
      status: "PUBLISHED" as const,
      audience: "USERS" as const,
      bullets: [],
      silent: false,
      // Kept only when it is one of the shop's own uploads, the rule every
      // notice picture follows.
      imageUrl: change.imageUrl?.startsWith("/uploads/") ? change.imageUrl : null,
      ctaLabel: change.category ? "Xem danh mục" : "Xem tool",
      ctaHref: href,
      endAt: new Date(Date.now() + NOTICE_DAYS * 24 * 3600 * 1000),
    };

    // A notice names at most RECIPIENTS_MAX readers, as one written in the
    // desk does; a bigger following gets the same notice in several parts.
    for (let at = 0; at < followers.length; at += RECIPIENTS_MAX) {
      const part = followers.slice(at, at + RECIPIENTS_MAX);
      await db.announcement.create({
        data: {
          ...notice,
          recipients: { createMany: { data: part.map((f) => ({ userId: f.userId })) } },
        },
      });
    }
  } catch (error) {
    console.error("[status-followers] khong gui duoc thong bao", error);
  }
}
