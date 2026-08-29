"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { SCOPE_SHELL_CLASS, SEARCH_INPUT_CLASS } from "./filterChrome";

/** How long each weapon holds the HOT PICK chip before the next rolls in. */
const HOT_PICK_INTERVAL_MS = 2600;

export interface ScopeSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /**
   * The gold pill that bobs over the field, as on the original menzu skin
   * search. Passing it also lights the field's pulsing outline — on the live
   * site the two arrive together, the badge calling and the box answering, and
   * a glow with nothing above it is just a box that will not sit still.
   *
   * Only the account panel's field carries one — the software search tried it
   * and the shop took it back off: one banner per screen, or neither is a
   * banner.
   */
  badge?: string;
  /**
   * A breathing outline without the pill, in one of two runs: "accent" is the
   * red→gold pulse the badge always brings, "brand" a purple→red one. The
   * software search wears "brand" — it starts from the colour its own submit
   * button and chips wear, and matching the account field's red→gold would
   * make two panels claim one banner.
   */
  glow?: "accent" | "brand";
  /**
   * The "HOT PICK" chip that sits inside the field, at its right end, rolling
   * through the items the shop is pushing — one at a time, a few seconds each.
   * Clicking it searches for whichever item is showing, so the chip is a
   * shortcut and not just an advertisement.
   *
   * A picture may be null when the item library has none yet — that turn of
   * the chip carries the label alone rather than a gap where a picture goes.
   */
  hotPick?: {
    items: { name: string; imageUrl: string | null }[];
    onPick: (name: string) => void;
  };
}

/**
 * The original menzu search box, rebuilt from its captured markup: a weapon
 * reticle whose dashed ring breathes and whose centre dot blinks, a hairline
 * between it and the text, and a pale band that sweeps the field every few
 * seconds.
 *
 * Only the primary search wears it. On the live site the box beside it —
 * accessories there, features here — is a plain field, and two scanners racing
 * each other along one row is one more than the eye can follow.
 *
 * The band passes *under* the text, as it does on the original: it is a sweep
 * across the surface, not a highlight over what you typed.
 */
