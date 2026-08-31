import {
  Circle,
  Crown,
  Diamond,
  Gem,
  Hexagon,
  Sparkle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { TIER_RULES, type MemberTierValue } from "@/lib/memberTiers";

/**
 * The member tier the way a bank prints its own: a round seal with a
 * brushed-metal rim in the tier's metal and, at its centre, a geometric
 * glyph that grows more precious up the ladder — a dot, a hexagon, a gem, a
 * diamond, a burst of light. Nothing pictorial; the metal is the message.
 * `TierName` sets the tier's name in the same metal for callers that want
 * it; the icon variant (star, trophy, …) is kept for stepping back.
 *
 * Every class string is written out whole so Tailwind can see it.
 */

/** The glyph inside the seal, and the colour it is drawn in on the dark face. */
const SEAL_GLYPH: Record<MemberTierValue, { icon: LucideIcon; text: string }> = {
  CLASSIC: { icon: Circle, text: "text-neutral-200" },
  GOLD: { icon: Hexagon, text: "text-amber-300" },
  PLATINUM: { icon: Gem, text: "text-cyan-100" },
  DIAMOND: { icon: Diamond, text: "text-violet-300" },
  ELITE: { icon: Sparkles, text: "text-rose-300" },
};

/** The rim: a conic sweep of highlights and shadows in the tier's metal. */
const RIM: Record<MemberTierValue, string> = {
  CLASSIC:
    "bg-[conic-gradient(from_200deg,#f5f5f5,#8a8a8a_25%,#e8e8e8_45%,#6b6b6b_70%,#f5f5f5)] shadow-[0_6px_20px_rgba(0,0,0,0.5)]",
  GOLD: "bg-[conic-gradient(from_200deg,#fff3c4,#b8860b_25%,#ffe08a_45%,#8a6508_70%,#fff3c4)] shadow-[0_6px_22px_rgba(212,160,23,0.35)]",
  PLATINUM:
    "bg-[conic-gradient(from_200deg,#ffffff,#94a3b8_25%,#e2f4ff_45%,#5b7085_70%,#ffffff)] shadow-[0_6px_22px_rgba(148,163,184,0.35)]",
  DIAMOND:
    "bg-[conic-gradient(from_200deg,#ede9fe,#7c3aed_25%,#d8ccff_45%,#4c1d95_70%,#ede9fe)] shadow-[0_6px_22px_rgba(139,92,246,0.4)]",
  ELITE:
    "bg-[conic-gradient(from_200deg,#ffe4e6,#be123c_25%,#fecdd3_45%,#7f1d1d_70%,#ffe4e6)] shadow-[0_6px_22px_rgba(244,63,94,0.4)]",
};

/** Metallic type: a vertical sweep from highlight to shadow, clipped to
 *  the letters. Used for the seal's initial and for TierName. */
const METAL_TEXT: Record<MemberTierValue, string> = {
  CLASSIC: "bg-gradient-to-b from-white via-neutral-300 to-neutral-500",
  GOLD: "bg-gradient-to-b from-yellow-50 via-amber-300 to-yellow-700",
  PLATINUM: "bg-gradient-to-b from-white via-slate-200 to-slate-500",
  DIAMOND: "bg-gradient-to-b from-violet-100 via-violet-300 to-indigo-600",
  ELITE: "bg-gradient-to-b from-rose-100 via-rose-400 to-rose-800",
};

const SEAL_SIZE = {
  sm: { box: "h-9 w-9 p-[2px]", glyph: 15 },
  md: { box: "h-11 w-11 p-[2.5px]", glyph: 18 },
  lg: { box: "h-14 w-14 p-[3px]", glyph: 24 },
} as const;

const ICON: Record<MemberTierValue, { icon: LucideIcon; tile: string }> = {
  CLASSIC: {
    icon: Sparkle,
    tile: "border-neutral-400/40 bg-gradient-to-br from-neutral-400/25 via-neutral-400/[0.08] to-transparent text-neutral-200 shadow-[0_0_28px_rgba(163,163,163,0.18)]",
  },
  GOLD: {
    icon: Hexagon,
    tile: "border-amber-400/40 bg-gradient-to-br from-amber-400/30 via-amber-400/[0.08] to-transparent text-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.28)]",
  },
  PLATINUM: {
    icon: Gem,
    tile: "border-cyan-400/40 bg-gradient-to-br from-cyan-400/30 via-cyan-400/[0.08] to-transparent text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.28)]",
  },
  DIAMOND: {
    icon: Diamond,
    tile: "border-violet-400/40 bg-gradient-to-br from-violet-400/30 via-violet-400/[0.08] to-transparent text-violet-300 shadow-[0_0_28px_rgba(167,139,250,0.32)]",
  },
  ELITE: {
    icon: Crown,
    tile: "border-rose-400/40 bg-gradient-to-br from-rose-400/30 via-rose-400/[0.08] to-transparent text-rose-300 shadow-[0_0_28px_rgba(251,113,133,0.32)]",
  },
};

const ICON_SIZE = {
  sm: { box: "h-9 w-9 rounded-xl", icon: 16 },
  md: { box: "h-11 w-11 rounded-xl", icon: 20 },
  lg: { box: "h-14 w-14 rounded-2xl", icon: 26 },
} as const;

export function TierBadge({
  tier,
  size = "md",
  variant = "icon",
  className = "",
}: {
  tier: MemberTierValue;
  size?: "sm" | "md" | "lg";
  variant?: "seal" | "icon";
  className?: string;
}) {
  if (variant === "icon") {
    const { icon: Icon, tile } = ICON[tier];
    const s = ICON_SIZE[size];
    return (
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center border ${s.box} ${tile} ${className}`}
      >
        <Icon size={s.icon} strokeWidth={2.25} />
      </span>
    );
  }

  const s = SEAL_SIZE[size];
  const { icon: Glyph, text } = SEAL_GLYPH[tier];
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full ${s.box} ${RIM[tier]} ${className}`}
    >
      {/* The dark face inside the rim; a faint inner ring reads as a bevel. */}
      <span
        className={`grid h-full w-full place-items-center rounded-full bg-[#101114] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ${text}`}
      >
        <Glyph size={s.glyph} strokeWidth={2.25} />
      </span>
    </span>
  );
}

/** The tier's name in metallic type; size and tracking come from the caller. */
export function TierName({
  tier,
  className = "",
}: {
  tier: MemberTierValue;
  className?: string;
}) {
  return (
    <span
      className={`bg-clip-text font-black uppercase text-transparent ${METAL_TEXT[tier]} ${className}`}
    >
      {TIER_RULES[tier].label}
    </span>
  );
}
