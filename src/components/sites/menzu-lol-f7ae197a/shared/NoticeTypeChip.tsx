import { TYPE_LABELS, type AnnouncementType } from "@/lib/announcements";

import { TYPE_ICONS } from "./announcementIcons";

/**
 * A notice's kind as the storefront prints it: the word, led by a 12px glyph,
 * so a list of mixed kinds reads at a glance (the owner, 03/10/2026: "có cần
 * thêm icon không cho dễ nhận dạng" → "thử đi"). The glyph is the one the
 * admin form and table already draw for that kind. Small and inside the
 * word's own tile: the big icon tile that came off the storefront on 25/09
 * stays off.
 *
 * A grey tile with only the glyph in red: three red tiles stacked in the
 * overview's list were three more red blocks on a page already carrying the
 * title icon, the role plate, the tier and the top-up button ("coi lại trang
 * tổng quan xem có rối quá không" → "thử đi").
 */
export function NoticeTypeChip({ type }: { type: AnnouncementType }) {
  const Icon = TYPE_ICONS[type];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
      <Icon size={12} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
      {TYPE_LABELS[type]}
    </span>
  );
}
