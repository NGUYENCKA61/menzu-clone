import { Gift, Info, Megaphone, Tag, Wrench, type LucideIcon } from "lucide-react";

import type { AnnouncementType } from "@/lib/announcements";

/**
 * One glyph per kind of announcement.
 *
 * Kept in a single module because three screens draw it — the admin form, the
 * admin table, and the notice the customer sees — and a promotion that is a
 * tag in one place and a gift in another is worse than no icon at all.
 *
 * Lives beside the components rather than in lib/announcements: that module is
 * pure and imported by server code, and it has no business pulling React
 * components in behind it.
 */
export const TYPE_ICONS: Record<AnnouncementType, LucideIcon> = {
  UPDATE: Megaphone,
  MAINTENANCE: Wrench,
  PROMO: Tag,
  GIFT: Gift,
  // Not named in the brief. Megaphone was given to Cập nhật, so the plain
  // notice takes the obvious spare rather than repeating a glyph already
  // spoken for — two kinds wearing one icon is the thing an icon exists to
  // prevent.
  INFO: Info,
};

/**
 * The tile behind each glyph, one colour per kind.
 *
 * They were all the shop's red, on the theory that the glyph alone would
 * tell them apart; in the bell's list five red squares in a column read as
 * five of the same thing, and the owner asked for colour. Red stays with
 * the promotion - the kind that sells - and the rest take a colour with a
 * meaning of its own: amber for maintenance (caution), the wheel's violet
 * for a gift, sky for an update, and a plain grey for a plain notice.
 */
export const TYPE_TILE: Record<AnnouncementType, string> = {
  UPDATE: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  MAINTENANCE: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  PROMO: "border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]",
  INFO: "border-white/12 bg-white/[0.06] text-neutral-300",
  GIFT: "border-[var(--menzu-violet)]/40 bg-[var(--menzu-violet)]/15 text-[var(--menzu-violet)]",
};

/** The kind's name in the same colour as its tile, for the line above a title. */
export const TYPE_TEXT: Record<AnnouncementType, string> = {
  UPDATE: "text-sky-400",
  MAINTENANCE: "text-amber-400",
  PROMO: "text-[var(--menzu-accent)]",
  INFO: "text-neutral-400",
  GIFT: "text-[var(--menzu-violet)]",
};
