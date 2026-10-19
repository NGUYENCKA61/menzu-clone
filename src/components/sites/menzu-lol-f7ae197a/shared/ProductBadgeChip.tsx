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
 * The words in sentence case, as tool names are printed, whatever case the
 * shop typed them in; the shop's colour on the rim, the words and the icon.
 *
 * `old` is the lab's ?ban=cu look: coloured spaced capitals on grey glass.
 */
export function ProductBadgeChip({
  badge,
  old = false,
}: {
  badge: ProductBadge;
  old?: boolean;
}) {
  const color = BADGE_COLORS[badge.color];
  return (
    <span
      className={
        old ? `${BADGE_PILL_BASE} ${color.pill}` : `${BADGE_CHIP} ${color.outline}`
      }
    >
      <BadgeIcon icon={badge.icon} />
      {old ? badge.label : sentenceCase(badge.label)}
    </span>
  );
}
