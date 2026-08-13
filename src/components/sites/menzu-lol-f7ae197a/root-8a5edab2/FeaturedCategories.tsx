import type { CSSProperties } from "react";
import Image from "next/image";

import { SCROLL_TARGET_ID } from "./HeroBanners";

export interface CategoryCard {
  href: string;
  line1: string;
  line2: string;
  art: string;
}

const ART_BASE = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload";
const BACKCARD_SRC =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/images/backcard.webp";

/**
 * The row as captured: a promotional strip rather than catalogue data. Two of
 * the four tiles point at features rather than categories, and Check Skin /
 * Build Kho Đồ were excluded from this clone, so those keep "#" instead of
 * linking to pages that 404.
 *
 * Shown when no categories are pinned in Cấu hình → Cấu hình trang chủ, which
 * is every shop that has not opened that screen.
 */
const CAPTURED_CARDS: CategoryCard[] = [
  {
    line1: "ACC TỰ CHỌN",
    line2: "VALORANT",
    art: `${ART_BASE}/clove.webp`,
    href: "/category/account-valorant-tu-chon",
  },
  { line1: "CHECK SKIN KHO ĐỒ", line2: "VALORANT", art: `${ART_BASE}/omen.webp`, href: "#" },
  { line1: "BUILD KHO ĐỒ", line2: "VIP", art: `${ART_BASE}/jett.webp`, href: "#" },
  { line1: "DỊCH VỤ", line2: "VALORANT", art: `${ART_BASE}/neon.webp`, href: "/services" },
];

const CARD_THEME = {
  "--theme-hover": "#6366f1",
  "--theme-border": "#4748af",
} as CSSProperties;

export function FeaturedCategories({ cards }: { cards?: CategoryCard[] }) {
  const tiles = cards && cards.length > 0 ? cards : CAPTURED_CARDS;

  return (
    // scroll-mt clears the fixed header, so arriving from the hero's cue puts
    // the heading below it rather than behind it.
    <section id={SCROLL_TARGET_ID} className="w-full mb-12 scroll-mt-[120px]">
      <div className="flex flex-col items-center justify-center mb-10 text-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider md:tracking-widest text-white whitespace-nowrap px-2">
          SẢN PHẨM NỔI BẬT
        </h2>
        <div className="flex items-center justify-center gap-2 mt-3 opacity-60">
          <div className="w-16 h-px bg-gradient-to-l from-indigo-500 to-transparent" />
          <div className="w-2 h-2 rotate-45 border border-indigo-400 bg-indigo-500/50" />
          <div className="w-16 h-px bg-gradient-to-r from-indigo-500 to-transparent" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {tiles.map((card) => (
          <a
            key={card.href + card.line2}
            href={card.href}
            className="group relative w-full pt-16 flex flex-col items-center"
          >
            <div
              className="relative w-full aspect-[3/4] flex flex-col items-center justify-end p-2 pb-2 sm:p-4 transition-all duration-300"
              style={CARD_THEME}
            >
              {/* [1] Octagon border layer */}
              <div className="absolute inset-0 bg-[var(--theme-border)] group-hover:bg-[var(--theme-hover)] transition-colors duration-500 [clip-path:polygon(16px_0,calc(100%-16px)_0,100%_16px,100%_calc(100%-16px),calc(100%-16px)_100%,16px_100%,0_calc(100%-16px),0_16px)]" />

              {/* [2] Octagon inner fill */}
              <div className="absolute inset-[1.5px] overflow-hidden [clip-path:polygon(15px_0,calc(100%-15px)_0,100%_15px,100%_calc(100%-15px),calc(100%-15px)_100%,15px_100%,0_calc(100%-15px),0_15px)] bg-[#0d0d12]">
                <Image
                  src={BACKCARD_SRC}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* [3] Agent artwork layer */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-[130%] pointer-events-none z-20 group-hover:scale-105 transition-transform duration-500 origin-bottom flex items-end justify-center">
                <div className="relative w-full h-full sm:hidden block">
                  <Image
                    src={card.art}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-contain object-bottom"
                  />
                </div>
                <div className="relative w-full h-full hidden sm:block">
                  <Image
                    src={card.art}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-contain object-bottom"
                  />
                </div>
              </div>

              {/* [4] Text block */}
              <div className="relative z-30 flex flex-col items-center w-full text-center mt-auto pb-0 sm:pb-1">
                <div className="mb-3 sm:mb-4 flex flex-col items-center w-full font-[family-name:var(--font-headingnow)]">
                  <span className="text-[18px] sm:text-[22px] lg:text-[28px] font-black uppercase tracking-normal leading-none mb-1 whitespace-nowrap">
                    {card.line1}
                  </span>
                  <span className="text-[36px] sm:text-[48px] lg:text-[64px] font-black uppercase tracking-normal leading-[0.9]">
                    {card.line2}
                  </span>
                </div>

                <div className="relative w-fit min-w-[100px] sm:min-w-[140px] mb-0 sm:mb-2 cursor-pointer mt-1 sm:mt-2">
                  <div className="relative w-full p-[2px] transition-all duration-300 group-hover:scale-[1.05] group-hover:drop-shadow-[0_0_15px_var(--theme-hover)] [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)] bg-[var(--theme-border)]">
                    <div className="relative w-full h-full bg-transparent group-hover:bg-white transition-colors duration-300 flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 [clip-path:polygon(11px_0,100%_0,100%_calc(100%-11px),calc(100%-11px)_100%,0_100%,0_11px)]">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white group-hover:text-[#0d0d12] transition-colors duration-300 whitespace-nowrap">
                        XEM CHI TIẾT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
