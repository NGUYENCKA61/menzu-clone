"use client";

import { useEffect, useState } from "react";

/**
 * Flips when the overlay has started leaving, and never resets while this
 * JS session lives. The root layout survives client-side navigation, so the
 * component rarely remounts — but if it ever does (fast refresh, an error
 * boundary reset), this keeps the loader from flashing over a page that is
 * already up. A real reload gets a fresh module and shows it again, which is
 * right: that is a real load.
 */
let hasCompleted = false;

/**
 * Full-screen cover for the initial page load: dark ground, the shop's brand
 * centered, a red ring and ĐANG TẢI… under it.
 *
 * Server-rendered visible, so it is on screen from the first paint — before
 * any JS arrives, which is the whole point of a preloader. It leaves on the
 * window load event (all images, fonts and chunks in), with a hard cap so a
 * hung third-party resource cannot hold the shop hostage, and a noscript
 * escape so a browser without JS is not left staring at it forever.
 */
export function Preloader({ brand }: { brand: { name: string } }) {
  const [phase, setPhase] = useState<"covering" | "fading" | "gone">(
    hasCompleted ? "gone" : "covering",
  );

  useEffect(() => {
    if (phase === "covering") {
      const begin = () => setPhase("fading");
      if (document.readyState === "complete") {
        begin();
        return;
      }
      window.addEventListener("load", begin);
      // Load can hang on one slow resource; past this point the page is
      // usable enough that hiding it behind a spinner costs more than it hides.
      const cap = window.setTimeout(begin, 6000);
      return () => {
        window.removeEventListener("load", begin);
        window.clearTimeout(cap);
      };
    }
    if (phase === "fading") {
      hasCompleted = true;
      // Matches the transition duration below.
      const exit = window.setTimeout(() => setPhase("gone"), 500);
      return () => window.clearTimeout(exit);
    }
  }, [phase]);

  if (phase === "gone") return null;

  // Two-tone wordmark: first word white, everything after it red, set solid
  // with no spaces — "Thich Thi Hack" comes out THICH|THIHACK, one mark.
  const [word, ...rest] = brand.name.trim().split(/\s+/);
  const tail = rest.join("");

  return (
    <div
      id="menzu-preloader"
      role="status"
      aria-label="Đang tải trang"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-7 bg-[#08090b] transition-opacity duration-500 ease-out motion-reduce:transition-none ${
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Without JS nothing ever calls setPhase, so the cover must remove
          itself: this style applies only when scripting is off. */}
      <noscript>
        <style>{`#menzu-preloader{display:none}`}</style>
      </noscript>

      <span className="text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight">
        <span className="text-white">{word}</span>
        {tail ? <span className="text-[var(--menzu-accent)]">{tail}</span> : null}
      </span>

      {/* Reduced motion keeps the ring but stills it — a static quarter-arc
          still reads as "in progress" without the spin. */}
      <span
        aria-hidden
        className="h-11 w-11 animate-spin rounded-full border-[3px] border-white/10 border-t-[var(--menzu-accent)] motion-reduce:animate-none"
      />

      <span className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-400">
        ĐANG TẢI...
      </span>
    </div>
  );
}
