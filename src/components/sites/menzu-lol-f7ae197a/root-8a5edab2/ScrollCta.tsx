"use client";

import { ArrowDown } from "lucide-react";

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
export function ScrollCta({ targetId, label }: { targetId: string; label: string }) {
  return (
    <a
      href={`#${targetId}`}
      onClick={(event) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        event.preventDefault();
        // Honoured explicitly: "smooth" ignores the reader's motion setting.
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
      }}
      className="absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-[#0d0d12]/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-400 backdrop-blur-md transition-colors hover:border-white/20 hover:text-white"
    >
      {label}
      <ArrowDown
        size={13}
        aria-hidden
        className="animate-bounce-subtle shrink-0 text-[var(--menzu-accent)]"
      />
    </a>
  );
}