export function ScopeSearchField({
  value,
  onChange,
  placeholder,
  badge,
  glow,
  hotPick,
}: ScopeSearchFieldProps) {
  // The chip's rotation: one index over however many items came in. The
  // interval runs only when there is a second item to turn to, and rests while
  // the pointer is on the chip — a target that slips away mid-click punishes
  // the tap it exists to invite. Readers who asked the OS for less motion get
  // the first item, held still.
  const pickCount = hotPick?.items.length ?? 0;
  const [pickIndex, setPickIndex] = useState(0);
  const [pickPaused, setPickPaused] = useState(false);

  useEffect(() => {
    if (pickCount < 2 || pickPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setPickIndex((index) => (index + 1) % pickCount),
      HOT_PICK_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [pickCount, pickPaused]);

  const pick =
    hotPick && hotPick.items.length > 0
      ? hotPick.items[pickIndex % hotPick.items.length]
      : undefined;

  return (
    <div className="relative">
      {badge ? (
        // Floats clear of the field at -3.2rem, exactly as the original sets
        // it. It is decoration and takes no space, so the panel that asks for
        // a badge is the one that has to leave room above itself.
        <div
          aria-hidden
          className="vip-badge-float pointer-events-none absolute inset-x-0 -top-[3.2rem] z-30 flex select-none justify-center"
        >
          {/* A soft ellipse of gold behind the pill, so it reads as lit rather
              than pasted on. */}
          <span className="absolute left-1/2 top-1/2 h-10 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(252,186,3,0.12)_0%,transparent_70%)] blur-lg" />
          {/* The border is the gradient; the pill inside is what covers all
              but 1.5px of it. */}
          <span className="badge-border-flow relative shrink-0 rounded-full p-[1.5px]">
            <span className="relative flex items-center justify-center gap-0.5 overflow-hidden rounded-full bg-[linear-gradient(135deg,#18130d_0%,#252015_55%,#18130d_100%)] px-[22px] py-1.5">
              <span className="vip-shimmer-bar pointer-events-none absolute inset-y-0 w-[60px] bg-[linear-gradient(90deg,transparent,rgba(252,186,3,0.07),transparent)]" />
              <span className="vip-text-glow whitespace-nowrap text-[10px] font-black uppercase tracking-[0.16em] text-[#fcba03]">
                {badge}
              </span>
            </span>
          </span>
        </div>
      ) : null}

      <div
        className={`${SCOPE_SHELL_CLASS} relative overflow-hidden ${
          badge || glow === "accent"
            ? "search-glow"
            : glow === "brand"
              ? "search-glow-brand"
              : ""
        }`}
      >
        {/* Four corner brackets round a dashed ring and a centre dot — a scope,
            not a magnifying glass. Decorative: the placeholder already says what
            the field is for. */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          aria-hidden
          className="shrink-0"
        >
          <circle
            className="val-cross-ring"
            cx="11"
            cy="11"
            r="8"
            stroke="rgba(239,68,68,0.35)"
            strokeWidth="0.8"
            strokeDasharray="3.5 2.5"
          />
          <path
            d="M5 9V5h4"
            stroke="#ef4444"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
          <path
            d="M13 5h4v4"
            stroke="#ef4444"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
          <path
            d="M17 13v4h-4"
            stroke="#ef4444"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
          <path
            d="M9 17H5v-4"
            stroke="#ef4444"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
          <circle className="val-dot-blink" cx="11" cy="11" r="1.5" fill="#ef4444" />
        </svg>

        {/* The original pins this hairline at left:38px. Here it is simply the
            next item in the row, so it cannot drift out of place when the shell's
            padding or the icon's size changes. */}
        <span
          aria-hidden
          className="h-4 w-px shrink-0 bg-gradient-to-b from-transparent via-[rgba(255,49,88,0.4)] to-transparent"
        />

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${SEARCH_INPUT_CLASS} relative z-10 min-w-0`}
        />

        {hotPick && pick ? (
          // After the input, which is the flex row's only growing item — so
          // the chip is pushed to the far end of the field and needs no
          // alignment rule of its own.
          //
          // A button, not a label: the shop's picks are only worth showing if
          // one tap searches for the one on display. type="button" because
          // this sits inside the panel's form, where the default would submit
          // it.
          <button
            type="button"
            onClick={() => hotPick.onPick(pick.name)}
            onMouseEnter={() => setPickPaused(true)}
            onMouseLeave={() => setPickPaused(false)}
            title={pick.name}
            className="relative z-10 flex h-7 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-[#fcba03]/45 bg-[linear-gradient(135deg,#18130d_0%,#252015_55%,#18130d_100%)] pl-1 pr-2.5 transition-colors hover:border-[#fcba03]/70"
          >
            {/* Keyed by turn: each rotation step remounts this span, and the
                mount runs the roll-in once. The label below sits outside it
                and holds still — only the weapon changes. */}
            <span key={pickIndex} className="hotpick-swap flex items-center">
              {pick.imageUrl ? (
                <Image
                  src={pick.imageUrl}
                  alt=""
                  width={48}
                  height={22}
                  className="h-[22px] w-12 shrink-0 object-contain"
                />
              ) : null}
            </span>
            <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.14em] text-[#fcba03]">
              Hot pick
            </span>
          </button>
        ) : null}

        {/* Hidden below sm, as on the original: an 18% band crossing a field that
            narrow is a flicker rather than a sweep. */}
        <span
          aria-hidden
          className="val-scan-line pointer-events-none absolute inset-y-0 z-[3] hidden w-[18%] bg-[linear-gradient(90deg,transparent_0%,rgba(239,68,68,0.12)_30%,rgba(255,255,255,0.18)_50%,rgba(239,68,68,0.12)_70%,transparent_100%)] sm:block"
        />
      </div>
    </div>
  );
}
