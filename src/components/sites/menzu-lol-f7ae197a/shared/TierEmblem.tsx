import type { ReactNode } from "react";

import { TIER_STYLE, type MemberTierValue } from "@/lib/memberTiers";

/**
 * A tier's mark since 19/10/2026 ("thay icon mới cho nhìn đỡ kì"): the same
 * hexagon for all five in the tier's own colour, flat the way the site's
 * chips are (a light fill and rim of the colour, the mark solid), so the five
 * read as one set where TierBadge drew five unrelated glyphs in glowing
 * gradient tiles. Inside, a mark that climbs with the ladder: a star, gold
 * bars, a cup, a cut diamond, a crown. The owner wanted Diamond's to be a
 * diamond ("diamond tui vẫn thích icon kim cương hơn") and Gold's and
 * Platinum's to be their own ("gold platium là cái gì đó nó khác cho đẹp
 * hơn đi"; the star made Platinum look "lỏ").
 *
 * The cuts across solid marks are drawn in the card's own dark.
 */
const SIZE = {
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

const HEXAGON = "M12 1.5L21.09 6.75V17.25L12 22.5L2.91 17.25V6.75Z";
const CUT = "#111111";

const MARK: Record<MemberTierValue, ReactNode> = {
  CLASSIC: (
    <path
      d="M12 7.3L13.23 10.6L16.76 10.76L14 12.95L14.94 16.35L12 14.4L9.06 16.35L10 12.95L7.24 10.76L10.77 10.6Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={0.8}
      strokeLinejoin="round"
    />
  ),
  GOLD: (
    <g fill="currentColor" stroke={CUT} strokeWidth={0.7} strokeLinejoin="round">
      <path d="M5.4 15.8L6.6 12.6H11L12.2 15.8Z" />
      <path d="M11.8 15.8L13 12.6H17.4L18.6 15.8Z" />
      <path d="M8.6 12L9.8 8.8H14.2L15.4 12Z" />
    </g>
  ),
  PLATINUM: (
    <g fill="currentColor">
      <path d="M8.6 7.1H15.4V10C15.4 11.9 13.9 13.5 12 13.5C10.1 13.5 8.6 11.9 8.6 10Z" />
      <path
        d="M8.6 8.2H7.1C7.1 10 7.9 11.1 9.2 11.5M15.4 8.2H16.9C16.9 10 16.1 11.1 14.8 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <rect x="11.2" y="13.4" width="1.6" height="1.9" />
      <rect x="9" y="15.3" width="6" height="1.5" rx="0.5" />
    </g>
  ),
  DIAMOND: (
    <g strokeLinejoin="round">
      <path
        d="M9 7.5H15L17.6 10.3L12 16.9L6.4 10.3Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.8}
      />
      <path
        d="M6.4 10.3H17.6M9 7.5L10.4 10.3L12 16.9L13.6 10.3L15 7.5"
        fill="none"
        stroke={CUT}
        strokeOpacity={0.6}
        strokeWidth={0.6}
      />
    </g>
  ),
  ELITE: (
    <g fill="currentColor">
      <path
        d="M8 14.6L7 9.2L9.6 11.7L12 7.9L14.4 11.7L17 9.2L16 14.6Z"
        stroke="currentColor"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <rect x="8" y="15.5" width="8" height="1.3" rx="0.65" />
    </g>
  ),
};

export function TierEmblem({
  tier,
  size = "md",
  className = "",
}: {
  tier: MemberTierValue;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`shrink-0 ${SIZE[size]} ${TIER_STYLE[tier].text} ${className}`}
    >
      <path
        d={HEXAGON}
        fill="currentColor"
        fillOpacity={0.12}
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {MARK[tier]}
    </svg>
  );
}
