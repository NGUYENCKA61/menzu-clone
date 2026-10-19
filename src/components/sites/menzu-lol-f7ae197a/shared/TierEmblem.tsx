import { useId, type ReactNode } from "react";

import { TIER_STYLE, type MemberTierValue } from "@/lib/memberTiers";

/**
 * A tier's mark since 19/10/2026: a solid glyph in the tier's own colour,
 * its faces split by thin cut gaps, no frame. The style is the owner's two
 * references (a faceted star for Platinum, a solid cut diamond for Diamond:
 * "diamond kiểu vậy đi"), drawn for all five so the set holds together
 * ("làm lại 1 bộ cho nó đồng bộ đi"), picked as K2 of three on a lab sheet
 * ("k2 đi"): a shield for Classic (the star went to Platinum), a medal,
 * the faceted star, the cut diamond, a crown on its band.
 *
 * The gaps are a mask, so they show whatever is behind the mark; each mark
 * masks with its own id.
 */
const SIZE = {
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

const GLYPH: Record<MemberTierValue, { shape: ReactNode; cuts: ReactNode }> = {
  CLASSIC: {
    shape: (
      <path d="M12 4.6L18.4 7.1V11.6C18.4 15.5 15.7 18.6 12 20C8.3 18.6 5.6 15.5 5.6 11.6V7.1Z" />
    ),
    cuts: <path d="M12 4.6V20M5.6 9.6L12 12L18.4 9.6" />,
  },
  GOLD: {
    shape: (
      <>
        <path d="M7.4 4.4H10.4L12.7 9.7L10.2 10.6Z" />
        <path d="M16.6 4.4H13.6L11.3 9.7L13.8 10.6Z" />
        <circle cx="12" cy="14.7" r="4.7" />
      </>
    ),
    cuts: (
      <>
        <circle cx="12" cy="14.7" r="5.3" />
        <circle cx="12" cy="14.7" r="3.1" />
      </>
    ),
  },
  PLATINUM: {
    shape: (
      <path d="M12 5L13.82 10.09L19.23 10.25L14.95 13.56L16.47 18.75L12 15.7L7.53 18.75L9.05 13.56L4.77 10.25L10.18 10.09Z" />
    ),
    cuts: (
      <>
        <path d="M12 5V11M19.23 10.25L13.6 12.08M16.47 18.75L12.99 13.96M7.53 18.75L11.01 13.96M4.77 10.25L10.4 12.08" />
        <path d="M12 10.9L13.62 12.07L13 13.97H11L10.38 12.07Z" fill="black" />
      </>
    ),
  },
  DIAMOND: {
    shape: <path d="M7.6 6.6H16.4L19.8 9.9L12 18.4L4.2 9.9Z" />,
    cuts: <path d="M4.2 9.9H19.8M7.6 6.6L9 9.9L12 6.6L15 9.9L16.4 6.6M9 9.9L12 18.4L15 9.9" />,
  },
  ELITE: {
    shape: (
      <>
        <path d="M5.4 15.8L4.6 8.4L8.8 11.2L12 5.8L15.2 11.2L19.4 8.4L18.6 15.8Z" />
        <rect x="5.4" y="16.7" width="13.2" height="2" rx="0.5" />
      </>
    ),
    cuts: <path d="M8.8 11.2L9.6 15.8M15.2 11.2L14.4 15.8" />,
  },
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
  const id = useId();
  const { shape, cuts } = GLYPH[tier];
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`shrink-0 ${SIZE[size]} ${TIER_STYLE[tier].text} ${className}`}
    >
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="white" />
        <g
          fill="none"
          stroke="black"
          strokeWidth={0.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {cuts}
        </g>
      </mask>
      <g fill="currentColor" mask={`url(#${id})`}>
        {shape}
      </g>
    </svg>
  );
}
