import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  CircleCheck,
  Eye,
  Layers,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductCard } from "./productRowData";

/**
 * Which accent the tiles wear. The service rows keep the indigo the captured
 * site used; the category rows are the shop's own red.
 */
export type RowTone = "indigo" | "menzu";

export interface ProductRowProps {
  heading: string;
  /**
   * Drawn after the heading text, vertically centered with it — a Lucide
   * icon standing in for an emoji the heading would otherwise carry.
   * Decorative: pass it aria-hidden.
   */
  headingSuffix?: React.ReactNode;
  cards: ProductCard[];
  /** Destination of the row's "Xem tất cả" link — the matching index page. */
  viewAllHref: string;
  tone?: RowTone;
  className?: string;
}

/**
 * Full class strings per tone, never composed — Tailwind reads source text and
 * cannot see a class name that only exists once the template has run.
 */
const TONES: Record<RowTone, {
  card: string;
  frame: string;
  /** How the cover art meets the frame — cover crops, contain letterboxes. */
  image: string;
  title: string;
  buttonEdge: string;
  buttonFace: string;
}> = {
  indigo: {
    card: "border-indigo-500/20 hover:border-indigo-500/50",
    frame: "border-indigo-500/10 group-hover:border-indigo-500/30",
    image: "object-cover",
    title: "group-hover:text-indigo-400",
    buttonEdge: "bg-indigo-500/50 group-hover:bg-indigo-500",
    buttonFace: "bg-[#12141c] group-hover:bg-indigo-500",
  },
  // A faint red ring at rest — enough to trace the tile without competing
  // with the always-lit XEM NGAY button — brightening under the pointer. The
  // image frame stays borderless; the art bleeds to the frame's own rounding.
  menzu: {
    card: "border-[var(--menzu-accent)]/25 hover:border-[var(--menzu-accent)]/70",
    frame: "border-transparent",
    image: "object-cover",
    title: "group-hover:text-[var(--menzu-accent)]",
    buttonEdge: "bg-[var(--menzu-accent)] group-hover:bg-[var(--menzu-accent-dark)]",
    buttonFace: "bg-[var(--menzu-accent)] group-hover:bg-[var(--menzu-accent-dark)]",
  },
};

interface StatTone {
  bg: string;
  border: string;
  text: string;
  icon: LucideIcon;
}

// Tailwind can't see dynamically-built class names, so every stat tone needs
// its full class strings spelled out here, keyed by the stat label.
const STAT_TONES: Record<string, StatTone> = {
  "Đã Bán": {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-500",
    icon: ShoppingBag,
  },
  "Đang Bán": {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-500",
    icon: Boxes,
  },
  "Loại SP": {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-400",
    icon: Layers,
  },
  "Giá từ": {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-500",
    icon: Tag,
  },
  "Báo giá": {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-500",
    icon: Tag,
  },
  "Đã xong": {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-500",
    icon: CircleCheck,
  },
};

// Safe fallback so the tone lookup stays total for any unrecognized label.
const DEFAULT_STAT_TONE: StatTone = {
  bg: "bg-indigo-500/10",
  border: "border-indigo-500/20",
  text: "text-indigo-400",
  icon: Layers,
};

function getStatTone(label: string): StatTone {
  return STAT_TONES[label] ?? DEFAULT_STAT_TONE;
}

/**
 * Stats the card no longer prints.
 *
 * A display filter, deliberately, and not a change upstream: `soldCount` and
 * `stockCount` are still queried, still carried in the row data, and still
 * editable on the admin's category screen — they are shop-facing marketing
 * figures somebody may want back. Removing them from `homeRows` instead would
 * have deleted the numbers along with the tiles.
 *
 * The service rows share this component and keep their own stats ("Giá từ",
 * "Đã xong"), which is why this names two labels rather than dropping the
 * block outright.
 */
const HIDDEN_STATS = new Set(["Đã Bán", "Đang Bán"]);

