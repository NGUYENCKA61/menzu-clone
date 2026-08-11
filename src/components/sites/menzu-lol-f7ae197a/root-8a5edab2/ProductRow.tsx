import Image from "next/image";
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

export interface ProductRowProps {
  heading: string;
  cards: ProductCard[];
  className?: string;
}

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

export function ProductRow({ heading, cards, className }: ProductRowProps) {
  return (
    <section className={cn("w-full", className)}>
      <div className="flex flex-row items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-5 bg-[#7C3AED] rounded-full shrink-0" />
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            {heading}
          </h2>
        </div>
        <a
          href="#"
          className="group flex items-center gap-1 text-[10px] sm:text-xs font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest border-b border-neutral-700 hover:border-[#7C3AED]"
        >
          <span className="hidden sm:inline">XEM TẤT CẢ</span>
          <span className="sm:hidden">XEM THÊM</span>
          <ArrowRight size={14} />
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => (
          <a
            key={card.image}
            href="#"
            className="group flex flex-col bg-[#12141c] rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 p-3 sm:p-4"
          >
            <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-4 border border-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
              <Image
                src={card.image}
                alt={card.title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            <h3 className="text-center text-sm sm:text-base font-black uppercase text-white mb-4 group-hover:text-indigo-400 transition-colors tracking-widest drop-shadow-md">
              {card.title}
            </h3>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 mb-3 sm:mb-4">
              {card.stats.map((stat) => {
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

            <div className="w-full mt-auto relative">
              <div className="relative w-full p-[1.5px] transition-all duration-300 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] bg-indigo-500/50 group-hover:bg-indigo-500">
                <div className="relative w-full bg-[#12141c] group-hover:bg-indigo-500 transition-colors duration-300 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 [clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)]">
                  <Eye size={12} />
                  <span className="text-white font-black text-[10px] sm:text-xs uppercase tracking-widest">
                    XEM NGAY
                  </span>
                  <ChevronRight size={12} />
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
