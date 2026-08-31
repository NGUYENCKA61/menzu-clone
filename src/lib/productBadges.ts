/**
 * The pills beside a tool's detection state — "TOP #1 BÁN CHẠY", "MỚI RA MẮT".
 *
 * Stored as one text column holding one badge per line, the same shape the
 * feature and requirement lists use. A column per badge would have made "let
 * the shop add a third" a migration; a line per badge makes it a number.
 *
 * Each line is `label`, `label|colour` or `label|colour|icon`. The shorter
 * forms are what earlier badges were written as and still read correctly, so
 * nothing has to be rewritten for a new field to exist.
 */

/** How many the buy panel has room for beside the status pill. */
export const MAX_BADGES = 2;
/** Longer than this and the pill wraps onto a second line. */
export const MAX_BADGE_LENGTH = 40;

/**
 * The card every badge wears, whatever colour it is.
 *
 * Frosted neutral glass in the site's own chrome — the same border and fill
 * the panels around it use — with the colour left entirely to the words. The
 * quietest of the styles on purpose: this page already carries a red price, a
 * red buy button and a green status dot, and a badge that competed with those
 * would be the fourth thing shouting. Coloured text on neutral glass is read,
 * not shouted.
 */
export const BADGE_PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest backdrop-blur";

/**
 * The palette: the word the admin picks by, the text colour it prints in, and
 * the dot that stands for it in the picker.
 *
 * Written out rather than composed from the colour name because Tailwind reads
 * the source for literal class names — `text-${color}-300` compiles to nothing
 * at all.
 *
 * A fixed set, not a colour picker: a shop that can choose any hex will
 * eventually choose one that cannot be read on this background, and these
 * already say the things a badge says — urgent, hot, prized, playful, safe,
 * new, special, quiet.
 */
export const BADGE_COLORS = {
  red: {
    label: "Đỏ",
    pill: "text-[var(--menzu-accent)]",
    swatch: "bg-[var(--menzu-accent)]",
  },
  orange: {
    label: "Cam",
    pill: "text-orange-300",
    swatch: "bg-orange-500",
  },
  // Keyed `amber` because that is what the first badges were stored as; only
  // the word the admin reads was wrong — it renders gold, not orange.
  amber: {
    label: "Vàng",
    pill: "text-amber-300",
    swatch: "bg-amber-500",
  },
  pink: {
    label: "Hồng",
    pill: "text-pink-300",
    swatch: "bg-pink-500",
  },
  emerald: {
    label: "Xanh lá",
    pill: "text-emerald-300",
    swatch: "bg-emerald-500",
  },
  sky: {
    label: "Xanh dương",
    pill: "text-sky-300",
    swatch: "bg-sky-500",
  },
  violet: {
    label: "Tím",
    pill: "text-violet-300",
    swatch: "bg-violet-500",
  },
  neutral: {
    label: "Xám",
    pill: "text-neutral-200",
    swatch: "bg-neutral-400",
  },
} as const;

export type BadgeColor = keyof typeof BADGE_COLORS;

/** What a badge with no colour of its own is drawn in. */
export const DEFAULT_BADGE_COLOR: BadgeColor = "red";

/** The order the admin's swatches are offered in. */
export const BADGE_COLOR_KEYS = Object.keys(BADGE_COLORS) as BadgeColor[];

/**
 * The glyphs a badge can carry, by what the badge is for.
 *
 * A star says "we rate this"; it does not say "hurry" or "careful", which is
 * why a fixed star on every badge put a commendation next to "SẮP HẾT HÀNG".
 * The set is small and each entry means something different — a longer list
 * would just be the Lucide index, and the shop would be picking pictures
 * rather than picking a meaning.
 *
 * `none` is first because a badge that needs no glyph is a normal badge, not
 * a badge missing something.
 */
export const BADGE_ICONS = {
  none: "Không icon",
  star: "Ngôi sao",
  flame: "Ngọn lửa",
  zap: "Tia chớp",
  crown: "Vương miện",
  sparkles: "Lấp lánh",
  clock: "Đồng hồ",
  alert: "Cảnh báo",
} as const;

export type BadgeIconName = keyof typeof BADGE_ICONS;

/**
 * What a badge stored before icons existed carries.
 *
 * The star, not `none`: every badge on the shop wore one the day this was
 * written, and defaulting to nothing would have quietly stripped them.
 */
export const DEFAULT_BADGE_ICON: BadgeIconName = "star";

/** The order the admin's glyph buttons are offered in. */
export const BADGE_ICON_KEYS = Object.keys(BADGE_ICONS) as BadgeIconName[];

export interface ProductBadge {
  label: string;
  color: BadgeColor;
  icon: BadgeIconName;
}

function readColor(raw: string | undefined): BadgeColor {
  const key = raw?.trim().toLowerCase();
  return key && key in BADGE_COLORS ? (key as BadgeColor) : DEFAULT_BADGE_COLOR;
}

function readIcon(raw: string | undefined): BadgeIconName {
  const key = raw?.trim().toLowerCase();
  return key && key in BADGE_ICONS ? (key as BadgeIconName) : DEFAULT_BADGE_ICON;
}

/** The class string a pill wears, for any colour name including a bad one. */
export function badgePillClass(color: string): string {
  return BADGE_COLORS[readColor(color)].pill;
}

/** Stored text → the badges to print. Blank lines and spare badges dropped. */
export function parseBadges(stored: string | null): ProductBadge[] {
  if (!stored) return [];
  const out: ProductBadge[] = [];
  for (const line of stored.split("\n")) {
    // Split on the first bar only for the label: the fields after it are one
    // word each, and a label that somehow kept a bar keeps the rest of itself.
    const bar = line.indexOf("|");
    const label = (bar === -1 ? line : line.slice(0, bar)).trim();
    if (!label) continue;
    const rest = bar === -1 ? [] : line.slice(bar + 1).split("|");
    out.push({
      label,
      color: readColor(rest[0]),
      icon: readIcon(rest[1]),
    });
    if (out.length === MAX_BADGES) break;
  }
  return out;
}

/**
 * What the admin typed → the column, or null when nothing survives.
 *
 * Capped rather than refused: a badge is a slogan, and the only thing a long
 * one breaks is its own pill. Null rather than "" so an emptied form leaves
 * the column the way a tool that never had a badge leaves it.
 *
 * Accepts bare strings as well as `{label, color}` so a caller that does not
 * care about colour — a script, an older client — still works.
 */
export function serializeBadges(input: unknown): string | null {
  if (!Array.isArray(input)) return null;
  const lines: string[] = [];
  for (const entry of input) {
    const raw =
      typeof entry === "string"
        ? { label: entry, color: undefined, icon: undefined }
        : entry && typeof entry === "object"
          ? (entry as { label?: unknown; color?: unknown; icon?: unknown })
          : null;
    if (!raw || typeof raw.label !== "string") continue;
    // The bar is the separator, so it cannot survive inside a label.
    const label = raw.label.replace(/\|/g, " ").trim().slice(0, MAX_BADGE_LENGTH);
    if (!label) continue;
    const color = readColor(
      typeof raw.color === "string" ? raw.color : undefined,
    );
    const icon = readIcon(typeof raw.icon === "string" ? raw.icon : undefined);
    lines.push(`${label}|${color}|${icon}`);
    if (lines.length === MAX_BADGES) break;
  }
  return lines.length > 0 ? lines.join("\n") : null;
}
