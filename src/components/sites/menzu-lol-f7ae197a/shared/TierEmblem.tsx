import { TIER_STYLE, type MemberTierValue } from "@/lib/memberTiers";

/**
 * A tier's mark since 19/10/2026 ("thay icon mới cho nhìn đỡ kì"): one
 * medal for all five, a hexagon around a star, a crown at the top of the
 * ladder, in the tier's own colour. Flat the way the site's chips are (a
 * light fill and rim of the colour, the mark solid), so the five read as one
 * set where TierBadge drew five unrelated glyphs in glowing gradient tiles.
 */
const SIZE = {
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

const HEXAGON = "M12 1.5L21.09 6.75V17.25L12 22.5L2.91 17.25V6.75Z";
const STAR =
  "M12 7.3L13.23 10.6L16.76 10.76L14 12.95L14.94 16.35L12 14.4L9.06 16.35L10 12.95L7.24 10.76L10.77 10.6Z";
const CROWN = "M8 14.6L7 9.2L9.6 11.7L12 7.9L14.4 11.7L17 9.2L16 14.6Z";

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
      <path
        d={tier === "ELITE" ? CROWN : STAR}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      {tier === "ELITE" ? (
        <rect x="8" y="15.5" width="8" height="1.3" rx="0.65" fill="currentColor" />
      ) : null}
    </svg>
  );
}
