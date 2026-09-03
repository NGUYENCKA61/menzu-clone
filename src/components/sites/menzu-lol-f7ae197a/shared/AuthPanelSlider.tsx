"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * The artwork behind the sign-in card, still or moving.
 *
 * Drops in where the single <Image> was: same fill, same object-cover, same
 * gradient over the top. One picture, or the switch turned off, and it renders
 * exactly what it rendered before — no timer, no extra layers, nothing to go
 * wrong on a page whose only job is to take a password.
 *
 * Each picture enters from the right and the one before it leaves to the left,
 * with the opacity carried across so the change reads as a drift rather than a
 * swap. Both layers stay mounted, so the browser never re-decodes an image it
 * showed a moment ago.
 */
export function AuthPanelSlider({
  images,
  autoPlay,
  seconds,
}: {
  images: string[];
  autoPlay: boolean;
  seconds: number;
}) {
  const slides = images.length > 0 ? images : [""];
  const moving = autoPlay && slides.length > 1;

  const [index, setIndex] = useState(0);
  // Null on the server and until the first advance, which keeps the very first
  // paint identical to the still panel — no slide animates in on arrival.
  const [previous, setPrevious] = useState<number | null>(null);

  useEffect(() => {
    if (!moving) return;

    // Somebody who has asked their system to stop things moving is asking
    // about exactly this: a picture that changes under the form every few
    // seconds while they are typing a password.
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (still?.matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => {
        setPrevious(current);
        return (current + 1) % slides.length;
      });
    }, Math.max(2, seconds) * 1000);

    return () => window.clearInterval(timer);
  }, [moving, seconds, slides.length]);

  return (
    <>
      {slides.map((src, i) => {
        const isCurrent = i === index;
        const isLeaving = i === previous && !isCurrent;
        // Everything else waits off to the right, so whichever comes next
        // enters from that side however far round the list it is.
        const shift = isCurrent ? "translate-x-0" : isLeaving ? "-translate-x-6" : "translate-x-6";

        return (
          <div
            key={`${src}-${i}`}
            aria-hidden={!isCurrent}
            className={`absolute inset-0 transition-all duration-700 ease-out ${shift} ${
              isCurrent ? "opacity-100" : "opacity-0"
            }`}
          >
            {src ? (
              <Image
                src={src}
                alt=""
                fill
                // Never `priority`: that put a preload for the first picture
                // into every login and register response, and on a phone the
                // whole panel is display:none, so the download was paid for a
                // picture nobody saw. Lazy, the browser fetches it only where
                // the panel is on screen, which on a desktop is as soon as
                // layout settles.
                sizes="50vw"
                // Above the site's default 75. This is one large picture
                // filling half the card, held still for seconds at a time and
                // looked straight at — the one place on the site where the
                // usual compression is visible. Must appear in the qualities
                // allowlist in next.config, or Next quietly serves the nearest
                // value that does and the setting looks like it did nothing.
                quality={95}
                className="object-cover object-center"
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}
