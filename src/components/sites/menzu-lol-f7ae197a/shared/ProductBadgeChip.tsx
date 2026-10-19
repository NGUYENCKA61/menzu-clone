import { sentenceCase } from "@/lib/displayCase";
import {
  BADGE_CHIP,
  BADGE_COLORS,
  BADGE_PILL_BASE,
  type ProductBadge,
} from "@/lib/productBadges";

import { BadgeIcon } from "./BadgeIcon";

/**
 * One badge as the customer sees it, on the tool page and in the admin's
 * preview.
 *
 * White words in sentence case, as tool names are printed, whatever case the
 * shop typed them in; the shop's colour on the mark in front of them: the
 * icon it picked, else a leading "#" ("#TOP BÁN CHẠY" is typed that way),
 * else a dot like the state chip's, so a badge with no icon still says its
 * colour.
 *
 * `old` is the lab's ?ban=cu look: the words in the colour, spaced capitals.
 */
export function ProductBadgeChip({
  badge,
  old = false,
}: {
  badge: ProductBadge;
  old?: boolean;
}) {
  const color = BADGE_COLORS[badge.color];
  if (old) {
    return (
      <span className={`${BADGE_PILL_BASE} ${color.pill}`}>
        <BadgeIcon icon={badge.icon} />
        {badge.label}
      </span>
    );
  }
  const label = sentenceCase(badge.label);
  const hash = badge.icon === "none" && label.length > 1 && label.startsWith("#");
  return (
    <span className={BADGE_CHIP}>
      {badge.icon !== "none" ? (
        <BadgeIcon icon={badge.icon} className={`h-3 w-3 shrink-0 ${color.pill}`} />
      ) : hash ? (
        <span aria-hidden className={color.pill}>
          #
        </span>
      ) : (
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${color.swatch}`} />
      )}
      {hash ? label.slice(1) : label}
    </span>
  );
}
