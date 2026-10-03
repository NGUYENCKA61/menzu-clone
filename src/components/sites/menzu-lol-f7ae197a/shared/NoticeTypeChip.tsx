import { TYPE_LABELS, type AnnouncementType } from "@/lib/announcements";

import { TYPE_ICONS } from "./announcementIcons";

/**
 * One soft colour per kind, picked clear of what colours already mean on
 * this site (green is success, amber is waiting, red is the shop and an
 * error): blue for something new, a deep orange for a warning, pink for a
 * sale, violet for a present, grey for a plain notice (the owner, 03/10/2026:
 * "mỗi nhãn có nên cho 1 màu không" → "r thử"). Tinted the way the status
 * pills are: rim /30, fill /10, text 400. The admin keeps its one red.
 */
const TYPE_TONE: Record<AnnouncementType, string> = {
  UPDATE: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  MAINTENANCE: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  PROMO: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  GIFT: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  INFO: "border-white/10 bg-white/5 text-neutral-300",
};

/**
 * A notice's kind as the storefront prints it: the word, led by a 12px glyph,
 * so a list of mixed kinds reads at a glance (the owner, 03/10/2026: "có cần
 * thêm icon không cho dễ nhận dạng" → "thử đi"). The glyph is the one the
 * admin form and table already draw for that kind. Small and inside the
 * word's own tile: the big icon tile that came off the storefront on 25/09
 * stays off.
 */
export function NoticeTypeChip({ type }: { type: AnnouncementType }) {
  const Icon = TYPE_ICONS[type];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${TYPE_TONE[type]}`}
    >
      <Icon size={12} className="shrink-0" aria-hidden />
      {TYPE_LABELS[type]}
    </span>
  );
}
