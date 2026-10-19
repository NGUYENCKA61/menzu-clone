import { Crown, Diamond, Gem, Hexagon, Shield, type LucideIcon } from "lucide-react";

import { TIER_STYLE, type MemberTierValue } from "@/lib/memberTiers";

/**
 * A tier's mark, no frame, in the tier's own colour: the site's own icons,
 * picked one by one by the owner on 19/10/2026 after a day of drawn marks
 * (hexagon frames, solid cut glyphs, a faceted star). Gold the old hexagon
 * ("cái gold dùng icon này đi"), Platinum the old rhombus ("plantium xài"),
 * Diamond a diamond ("diamond tui vẫn thích icon kim cương hơn"), Elite the
 * old crown ("như cũ thì đẹp hơn"), and a shield for Classic.
 *
 * All five as outlines at a whole-pixel size with the line held at exactly
 * 2px ("làm cho icon nét lại"): the drawn marks were scaled by fractions,
 * which put their edges between pixels and blurred them.
 */
const ICON: Record<MemberTierValue, LucideIcon> = {
  CLASSIC: Shield,
  GOLD: Hexagon,
  PLATINUM: Diamond,
  DIAMOND: Gem,
  ELITE: Crown,
};

const SIZE = {
  md: { box: "h-11 w-11", icon: 28 },
  lg: { box: "h-[60px] w-[60px]", icon: 36 },
} as const;

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
      className={`grid shrink-0 place-items-center ${s.box} ${TIER_STYLE[tier].text} ${className}`}
    >
      <Icon size={s.icon} strokeWidth={2} absoluteStrokeWidth />
    </span>
  );
}
