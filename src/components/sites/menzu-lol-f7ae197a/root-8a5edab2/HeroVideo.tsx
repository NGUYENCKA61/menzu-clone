"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const LESS_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * The hero's clip, over its still.
 *
 * The still is drawn first, by the server, and stays; the clip is loaded
 * only once the page is running and only for readers who have not asked
 * for less motion, and fades in over the still when its first frame is
 * ready. Before this the frame was a bare autoplaying <video> for
 * everyone: a 4.8MB loop for readers who had switched motion off, and a
 * poster that was the shop's banner - a different picture from the clip's
 * first frame - replaced by it at an unpredictable moment. The still is
 * now the floor: under reduced motion nothing else ever loads (preload
 * "none", no autoplay attribute), and for everyone else the swap is a
 * half-second crossfade rather than a cut.
 *
 * The preference is watched, not read once: switching it off mid-visit
 * pauses the clip and lets the still back through.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = window.matchMedia(LESS_MOTION);
    const apply = () => {
      if (media.matches) {
        node.pause();
        setLive(false);
      } else {
        // A muted, inline clip is allowed to start itself; a browser that
        // still refuses simply leaves the still up.
        node.play().catch(() => {});
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <>
      <Image
        src={poster}
        // Decorative: the heading beside it already says what the shop is.
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 620px"
        className="select-none object-cover"
        priority
      />
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="none"
        onPlaying={() => setLive(true)}
        aria-hidden
        className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-500 motion-reduce:transition-none ${
          live ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
