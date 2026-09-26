"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** How long each picture holds before the next one fades in. */
const HOLD_MS = 4000;

/**
 * The hero frame's pictures when Cấu hình → Bố cục trang chủ is set to "Ảnh"
 * and holds more than one: they sit stacked and cross-fade in turn, with a
 * small pill of dots in the corner to jump between them — the way
 * gachatool.com runs its hero artwork.
 *
 * Readers who asked for less motion get the first picture and no timer; the
 * dots still work by hand. Pressing a dot restarts the count, so the picture
 * that was asked for stays its full turn.
 */
export function HeroImageCarousel({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  // Bumped by a dot press so the timer starts over from that picture.
  const [turn, setTurn] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (still || images.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % images.length),
      HOLD_MS,
    );
    return () => window.clearInterval(timer);
  }, [still, images.length, turn]);

  return (
    <>
      {images.map((src, index) => (
        <Image
          key={`${src}-${index}`}
          src={src}
          // Decorative, as the single picture is: the heading beside it says
          // what the shop is.
          alt=""
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 690px"
          className={`select-none object-cover transition-opacity duration-[900ms] ease-out motion-reduce:transition-none ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      <div className="absolute bottom-4 right-5 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2 py-1.5 backdrop-blur-md">
        {images.map((src, index) => (
          <button
            key={`${src}-dot-${index}`}
            type="button"
            aria-label={`Ảnh ${index + 1} trên ${images.length}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => {
              setActive(index);
              setTurn((count) => count + 1);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
              index === active
                ? "w-[18px] bg-[var(--menzu-accent)]"
                : "w-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </>
  );
}
