import { Check, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DEFAULT_SETTINGS } from "@/lib/settings";
import { ScrollCta } from "./ScrollCta";

/**
 * Where the hero's scroll cue lands, and the id the categories section wears.
 * Shared so the two cannot drift apart into a link that scrolls nowhere.
 */
export const SCROLL_TARGET_ID = "danh-muc-san-pham";

/** #b9a0ff. Written out rather than made a token: it is spent here and
 *  nowhere else, and a variable used once hides where the colour lives. */
const USP_PURPLE = "text-[#b9a0ff]";

const CTA =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.14em] transition-colors";

interface HeroBannersProps {
  /** The still artwork, and the poster frame when a video is set. */
  banner?: string;
  /** Plays in place of the still when set. */
  video?: string;
  badge?: string;
  /** Newlines are line breaks — the heading is written to sit on two rows. */
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  usps?: string[];
}

/**
 * The top of the storefront: what the shop sells, said in words, beside the
 * artwork.
 *
 * It used to be the artwork alone — a wide banner and four promo tiles, no
 * sentence anywhere saying what this place is. Every word here now comes from
 * Cấu hình → Cấu hình trang chủ, and each prop falls back to what the section
 * shipped with, so a shop that never opens that screen sees what it always saw.
 *
 * The four claims carry a light purple of their own rather than the shop's
 * red: red on this page means "press me", and four reassurances that look
 * like four buttons send the eye to the wrong place.
 */
export function HeroBanners({
  banner = DEFAULT_SETTINGS.heroBanner,
  video = DEFAULT_SETTINGS.heroVideo,
  badge = DEFAULT_SETTINGS.heroBadge,
  title = DEFAULT_SETTINGS.heroTitle,
  subtitle = DEFAULT_SETTINGS.heroSubtitle,
  primaryLabel = DEFAULT_SETTINGS.heroPrimaryLabel,
  primaryHref = DEFAULT_SETTINGS.heroPrimaryHref,
  secondaryLabel = DEFAULT_SETTINGS.heroSecondaryLabel,
  secondaryHref = DEFAULT_SETTINGS.heroSecondaryHref,
  usps = DEFAULT_SETTINGS.heroUsps,
}: HeroBannersProps) {
  const lines = title.split("\n").filter((line) => line.trim());

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
          behind the copy. Decoration only — aria-hidden, no pointer target. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="hero-starfield" />
      </div>

      {/* Stacked on phones; on desktop the copy and the artwork are pushed to
          the container's two edges with a wide empty gap between them, the way
          the reference spaces its hero. Each side is capped and allowed to
          shrink (flex-1 + max-w + min-w-0), so the gap only opens once both
          have room for their full width, and they close up on a narrow laptop
          instead of overflowing. z-10 lifts them clear of the sky layer. */}
      <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex w-full flex-col items-start lg:w-auto lg:min-w-0 lg:max-w-[440px] lg:flex-1 lg:-translate-y-8">
          {badge ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/[0.08] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--menzu-accent)]">
              <Sparkles size={12} className={`shrink-0 ${USP_PURPLE}`} />
              {badge}
            </span>
          ) : null}

          {/* The page had no h1 at all while the hero was pure imagery. */}
          <h1
            className={`text-[28px] font-black uppercase leading-[1.06] tracking-tight text-white sm:text-[36px] lg:text-[46px] ${
              badge ? "mt-6" : ""
            }`}
          >
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
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

          {usps.length > 0 ? (
            <ul className="mt-7 grid w-full max-w-[460px] grid-cols-1 gap-3 sm:grid-cols-2">
              {usps.map((usp) => (
                <li
                  key={usp}
                  className={`flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[11px] font-bold ${USP_PURPLE}`}
                >
                  <Check size={13} className="shrink-0" />
                  {usp}
                </li>
              ))}
            </ul>
          ) : null}
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

      <ScrollCta targetId={SCROLL_TARGET_ID} label="Khám phá sản phẩm" />
    </section>
  );
}
