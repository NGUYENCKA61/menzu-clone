import { Check, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DEFAULT_SETTINGS } from "@/lib/settings";

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
    <section className="w-full py-6 sm:py-10 lg:py-14">
      {/* One column until there is room for two. items-center keeps the
          artwork level with the copy rather than pinned to the top of a
          taller cell. */}
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-start">
          {badge ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/[0.08] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--menzu-accent)]">
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

        {/* The artwork, uncoloured and uncropped by anything but its frame.
            A wide banner in a frame this tall loses its edges to object-cover,
            so a squarer image reads better here. */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a0c]">
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
    </section>
  );
}
