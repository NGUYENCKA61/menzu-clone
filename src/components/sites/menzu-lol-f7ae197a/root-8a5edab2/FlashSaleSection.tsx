"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { FLASH_SALE_BACKGROUND_IMAGE, FLASH_SALE_ITEMS } from "./flashSaleData";
import { FlashSaleCard } from "./FlashSaleCard";

// Verbatim section-scoped CSS from the live site's <style> block.
const FLASH_SALE_STYLES = `
.fs-realism-container {
  border-radius: 24px;
  color: #fff;
  background: radial-gradient(ellipse 60% 60% at 80% -50%, #3a3a3a, #0f1111);
  border: 5px solid #2a2a2a;
  margin-bottom: 3rem;
  position: relative;
  overflow: hidden;
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeUntilNextMidnight(): CountdownParts {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function padTwoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

export function FlashSaleSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(getTimeUntilNextMidnight());
    const timeoutId = setTimeout(tick, 0);
    const intervalId = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  const handlePrev = () => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: -track.clientWidth, behavior: "smooth" });
  };

  const handleNext = () => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: track.clientWidth, behavior: "smooth" });
  };

  const hoursLabel = countdown ? padTwoDigits(countdown.hours) : "--";
  const minutesLabel = countdown ? padTwoDigits(countdown.minutes) : "--";
  const secondsLabel = countdown ? padTwoDigits(countdown.seconds) : "--";

  return (
    <>
      <div className="mb-12 lg:mb-16">
        <style dangerouslySetInnerHTML={{ __html: FLASH_SALE_STYLES }} />
        <div className="fs-realism-container p-4 sm:p-6 sm:py-8">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
            <Image
              src={FLASH_SALE_BACKGROUND_IMAGE}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>

          <div className="relative z-20">
            <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-start">
                <div className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-500 text-white shrink-0">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h2 className="text-lg min-[360px]:text-xl sm:text-2xl md:text-3xl font-black text-white uppercase drop-shadow-md text-center whitespace-nowrap">
                  FLASHSALE HÔM NAY
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 w-full lg:w-auto justify-center">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 whitespace-nowrap">
                  Kết thúc trong
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex items-baseline gap-0.5 px-2 py-1 rounded-lg bg-neutral-900/80 border border-white/10 font-black text-sm sm:text-base text-white tabular-nums">
                    {hoursLabel}
                    <span className="text-[9px] font-bold text-neutral-500">h</span>
                  </div>
                  <span className="font-black text-neutral-600">.</span>
                  <div className="flex items-baseline gap-0.5 px-2 py-1 rounded-lg bg-neutral-900/80 border border-white/10 font-black text-sm sm:text-base text-white tabular-nums">
                    {minutesLabel}
                    <span className="text-[9px] font-bold text-neutral-500">m</span>
                  </div>
                  <span className="font-black text-neutral-600">.</span>
                  <div className="flex items-baseline gap-0.5 px-2 py-1 rounded-lg bg-neutral-900/80 border border-white/10 font-black text-sm sm:text-base text-white tabular-nums">
                    {secondsLabel}
                    <span className="text-[9px] font-bold text-neutral-500">s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group/flashsale">
              <button
                type="button"
                aria-label="Trước"
                onClick={handlePrev}
                className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-11 h-11 bg-neutral-800 text-indigo-400 border-2 border-neutral-700 rounded-full items-center justify-center z-20 hover:bg-neutral-700 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              <div
                ref={trackRef}
                className="flex overflow-x-auto gap-4 sm:gap-6 pb-2 hide-scrollbar relative z-10 -mx-4 sm:mx-0 px-4 sm:px-0 scroll-px-4 sm:scroll-px-0 snap-x snap-mandatory cursor-grab"
              >
                {FLASH_SALE_ITEMS.map((item) => (
                  <FlashSaleCard key={item.code} item={item} />
                ))}
              </div>

              <button
                type="button"
                aria-label="Sau"
                onClick={handleNext}
                className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-11 h-11 bg-neutral-800 text-indigo-400 border-2 border-neutral-700 rounded-full items-center justify-center z-20 hover:bg-neutral-700 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
