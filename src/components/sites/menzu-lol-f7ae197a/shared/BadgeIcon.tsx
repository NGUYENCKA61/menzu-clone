import {
  Clock,
  Crown,
  Flame,
  Sparkles,
  Star,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { type BadgeIconName } from "@/lib/productBadges";

/**
 * The glyph a badge carries, looked up by the name stored with it.
 *
 * The map lives here rather than in `productBadges` because that file is
 * imported by server code that has no business pulling an icon library in
 * behind it — the library holds the names, this holds the drawings.
 *
 * `none` renders nothing at all, which is what a badge reading "SẮP HẾT HÀNG"
 * wants — a star there reads as praise.
 */
const GLYPHS: Record<Exclude<BadgeIconName, "none">, LucideIcon> = {
  star: Star,
  flame: Flame,
  zap: Zap,
  crown: Crown,
  sparkles: Sparkles,
  clock: Clock,
  alert: TriangleAlert,
};

/**
 * The glyphs whose silhouette carries the whole meaning, so filling them in
 * makes them read at twelve pixels rather than dissolve into a few strokes.
 *
 * The others are left outlined on purpose: fill and stroke are both
 * currentColor, so a filled clock is a solid disc with its hands painted the
 * same colour as the face, and a filled warning triangle swallows the mark
 * that makes it a warning.
 */
const FILLED = new Set<BadgeIconName>([
  "star",
  "flame",
  "zap",
  "crown",
  "sparkles",
]);

export function BadgeIcon({
  icon,
  className = "h-3 w-3 shrink-0",
}: {
  icon: BadgeIconName;
  className?: string;
}) {
  if (icon === "none") return null;
  const Glyph = GLYPHS[icon];
  const filled = FILLED.has(icon);
  return (
    <Glyph
      className={className}
      fill={filled ? "currentColor" : "none"}
      // Heavier than Lucide's 2 so an outlined glyph holds up beside type this
      // bold at this size.
      strokeWidth={filled ? 2 : 2.5}
    />
  );
}