export function ProductRow({
  heading,
  headingSuffix,
  cards,
  viewAllHref,
  tone = "indigo",
  className,
}: ProductRowProps) {
  const t = TONES[tone];

  return (
    <section className={cn("w-full", className)}>
      <div className="flex flex-row items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-5 bg-[var(--menzu-accent)] rounded-full shrink-0" />
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            {heading}
          </h2>
          {headingSuffix}
        </div>
        <Link
          href={viewAllHref}
          className="group flex items-center gap-1 text-[10px] sm:text-xs font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest border-b border-neutral-700 hover:border-[var(--brand)]"
        >
          <span className="hidden sm:inline">XEM TẤT CẢ</span>
          <span className="sm:hidden">XEM THÊM</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => {
          const stats = card.stats.filter((s) => !HIDDEN_STATS.has(s.label));

          return (
          <Link
            key={card.href}
            href={card.href}
            className={cn(
              "group flex flex-col bg-[#12141c] rounded-xl overflow-hidden border transition-all duration-300 p-3 sm:p-4",
              t.card,
            )}
          >
            {/* 16/9 — the ratio the shop exports its covers at, so a standard
                cover fills the frame edge to edge with nothing cropped and
                nothing letterboxed. */}
            <div
              className={cn(
                "relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-4 border transition-colors",
                t.frame,
              )}
            >
              <Image
                src={card.image}
                alt={card.title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className={cn(
                  "transition-transform duration-500 group-hover:scale-110",
                  t.image,
                )}
              />
            </div>

            <h3
              className={cn(
                "text-center text-sm sm:text-base font-black uppercase text-white mb-2 transition-colors tracking-widest drop-shadow-md",
                t.title,
              )}
            >
              {card.title}
            </h3>

            {/* Clamped at two lines rather than trusted to be short: the text
                is typed into an admin field, and one long entry would
                otherwise stretch its tile taller than the three beside it and
                pull the whole row's buttons out of line. */}
            {card.description ? (
              <p className="text-center text-[11px] sm:text-xs leading-relaxed text-neutral-400 mb-4 line-clamp-2">
                {card.description}
              </p>
            ) : (
              <div className="mb-2" />
            )}

            {/* Dropped entirely when nothing is left, so a card with no stats
                does not carry the block's bottom margin as a stray gap. */}
            {stats.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 mb-3 sm:mb-4">
              {stats.map((stat) => {
                const tone = getStatTone(stat.label);
                const StatIcon = tone.icon;

                return (
                  <div
                    key={stat.label}
                    className="bg-[#0a0a0d] rounded-lg p-1 sm:p-2 xl:p-2.5 flex flex-col xl:flex-row items-center justify-center xl:justify-start gap-1 xl:gap-2.5 border border-indigo-500/10 relative overflow-hidden group-hover:border-indigo-500/30"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-indigo-500/50 hidden sm:block" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-indigo-500/50 hidden sm:block" />

                    <div
                      className={cn(
                        "w-5 h-5 sm:w-7 sm:h-7 xl:w-8 xl:h-8 rounded flex items-center justify-center shrink-0 border",
                        tone.bg,
                        tone.border,
                        tone.text,
                      )}
                    >
                      <StatIcon size={12} />
                    </div>

                    <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
                      <span className="text-[7px] sm:text-[10px] text-gray-500 font-bold uppercase mb-0 sm:mb-0.5 whitespace-nowrap">
                        {stat.label}
                      </span>
                      <span className={cn("text-[10px] sm:text-sm font-black leading-none", tone.text)}>
                        {stat.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : null}

            <div className="w-full mt-auto relative">
              <div
                className={cn(
                  "relative w-full p-[1.5px] transition-all duration-300 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]",
                  t.buttonEdge,
                )}
              >
                <div
                  className={cn(
                    "relative w-full transition-colors duration-300 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 [clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)]",
                    t.buttonFace,
                  )}
                >
                  <Eye size={12} />
                  <span className="text-white font-black text-[10px] sm:text-xs uppercase tracking-widest">
                    XEM NGAY
                  </span>
                  <ChevronRight size={12} />
                </div>
              </div>
            </div>
          </Link>
          );
        })}
      </div>
    </section>
  );
}
