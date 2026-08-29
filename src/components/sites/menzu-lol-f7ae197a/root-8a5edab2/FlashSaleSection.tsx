"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { FLASH_SALE_BACKGROUND_IMAGE, FLASH_SALE_ITEMS, type FlashSaleItem } from "./flashSaleData";
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

export function FlashSaleSection({
  items = FLASH_SALE_ITEMS,
  backgroundImage = FLASH_SALE_BACKGROUND_IMAGE,
}: {
  items?: FlashSaleItem[];
  /** Set in Cấu hình → "Ảnh nền khối khuyến mãi"; drawn at 10% opacity. */
  backgroundImage?: string;
} = {}) {
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

  // Dot pagination: the live site renders one dot per scroll STOP, not per page —
  // 20 cards with 4 visible gives 17 dots. Both numbers are breakpoint-dependent,
  // so they are measured from the track rather than hard-coded.
  const [dotCount, setDotCount] = useState(1);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const first = track.firstElementChild as HTMLElement | null;
      if (!first) return;
      const step = first.getBoundingClientRect().width + 24; // card + gap-6
      const visible = Math.max(1, Math.round(track.clientWidth / step));
      setDotCount(Math.max(1, items.length - visible + 1));
      setActiveDot(Math.round(track.scrollLeft / step));
    };

    measure();
    track.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      track.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [items.length]);

  const scrollToDot = (index: number) => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return;
    const step = first.getBoundingClientRect().width + 24;
    track.scrollTo({ left: index * step, behavior: "smooth" });
  };

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

  // The last hour turns the digits — and only the digits — red. The boxes and
  // the unit letters keep their calm face. Client-only, like the countdown
  // itself: the server renders "--" and search engines never see either.
  const urgent = countdown !== null && countdown.hours < 1;
  const clockBoxClass = `flex items-baseline gap-0.5 px-2 py-1 rounded-lg bg-neutral-900/80 border border-white/10 font-black text-sm sm:text-base tabular-nums ${
    urgent ? "text-red-500" : "text-white"
  }`;
  const clockUnitClass = "text-[9px] font-bold text-neutral-500";

  return (
    <>
      <div className="mb-12 lg:mb-16">
        <style dangerouslySetInnerHTML={{ __html: FLASH_SALE_STYLES }} />
        <div className="fs-realism-container p-4 sm:p-6 sm:py-8">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
            <Image
              src={backgroundImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>

          <div className="relative z-20">
            <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-start">
                <div className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[var(--menzu-accent)] text-white shrink-0">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h2 className="text-lg min-[360px]:text-xl sm:text-2xl md:text-3xl font-black text-white uppercase drop-shadow-md text-center whitespace-nowrap">
                  KHUYẾN MÃI HÔM NAY
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 w-full lg:w-auto justify-center">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 whitespace-nowrap">
                  Kết thúc trong
                </span>
                <div className="flex items-center gap-1">
                  <div className={clockBoxClass}>
                    {hoursLabel}
                    <span className={clockUnitClass}>h</span>
                  </div>
                  <span className="font-black text-neutral-600">.</span>
                  <div className={clockBoxClass}>
                    {minutesLabel}
                    <span className={clockUnitClass}>m</span>
                  </div>
                  <span className="font-black text-neutral-600">.</span>
                  <div className={clockBoxClass}>
                    {secondsLabel}
                    <span className={clockUnitClass}>s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group/flashsale">
              <button
                type="button"
                aria-label="Trước"
                onClick={handlePrev}
                className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-11 h-11 bg-neutral-800 text-[var(--menzu-accent)] border-2 border-neutral-700 rounded-full items-center justify-center z-20 hover:bg-neutral-700 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              <div
                ref={trackRef}
                className="flex overflow-x-auto gap-4 sm:gap-6 pb-2 hide-scrollbar relative z-10 -mx-4 sm:mx-0 px-4 sm:px-0 scroll-px-4 sm:scroll-px-0 snap-x snap-mandatory cursor-grab"
              >
                {items.map((item) => (
                  <FlashSaleCard key={item.code} item={item} />
                ))}
              </div>

              <button
                type="button"
                aria-label="Sau"
                onClick={handleNext}
                className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-11 h-11 bg-neutral-800 text-[var(--menzu-accent)] border-2 border-neutral-700 rounded-full items-center justify-center z-20 hover:bg-neutral-700 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex justify-center items-center gap-2 h-8 mt-6 mb-2">
              {Array.from({ length: dotCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Tới nhóm ${i + 1}`}
                  onClick={() => scrollToDot(i)}
                  className={
                    i === activeDot
                      ? "transition-all duration-300 rounded-full w-8 h-2 bg-[var(--menzu-accent)]"
                      : "transition-all duration-300 rounded-full w-2 h-2 bg-neutral-600 hover:bg-neutral-500"
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
