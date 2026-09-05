"use client";

import { ChevronDown } from "lucide-react";

/**
 * The cue at the foot of the hero: there is more below, here is where it
 * starts.
 *
 * A real anchor, so it works without JavaScript, is focusable, and offers the
 * usual link affordances. The click handler only upgrades the jump to a glide;
 * `scrollIntoView` is used rather than `scroll-behavior: smooth` on the root,
 * which would have changed every anchor and every router jump on the site to
 * get one button moving nicely.
 *
 * Nothing happens if the target is missing — a section the admin has switched
 * off leaves the browser to do what it does with an anchor to nowhere.
 */
/**
 * How the pill is placed. Defaulted to the hero's corner so the home page
 * keeps calling this with two props; a caller that puts the cue in normal
 * flow — the software detail page, under the buy panel — passes its own.
 */
const HERO_PLACEMENT = "absolute bottom-5 left-1/2 -translate-x-1/2";

/**
 * Fired on window after the cue has sent the page to its target, with the
 * target's id as detail, so the block that was reached can react.
 */
export const EXPLORE_EVENT = "menzu:explore";

/** How long a smooth scroll is given before the target is told anyway. */
const SCROLL_AT_MOST_MS = 900;

export function ScrollCta({
  targetId,
  label,
  placement = HERO_PLACEMENT,
  animated = false,
}: {
  targetId: string;
  label: string;
  placement?: string;
  /** Brighten the pill and bounce it in step with the arrow. The home hero
   *  wants that extra pull; the software page keeps the quiet default. */
  animated?: boolean;
}) {
  const tone = animated
    ? "border-white/20 text-neutral-200 hover:border-white/40 hover:text-white"
    : // The tool page: the accent border the cards and buy panel wear, so the
      // pill belongs to the same row of controls; same size as before.
      "border-[var(--menzu-accent)]/40 text-neutral-300 hover:border-[var(--menzu-accent)] hover:text-white";

  return (
    // Placement on the wrapper, motion on the link inside it: the hero's
    // placement centres the pill with -translate-x-1/2, and a bounce transform
    // on the same element would overwrite that and shove it off-centre.
    <div className={placement}>
      <a
        href={`#${targetId}`}
        onClick={(event) => {
          const target = document.getElementById(targetId);
          if (!target) return;
          event.preventDefault();
          // Honoured explicitly: "smooth" ignores the reader's motion setting.
          const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          // Whoever owns the target may open up on arrival — the game list
          // unfolds past its first line (RowSearch listens for this). Told
          // only once the glide has ended, so the unfolding plays in view
          // instead of while the page is still on its way there; a jump, or
          // a target already in place, is told at once.
          const announce = () =>
            window.dispatchEvent(new CustomEvent(EXPLORE_EVENT, { detail: targetId }));
          const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
          const inPlace = Math.abs(target.getBoundingClientRect().top - margin) < 4;
          target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
          if (still || inPlace) {
            announce();
            return;
          }
          // `scrollend` where the browser has it; a timer covers the rest and
          // a glide that never reports its end.
          let told = false;
          const arrive = () => {
            if (told) return;
            told = true;
            window.removeEventListener("scrollend", arrive);
            window.clearTimeout(latest);
            announce();
          };
          const latest = window.setTimeout(arrive, SCROLL_AT_MOST_MS);
          window.addEventListener("scrollend", arrive);
        }}
        className={`${animated ? "animate-bounce-subtle " : ""}${tone} inline-flex items-center gap-2 whitespace-nowrap rounded-full border bg-[#0d0d12]/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur-md transition-colors`}
      >
        {label}
        {/* The hero keeps its bouncing arrow, the pull it exists for. The quiet
            pill on a tool page gets a still chevron in the accent instead: an
            arrow nodding on its own next to a row of calm buttons read as a
            glitch rather than an invitation. */}
        <ChevronDown
          size={15}
          aria-hidden
          className={`${animated ? "animate-bounce-subtle " : ""}shrink-0 text-[var(--menzu-accent)]`}
        />
      </a>
    </div>
  );
}
