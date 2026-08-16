import Image from "next/image";
import Link from "next/link";

import { DEFAULT_SETTINGS } from "@/lib/settings";
import { ScrollCta } from "./ScrollCta";

/**
 * Where the hero's scroll cue lands, and the id the categories section wears.
 * Shared so the two cannot drift apart into a link that scrolls nowhere.
 */
export const SCROLL_TARGET_ID = "danh-muc-san-pham";

const CTA =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.14em] transition-colors";

/** Seconds between characters as the heading types itself in. */
const TYPE_STEP = 0.07;

/** Seconds the heading waits before typing, so the "We are" line fades up first. */
const HEADING_DELAY = 0.5;

interface HeroBannersProps {
  /** The still artwork, and the poster frame when a video is set. */
  banner?: string;
  /** Plays in place of the still when set. */
  video?: string;
  /** Newlines are line breaks — the heading is written to sit on two rows. */
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Draw the shooting-star streaks. Off hides them; the starfield stays. */
  shootingStars?: boolean;
}

/**
 * The top of the storefront: what the shop sells, said in words, beside the
 * artwork.
 *
 * It used to be the artwork alone — a wide banner and four promo tiles, no
 * sentence anywhere saying what this place is. Every word here now comes from
 * Cấu hình → Cấu hình trang chủ, and each prop falls back to what the section
 * shipped with, so a shop that never opens that screen sees what it always saw.
 */
export function HeroBanners({
  banner = DEFAULT_SETTINGS.heroBanner,
  video = DEFAULT_SETTINGS.heroVideo,
  title = DEFAULT_SETTINGS.heroTitle,
  subtitle = DEFAULT_SETTINGS.heroSubtitle,
  primaryLabel = DEFAULT_SETTINGS.heroPrimaryLabel,
  primaryHref = DEFAULT_SETTINGS.heroPrimaryHref,
  secondaryLabel = DEFAULT_SETTINGS.heroSecondaryLabel,
  secondaryHref = DEFAULT_SETTINGS.heroSecondaryHref,
  shootingStars = true,
}: HeroBannersProps) {
  const lines = title.split("\n").filter((line) => line.trim());
  const totalChars = lines.reduce((sum, line) => sum + Array.from(line).length, 0);
  // Runs across every line so the stagger does not restart on the second row.
  let charCursor = 0;

  return (
    // No card around this. The hero sits on the page's own dark ground, which
    // also puts its heading on the same left edge as every row below it —
    // a card's inner padding would have indented it away from them.
    //
    // A screen tall, less what stands above it: the 104px header spacer and
    // the page container's own top padding, 24px and 40px at lg. That lands
    // the section's bottom edge on the fold, which is what puts the scroll cue
    // at the bottom of the screen rather than somewhere below it. svh, not vh,
    // because vh on a phone measures the screen without the browser's own bars
    // and pushes the cue out of sight. pb-20 is the cue's own room, so it
    // never sits over the copy or the artwork.
    // isolate so the -z background layer stacks against this section, not the
    // page; overflow-hidden keeps the shooting stars and the wide glows from
    // spilling past the fold.
    <section className="relative isolate flex w-full flex-col justify-center overflow-hidden min-h-[calc(100svh-128px)] pt-6 pb-20 sm:pt-10 lg:min-h-[calc(100svh-144px)] lg:pt-14">
      {/* A field of faint, slowly twinkling stars over the page's own black,
          plus three shooting stars on long offset timers so one crosses now
          and then rather than all at once. Decoration only — aria-hidden, no
          pointer target. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="hero-starfield" />
        {shootingStars ? (
          <>
            <span className="hero-shooting" style={{ top: "8%", left: "58%", animationDelay: "0s", animationDuration: "7s" }} />
            <span className="hero-shooting" style={{ top: "2%", left: "82%", animationDelay: "3.5s", animationDuration: "8.5s" }} />
            <span className="hero-shooting" style={{ top: "22%", left: "44%", animationDelay: "6s", animationDuration: "9.5s" }} />
          </>
        ) : null}
      </div>

      {/* Stacked on phones; on desktop the copy and the artwork are pushed to
          the container's two edges with a wide empty gap between them, the way
          the reference spaces its hero. Each side is capped and allowed to
          shrink (flex-1 + max-w + min-w-0), so the gap only opens once both
          have room for their full width, and they close up on a narrow laptop
          instead of overflowing. z-10 lifts them clear of the sky layer. */}
      <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex w-full flex-col items-start lg:w-auto lg:min-w-0 lg:max-w-[440px] lg:flex-1 lg:-translate-y-4">
          {/* Eyebrow line: fades up first, then the heading types itself in
              after it (HEADING_DELAY). */}
          <span className="animate-fade-up block text-[13px] font-bold uppercase tracking-[0.3em] text-white sm:text-sm">
            We are
          </span>

          {/* The heading types itself in — each character a span that pops on a
              staggered delay after the eyebrow, then a caret blinks at the end.
              aria-label carries the whole title so a screen reader reads it
              once, not letter by letter. */}
          <h1
            aria-label={title.replace(/\n/g, " ")}
            className="mt-2 text-[28px] font-black uppercase leading-[1.06] tracking-tight text-white sm:text-[36px] lg:text-[46px]"
          >
            {lines.map((line, li) => (
              <span key={li} className="block whitespace-nowrap" aria-hidden>
                {Array.from(line).map((ch, ci) => (
                  <span
                    key={ci}
                    className="typewriter-char"
                    style={{
                      animationDelay: `${(HEADING_DELAY + charCursor++ * TYPE_STEP).toFixed(2)}s`,
                    }}
                  >
                    {ch === " " ? " " : ch}
                  </span>
                ))}
                {li === lines.length - 1 ? (
                  <span
                    className="typewriter-caret"
                    style={{
                      animationDelay: `${(HEADING_DELAY + totalChars * TYPE_STEP).toFixed(2)}s`,
                    }}
                  />
                ) : null}
              </span>
            ))}
          </h1>

          {subtitle ? (
            <p className="mt-5 max-w-[460px] text-[14px] leading-relaxed text-neutral-400">
              {subtitle}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className={`${CTA} bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]`}
            >
              {primaryLabel} →
            </Link>
            {secondaryLabel && secondaryHref ? (
              <Link
                href={secondaryHref}
                className={`${CTA} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`}
              >
                {secondaryLabel} →
              </Link>
            ) : null}
          </div>
        </div>

        {/* The artwork in a wide 16/9 frame, the shape the shop's covers and
            banner already come in, so object-cover crops almost nothing. The
            rounder corners and the ring match the media card in the
            reference. */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0a0a0c] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] lg:w-auto lg:min-w-0 lg:max-w-[650px] lg:flex-1">
          {video ? (
            // Muted and inline, because a hero that makes noise or takes over
            // the screen on a phone is a hero people leave. The still stays as
            // the poster, so the frame is never blank while it loads.
            <video
              src={video}
              poster={banner}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full select-none object-cover"
            />
          ) : (
            <Image
              src={banner}
              alt="banner"
              fill
              sizes="(max-width: 1024px) 100vw, 620px"
              className="select-none object-cover"
              priority
            />
          )}
        </div>
      </div>

      <ScrollCta targetId={SCROLL_TARGET_ID} label="Khám phá sản phẩm" animated />
    </section>
  );
}
