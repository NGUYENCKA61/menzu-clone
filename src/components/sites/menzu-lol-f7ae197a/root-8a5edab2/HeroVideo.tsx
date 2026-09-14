"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const LESS_MOTION = "(prefers-reduced-motion: reduce)";
/** Below this the phone rendition is asked for first. */
const PHONE = "(max-width: 767px)";

/**
 * The phone-sized file that sits beside a hero clip: `<stem>-480.mp4` next
 * to `<stem>.mp4`, written by the encoder in lib/heroVideo.ts. A convention
 * rather than a second setting, so a clip uploaded before the small file
 * existed still works — the browser asks for the small one, is told 404,
 * and falls back to the full clip below.
 */
export function phoneRendition(src: string): string | null {
  return /\.mp4$/i.test(src) && !/-480\.mp4$/i.test(src) ? src.replace(/\.mp4$/i, "-480.mp4") : null;
}

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
 * A phone gets the 480px rendition — the 960px clip was 4.7 MB, 84% of
 * everything the home page sent to a phone, for a frame 356 CSS px wide —
 * and a browser that has asked for less data (Save-Data) gets the still
 * and nothing more.
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
    // The file is chosen here, on the element, once the screen can be
    // measured: the server cannot know the width, and a src in the markup
    // would have every phone start on the 960px clip before it could swap.
    // Save-Data means the still and nothing more.
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (saveData) return;
    const small = window.matchMedia(PHONE).matches ? phoneRendition(src) : null;
    node.src = small ?? src;
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
  }, [src]);

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
        muted
        loop
        playsInline
        preload="none"
        onPlaying={() => setLive(true)}
        // The small file is missing for clips uploaded before it existed:
        // fall back to the full one rather than leave the still forever.
        onError={(event) => {
          const node = event.currentTarget;
          if (/-480\.mp4$/i.test(node.src)) {
            node.src = src;
            node.play().catch(() => {});
          }
        }}
        aria-hidden
        className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-500 motion-reduce:transition-none ${
          live ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
