import { useId, type ReactNode } from "react";

import { TIER_STYLE, type MemberTierValue } from "@/lib/memberTiers";

/**
 * A tier's mark since 19/10/2026: a solid glyph in the tier's own colour,
 * its faces split by cut gaps, on a round frame of the same colour. The
 * style is the owner's two references (a faceted star for Platinum, a solid
 * cut diamond for Diamond: "diamond kiểu vậy đi"), drawn for all five so the
 * set holds together ("làm lại 1 bộ cho nó đồng bộ đi", K2 of a lab sheet):
 * a shield for Classic (the star went to Platinum), a medal, the faceted
 * star, the cut diamond, and for Elite the crown of the site's old icon
 * filled in, with three jewels cut out ("cái icon elite xấu quá kìa như cũ
 * thì đẹp hơn").
 *
 * Then "làm sao các icon nét với đồng bộ lại đi" and "thêm khung đi": the
 * glyphs are sized to look the same size (the shield a step down, the medal
 * a touch up, a fuller star), the gaps cut wider so they stay sharp at 44px,
 * and every mark sits on the same round frame, a light fill and a faint rim
 * of its colour, so five different silhouettes take the same room.
 *
 * The gaps are a mask, so they show the frame behind; each mark masks with
 * its own id.
 */
const SIZE = {
  md: "h-11 w-11",
  lg: "h-[60px] w-[60px]",
} as const;

/** How much of the frame the glyphs fill. */
const INNER = 0.8;

const OLD_CROWN =
  "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z";

const GLYPH: Record<MemberTierValue, { shape: ReactNode; cuts: ReactNode; scale: number }> = {
  CLASSIC: {
    shape: (
      <path d="M12 4.6L18.4 7.1V11.6C18.4 15.5 15.7 18.6 12 20C8.3 18.6 5.6 15.5 5.6 11.6V7.1Z" />
    ),
    cuts: <path d="M12 4.6V20M5.6 9.6L12 12L18.4 9.6" />,
    scale: 0.9,
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
    scale: 1.02,
  },
  PLATINUM: {
    shape: (
      <path d="M12 4.5L14.29 9.34L19.61 10.03L15.71 13.71L16.7 18.97L12 16.4L7.3 18.97L8.29 13.71L4.39 10.03L9.71 9.34Z" />
    ),
    cuts: (
      <>
        <path d="M12 4.5V10.8M19.61 10.03L13.62 11.97M16.7 18.97L13 13.88M7.3 18.97L11 13.88M4.39 10.03L10.38 11.97" />
        <path d="M12 10.8L13.62 11.97L13 13.88H11L10.38 11.97Z" fill="black" />
      </>
    ),
    scale: 1,
  },
  DIAMOND: {
    shape: <path d="M7.6 6.6H16.4L19.8 9.9L12 18.4L4.2 9.9Z" />,
    cuts: <path d="M4.2 9.9H19.8M7.6 6.6L9 9.9L12 6.6L15 9.9L16.4 6.6M9 9.9L12 18.4L15 9.9" />,
    scale: 1,
  },
  ELITE: {
    shape: (
      <>
        <path d={OLD_CROWN} stroke="currentColor" strokeWidth={0.8} strokeLinejoin="round" />
        <rect x="5" y="19.4" width="14" height="2.2" rx="1.1" />
      </>
    ),
    cuts: (
      <>
        <circle cx="8.6" cy="13.4" r="0.8" fill="black" />
        <circle cx="12" cy="13.4" r="0.8" fill="black" />
        <circle cx="15.4" cy="13.4" r="0.8" fill="black" />
      </>
    ),
    scale: 0.82,
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
  const { shape, cuts, scale } = GLYPH[tier];
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`shrink-0 ${SIZE[size]} ${TIER_STYLE[tier].text} ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="11.4"
        fill="currentColor"
        fillOpacity={0.12}
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeWidth={0.6}
      />
      <g transform={`translate(12 12) scale(${INNER * scale}) translate(-12 -12)`}>
        <mask id={id} maskUnits="userSpaceOnUse" x="-12" y="-12" width="48" height="48">
          <rect x="-12" y="-12" width="48" height="48" fill="white" />
          <g
            fill="none"
            stroke="black"
            strokeWidth={1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {cuts}
          </g>
        </mask>
        <g fill="currentColor" mask={`url(#${id})`}>
          {shape}
        </g>
      </g>
    </svg>
  );
}
