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
 * When the script takes the cover out of the page at the latest, counted
 * from navigation start. By then the CSS fade in globals.css has long since
 * hidden it; this only removes the spent node.
 */
const MAX_COVER_MS = 2500;

/**
 * Full-screen cover for the initial page load: dark ground, the shop's brand
 * centered, a red ring and ĐANG TẢI… under it.
 *
 * Server-rendered visible, so it is on screen from the first paint — before
 * any JS arrives, which is the whole point of a preloader. Its exit does not
 * depend on the script: a CSS animation on #menzu-preloader (globals.css)
 * fades it out 1.1s after it paints, so a slow phone that is still
 * downloading JavaScript is not left staring at it over a page that has
 * already drawn underneath (the owner's SEO review, 13/10/2026). The script
 * only takes it off sooner, as soon as the document is parsed. Without JS a
 * noscript rule hides it at once, and under reduced motion it never shows.
 *
 * Not on window load: that waits for every image and the hero video, and on
 * a phone it kept the cover up for seconds over a page that was already
 * readable underneath. No longer on the web fonts either: every face is
 * display: swap, and waiting for them also waited for the home page's
 * display face, a below-the-fold file.
 */
export function Preloader({ brand }: { brand: { name: string } }) {
  const [phase, setPhase] = useState<"covering" | "fading" | "gone">(
    hasCompleted ? "gone" : "covering",
  );

  useEffect(() => {
    if (phase === "covering") {
      const begin = () => setPhase("fading");
      if (document.readyState !== "loading") begin();
      else document.addEventListener("DOMContentLoaded", begin);
      const cap = window.setTimeout(begin, Math.max(0, MAX_COVER_MS - performance.now()));
      return () => {
        document.removeEventListener("DOMContentLoaded", begin);
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
      {/* Without JS there is nothing to wait for, so the cover does not
          even sit out its CSS fade: this style applies only when scripting
          is off and hides it at once. */}
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
