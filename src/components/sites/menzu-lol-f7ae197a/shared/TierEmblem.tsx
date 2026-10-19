import { Crown, Gem, Medal, Star, Trophy, type LucideIcon } from "lucide-react";

import { TIER_STYLE, type MemberTierValue } from "@/lib/memberTiers";

/**
 * A tier's mark since 19/10/2026 ("thay icon mới cho nhìn đỡ kì"): the same
 * hexagon for all five in the tier's own colour, flat the way the site's
 * chips are (a light fill and rim of the colour), so the five read as one
 * set where TierBadge drew five unrelated glyphs in glowing gradient tiles.
 *
 * Inside, one icon family drawn one way, the site's own Lucide at stroke 2
 * ("rà soát làm lại 1 bộ cho nó đồng bộ đi"), climbing with the ladder: a
 * star, a medal, a cup, a diamond (the owner: "diamond tui vẫn thích icon
 * kim cương hơn"), a crown. Hand-drawn marks came before this the same day
 * and did not hold together: gold bars looked "kì", the star made Platinum
 * look "lỏ".
 */
const ICON: Record<MemberTierValue, LucideIcon> = {
  CLASSIC: Star,
  GOLD: Medal,
  PLATINUM: Trophy,
  DIAMOND: Gem,
  ELITE: Crown,
};

const SIZE = {
  md: { box: "h-10 w-10", glyph: 18 },
  lg: { box: "h-14 w-14", glyph: 26 },
} as const;

const HEXAGON = "M12 1.5L21.09 6.75V17.25L12 22.5L2.91 17.25V6.75Z";

export function TierEmblem({
  tier,
  size = "md",
  className = "",
}: {
  tier: MemberTierValue;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const Icon = ICON[tier];
  const s = SIZE[size];
  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center ${s.box} ${TIER_STYLE[tier].text} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full">
        <path
          d={HEXAGON}
          fill="currentColor"
          fillOpacity={0.12}
          stroke="currentColor"
          strokeOpacity={0.55}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </svg>
      <Icon size={s.glyph} strokeWidth={2} className="relative" />
    </span>
  );
}
