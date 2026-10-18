import { TYPE_LABELS, type AnnouncementType } from "@/lib/announcements";

import { TYPE_ICONS, TYPE_TILE } from "./announcementIcons";

/**
 * A notice's kind as the storefront prints it: the word in the shop's red
 * tile, led by a 12px glyph, so a list of mixed kinds reads at a glance (the
 * owner, 03/10/2026: "có cần thêm icon không cho dễ nhận dạng" → "thử đi").
 * The glyph is the one the admin form and table already draw for that kind.
 * Small and inside the word's own tile: the big icon tile that came off the
 * storefront on 25/09 stays off. The size of the state chips on the tabs
 * beside it, 12px semibold (18/10/2026, "xét sự đồng bộ luôn"), where it was
 * 11px medium; `old` is /thong-bao?ban=cu's look from before.
 */
export function NoticeTypeChip({ type, old = false }: { type: AnnouncementType; old?: boolean }) {
  const Icon = TYPE_ICONS[type];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 ${
        old ? "gap-1 text-[11px] font-medium" : "gap-1.5 text-[12px] font-semibold"
      } ${TYPE_TILE}`}
    >
      <Icon size={12} className="shrink-0" aria-hidden />
      {TYPE_LABELS[type]}
    </span>
  );
}
