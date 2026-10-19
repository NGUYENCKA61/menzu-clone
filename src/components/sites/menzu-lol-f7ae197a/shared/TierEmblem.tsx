import type { MemberTierValue } from "@/lib/memberTiers";

/**
 * A tier's mark: a faceted gem on a grey backing of its own shape, a small
 * white spark at its heart, in the manner of Valorant's ranks ("hay tham
 * khảo valorant", then "v2 đi", 19/10/2026). Our own shapes, climbing in
 * sides the way theirs do: a rhombus for Classic, a pentagon for Gold, a
 * hexagon for Platinum, an octagon for Diamond, a four-point star for Elite.
 * The left faces catch the light, the right ones fall in shadow, the table
 * in the middle sits between.
 *
 * Solid fills only, so the marks stay sharp at any size; after a day of
 * outlines and drawn glyphs the owner kept this one.
 */
type Gem = {
  back: string;
  left: string;
  right: string;
  table: string;
  light: string;
  mid: string;
  dark: string;
};

const GEMS: Record<MemberTierValue, Gem> = {
  CLASSIC: {
    back: "M12 2.97L20.05 12L12 21.03L3.95 12Z",
    left: "M12 4.6L5.4 12L12 19.4Z",
    right: "M12 4.6L18.6 12L12 19.4Z",
    table: "M12 8.67L14.97 12L12 15.33L9.03 12Z",
    light: "#f3f4f6",
    mid: "#c4c8ce",
    dark: "#8b9098",
  },
  GOLD: {
    back: "M6.14 4.24H17.86L20.54 11.56L12 21.07L3.46 11.56Z",
    left: "M12 5.6H7.2L5 11.6L12 19.4Z",
    right: "M12 5.6H16.8L19 11.6L12 19.4Z",
    table: "M9.84 9.01H14.16L15.15 11.71L12 15.22L8.85 11.71Z",
    light: "#fde68a",
    mid: "#f5b301",
    dark: "#c27c0e",
  },
  PLATINUM: {
    back: "M7.36 4.19H16.64L21.03 12L16.64 19.81H7.36L2.97 12Z",
    left: "M12 5.6H8.2L4.6 12L8.2 18.4H12Z",
    right: "M12 5.6H15.8L19.4 12L15.8 18.4H12Z",
    table: "M10.29 9.12H13.71L15.33 12L13.71 14.88H10.29L8.67 12Z",
    light: "#7ee8f5",
    mid: "#29b6c8",
    dark: "#157f8f",
  },
  DIAMOND: {
    back: "M8.4 3.33H15.6L20.67 8.4V15.6L15.6 20.67H8.4L3.33 15.6V8.4Z",
    left: "M12 4.89H9.05L4.89 9.05V14.95L9.05 19.11H12Z",
    right: "M12 4.89H14.95L19.11 9.05V14.95L14.95 19.11H12Z",
    table: "M10.67 8.8H13.33L15.2 10.67V13.33L13.33 15.2H10.67L8.8 13.33V10.67Z",
    light: "#efd6ff",
    mid: "#c38cf5",
    dark: "#8a4fd0",
  },
  ELITE: {
    back: "M12 1.51L14.68 9.32L22.49 12L14.68 14.68L12 22.49L9.32 14.68L1.51 12L9.32 9.32Z",
    left: "M12 3.4L9.8 9.8L3.4 12L9.8 14.2L12 20.6Z",
    right: "M12 3.4L14.2 9.8L20.6 12L14.2 14.2L12 20.6Z",
    table: "M12 8.13L12.99 11.01L15.87 12L12.99 12.99L12 15.87L11.01 12.99L8.13 12L11.01 11.01Z",
    // A true red, no pink in it ("Elite đổi sang tone màu đỏ thử k xài tone
    // hồng đỏ nữa"): red-400 / red-600 / red-800.
    light: "#f87171",
    mid: "#dc2626",
    dark: "#991b1b",
  },
};

const SPARK = "M12 9.6L12.7 11.3L14.4 12L12.7 12.7L12 14.4L11.3 12.7L9.6 12L11.3 11.3Z";

const SIZE = {
  md: "h-11 w-11",
  lg: "h-[60px] w-[60px]",
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
  const g = GEMS[tier];
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${SIZE[size]} ${className}`}>
      <path d={g.back} fill="#ffffff" fillOpacity={0.1} />
      <path d={g.left} fill={g.light} />
      <path d={g.right} fill={g.dark} />
      <path d={g.table} fill={g.mid} />
      <path d={SPARK} fill="#ffffff" fillOpacity={0.95} />
    </svg>
  );
}
