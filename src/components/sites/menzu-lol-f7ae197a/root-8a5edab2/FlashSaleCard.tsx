import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getAccountImagePath, type FlashSaleItem } from "./flashSaleData";

export interface FlashSaleCardProps {
  item: FlashSaleItem;
}

export function FlashSaleCard({ item }: FlashSaleCardProps) {
  return (
    <div className="w-[calc(50%-6px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] shrink-0 snap-start">
      <Link
        href={`/account/${item.code}`}
        className="group relative w-full h-full flex flex-col bg-neutral-900 border rounded-[14px] p-2 transition-[border-color,background-color] duration-200 shadow-md border-neutral-800 hover:border-neutral-700"
      >
        {item.discount !== null && (
          <div className="absolute top-2 left-2 w-[44px] h-[44px] sm:w-[64px] sm:h-[64px] z-30 pointer-events-none">
            <svg viewBox="0 0 64 64" className="w-full h-full">
              <polygon points="0,0 64,0 0,64" fill="#B91C1C" />
              <polygon points="0,64 12,52 0,52" fill="#7F1D1D" />
            </svg>
            <span className="absolute w-[56px] sm:w-[80px] text-center text-[#FFE5A0] font-black text-[9px] sm:text-[12px] drop-shadow-md top-[6px] -left-[10px] sm:top-[11px] sm:-left-[15px] -rotate-45">
              {item.discount}
            </span>
          </div>
        )}

        <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-900 rounded-[10px]">
          <Image
            src={item.imageUrl ?? getAccountImagePath(item.code)}
            alt={`Tài khoản #${item.code}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="absolute inset-0 w-full h-full object-cover object-[85%_center] md:group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <span className="absolute bottom-0 left-0 bg-neutral-900 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-tr-lg">
            #{item.code}
          </span>
        </div>

        <div className="mt-auto pt-2.5 flex flex-col gap-2">
          {/* The listing card's labelled strip, compacted for this tile:
              glyphs and numbers in the section's indigo, RANK white,
              entries split by pipes. Hidden per entry when unset. */}
          {item.rank ? (
            <div className="flex w-full items-center justify-between gap-1 overflow-hidden rounded-lg border border-[#292a30] bg-[#111216] px-2 py-1 uppercase">
              <span className="flex min-w-0 items-center gap-1 whitespace-nowrap text-[8px] sm:text-[10px] font-extrabold text-[#c7c8cd]">
                <span aria-hidden className="text-indigo-400">▲</span> Rank:
                <span className="truncate text-white">{item.rank}</span>
              </span>
              {(item.vip ?? 0) > 0 ? (
                <>
                  <span aria-hidden className="text-[8px] sm:text-[10px] text-[#3a3b42]">|</span>
                  <span className="flex items-center gap-1 whitespace-nowrap text-[8px] sm:text-[10px] font-extrabold text-[#c7c8cd]">
                    <span aria-hidden className="text-indigo-400">◆</span> VIP:
                    <span className="text-indigo-400">{item.vip}</span>
                  </span>
                </>
              ) : null}
              {(item.vipIngame ?? 0) > 0 ? (
                <>
                  <span aria-hidden className="text-[8px] sm:text-[10px] text-[#3a3b42]">|</span>
                  <span className="hidden min-[400px]:flex items-center gap-1 whitespace-nowrap text-[8px] sm:text-[10px] font-extrabold text-[#c7c8cd]">
                    <span aria-hidden className="text-indigo-400">◇</span> VIP Ingame:
                    <span className="text-indigo-400">{item.vipIngame}</span>
                  </span>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="relative w-full bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-500/30 text-[#FFE5A0] rounded-lg flex items-center px-1 sm:px-2 hover:from-indigo-600 hover:to-indigo-700 transition-colors duration-150 group h-[38px] sm:h-[44px]">
            <span className="absolute left-2 sm:left-3 shrink-0 hidden sm:flex items-center justify-center">
              <ShoppingCart size={16} />
            </span>
            <span className="flex-1 flex flex-col items-center justify-center sm:pl-4 w-full">
              {item.oldPrice !== null && (
                <span className="text-[8px] sm:text-[10px] text-[#FFE5A0]/70 line-through font-semibold leading-none mb-0.5 truncate max-w-full">
                  {item.oldPrice}
                </span>
              )}
              <span className="text-[10px] min-[360px]:text-[11px] sm:text-[15px] font-black leading-none tracking-tighter sm:tracking-tight drop-shadow-md truncate max-w-full">
                {item.newPrice}
              </span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
