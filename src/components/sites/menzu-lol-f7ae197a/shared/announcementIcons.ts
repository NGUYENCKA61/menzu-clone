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
 * The tile behind each glyph.
 *
 * All the same red. The brief asked for one accent and the modal reference
 * shows every kind wearing it — the icon is what distinguishes them, not the
 * colour, which keeps a list of four rows from reading as a paint chart.
 */
export const TYPE_TILE =
  "border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]";
