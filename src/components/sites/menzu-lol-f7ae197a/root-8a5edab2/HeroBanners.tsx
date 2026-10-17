import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, BookCheck, ShoppingBag } from "lucide-react";

import { DEFAULT_SETTINGS } from "@/lib/settings";
import { HeroImageCarousel } from "./HeroImageCarousel";
import { HeroVideo } from "./HeroVideo";
import { ScrollCta } from "./ScrollCta";

/**
 * Where the hero's scroll cue lands: the "Danh sách hack game" row on the
 * home page, which hangs this id on itself (page.tsx). Shared so the two
 * cannot drift apart into a link that scrolls nowhere — which is what
 * happened while the id sat on the featured strip and the shop switched
 * that strip off.
 */
export const SCROLL_TARGET_ID = "danh-sach-hack-game";

// LAB: buttons in sentence case. On a phone 44px tall at 14px, beside the
// 14px subtitle; from 640px 48px at 15px, beside the 16px subtitle, which
// is the main site's button size give or take a few pixels (the owner,
// 17/10/2026: "cần thì tăng kích thước cho đồng bộ nha").
const CTA =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-6 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost sm:h-12 sm:text-[15px]";

/** Seconds between characters as the heading types itself in. */
const TYPE_STEP = 0.07;

/** Seconds the heading waits before typing, so the "Welcome to" line fades up first. */
const HEADING_DELAY = 0.5;

/**
 * Said after the drawn title inside the h1, for screen readers and search
 * engines only: the same words the home page's stand-in h1 uses when the
 * hero is switched off (page.tsx).
 */
const H1_TOPIC = ": hack game và tài khoản game";

interface HeroBannersProps {
  /** The still artwork, and the poster frame when a video is set. */
  banner?: string;
  /** Plays in place of the still when set and `media` is "video". */
  video?: string;
  /** Cấu hình's choice for the frame: the clip, or the pictures. */
  media?: "video" | "image";
  /** The pictures for "image": one stands still, more cross-fade. */
  images?: string[];
  /** The pill above the eyebrow. Empty draws none. */
  badge?: string;
  /** Newlines are line breaks — the heading is written to sit on two rows. */
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Kept for the settings screen; LAB draws no sky (one moment: the typing). */
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
  media = DEFAULT_SETTINGS.heroMedia,
  images = DEFAULT_SETTINGS.heroImages,
  badge = DEFAULT_SETTINGS.heroBadge,
  title = DEFAULT_SETTINGS.heroTitle,
  subtitle = DEFAULT_SETTINGS.heroSubtitle,
  primaryLabel = DEFAULT_SETTINGS.heroPrimaryLabel,
  primaryHref = DEFAULT_SETTINGS.heroPrimaryHref,
  secondaryLabel = DEFAULT_SETTINGS.heroSecondaryLabel,
  secondaryHref = DEFAULT_SETTINGS.heroSecondaryHref,
}: HeroBannersProps) {
  const lines = title.split("\n").filter((line) => line.trim());
  // "Ảnh" with nothing uploaded yet shows the banner, as the frame always did.
  const slides = media === "image" && images.length > 0 ? images : [banner];
  const totalChars = lines.reduce((sum, line) => sum + Array.from(line).length, 0);
  // Runs across every line so the stagger does not restart on the second row.
  let charCursor = 0;
  // LAB: from 1280px the subtitle's first sentence gets a line of its own,
  // ending just short of the title's last letter (the owner, 17/10/2026:
  // "làm chữ hiện nay dài tới chữ m thử"). Only for a sentence of up to 70
  // characters: about 535px at 16px, still clear of the banner, which
  // starts some 76px past the title's 498px at 1280.
  const cut = subtitle.indexOf(". ");
  const subtitleHead = cut > 0 && cut < 70 ? subtitle.slice(0, cut + 1) : "";
  const subtitleTail = subtitleHead ? subtitle.slice(cut + 2) : subtitle;


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
    //
    // From lg the two gaps the eye measures are made equal: header to the top
    // of the copy and artwork, and their bottom to the scroll cue. The page
    // container already puts 40px above this section, and the cue stands
    // 20px off its bottom edge and is 33px tall, so pt 0 with pb 93 leaves
    // 40px plus the same centring slack on both sides. At pt-14/pb-20 the
    // top gap ran 69px longer than the bottom one on every screen.
    // isolate so the -z background layer stacks against this section, not the
    // page. Clipped on the vertical axis only, so nothing spills past the
    // fold; sideways stays visible because the reseller pill above the eyebrow
    // is pulled 14px left of the copy edge (into the page padding) and a full
    // clip took its rounded corner off. The sky layer clips itself.
    // home-hero and hero-sky are hooks for the light trial "moi"
    // (theme-light.css, part 6); they carry no style of their own.
    <section className="home-hero relative isolate flex w-full flex-col justify-center overflow-x-visible overflow-y-clip min-h-[calc(100svh-128px)] pt-6 pb-20 sm:pt-10 lg:min-h-[calc(100svh-144px)] lg:pt-0 lg:pb-[93px]">
      {/* Stacked on phones; on desktop the copy and the artwork are pushed to
          the container's two edges with a wide empty gap between them, the way
          the reference spaces its hero. Each side is capped and allowed to
          shrink (flex-1 + max-w + min-w-0), so the gap only opens once both
          have room for their full width, and they close up on a narrow laptop
          instead of overflowing. z-10 lifts them clear of the sky layer.
          Top-aligned with items-start: the copy used to be nudged up a fixed
          48px from centre, which lined its top up with the artwork only while
          the card was 365px tall — from 1024 to 1279, where the card shrinks,
          the copy stuck out 37px above it. */}
      <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex w-full flex-col items-start lg:w-auto lg:min-w-0 lg:max-w-[440px] lg:flex-1">
          {/* The reseller pill: dark glass with a red check, the same chrome
              the listing cards' corner badges wear, so it reads as a badge
              and not as a third line of copy. Fades up with the eyebrow.
              Pulled left by its own padding so the check sits on the same
              edge as the "Welcome to" below it, not one pad-width in. LAB: back to
              the main site's pill (the owner, 17/10/2026: "sửa cái Official
              OBV Hax Reseller cho giống web gốc nha"). */}
          {badge ? (
            // LAB: 11px from 640px up, where the block around it grew
            // (subtitle 16px, buttons 48px); 10px on a phone (17/10/2026).
            <span className="animate-fade-up -ml-3.5 mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-200 backdrop-blur-md sm:text-[11px]">
              <BadgeCheck size={13} aria-hidden className="text-[var(--menzu-accent)]" />
              {badge}
            </span>
          ) : null}

          {/* Eyebrow line: fades up first, then the heading types itself in
              after it (HEADING_DELAY). In the accent, so the block opens the
              way every row heading below it does: a red mark, then white
              type. LAB: back as on the main site (the owner, 17/10/2026:
              "we are đâu", then "làm đi", worded "welcome to"). */}
          <span className="animate-fade-up block text-[13px] font-bold uppercase tracking-[0.3em] text-[var(--menzu-accent)] sm:text-sm">
            Welcome to
          </span>

          {/* The heading types itself in — each character a span that pops on a
              staggered delay after the eyebrow, then a caret blinks at the end.
              aria-label carries the whole title so a screen reader reads it
              once, not letter by letter. It also carries what the shop sells,
              read and indexed but not drawn (H1_TOPIC): the drawn title is
              the brand alone (SEO review, 13/10/2026). */}
          <h1
            aria-label={`${title.replace(/\n/g, " ")}${H1_TOPIC}`}
            // One unbreakable word in a column capped at 440px: at 46px it is
            // 485px wide and its last letters ran under the video card on
            // every screen from 1024 to 1279. 40px is 422px — inside the cap.
            // LAB: the main site's sizes up to 1279px (28/36/40px); from 1280
            // 48px, the category pages' title size, about 506px wide and
            // still 76px clear of the banner at 1280 (17/10/2026).
            className="mt-2 font-display text-[28px] font-black leading-[1.06] tracking-tight text-frost sm:text-[36px] lg:text-[40px] xl:text-[48px]"
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
            <span className="sr-only">{H1_TOPIC}</span>
          </h1>

          {subtitle ? (
            // LAB: 16px from 640px up, so the line holds its own beside the
            // 36-48px title and the banner; 14px on a phone. In the main
            // site's lighter grey (#d4d4d4), which stays legible over the
            // brighter patches of the picture (17/10/2026).
            <p className="mt-5 max-w-[460px] text-[14px] leading-relaxed text-neutral-300 sm:text-[16px]">
              {subtitleHead ? (
                <>
                  <span className="xl:block xl:whitespace-nowrap">{subtitleHead}</span>{" "}
                </>
              ) : null}
              <span className="xl:block">{subtitleTail}</span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className={`${CTA} bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]`}
            >
              <ShoppingBag size={15} aria-hidden />
              {primaryLabel}
            </Link>
            {secondaryLabel && secondaryHref ? (
              <Link
                href={secondaryHref}
                // LAB: see-through glass over the artwork, like the main
                // site's and the reseller pill above, so the red button is
                // the one that stands out (the owner, 17/10/2026: "thử đi").
                className={`${CTA} bg-white/[0.04] text-frost ring-1 ring-inset ring-white/10 backdrop-blur-md hover:bg-white/[0.08] hover:ring-white/20`}
              >
                <BookCheck size={15} aria-hidden />
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>

        {/* The artwork in a wide 16/9 frame, the shape the shop's covers and
            banner already come in, so object-cover crops almost nothing. The
            rounder corners and the ring match the media card in the
            reference. The red wash that used to glow beneath the card came
            off on the owner's word; in its place a wide black halo on every
            side, which darkens the busy page picture right behind the frame
            so the video stands clear of it.
            From 1400px (87.5rem — in rem so it sorts after lg:max-w and wins)
            the card runs 40px past the container's right edge —
            past the header's last button — the way gachatool.com's does on a
            wide screen: 20px more width than the 650 cap and a -40px right
            margin, so it runs 40px past the header while its left edge gives
            20px back to the gap beside the copy.
            Below 1400 there is no side margin to spend and it stays flush.
            LAB: the halo is back, the main site's own (the owner, 17/10/2026:
            "có nên thêm lại không", then "làm đi"), beside the drop shadow. */}
        <div className="lab-notch-lg relative aspect-[16/9] w-full overflow-hidden border border-line bg-scrim shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95),0_0_140px_30px_rgba(0,0,0,0.65)] lg:w-auto lg:min-w-0 lg:max-w-[650px] lg:flex-1 min-[87.5rem]:-mr-10 min-[87.5rem]:max-w-[670px]">
          {media === "video" && video ? (
            // Muted and inline, because a hero that makes noise or takes over
            // the screen on a phone is a hero people leave. The still is drawn
            // first and stays; the clip fades in over it once it is running,
            // and never loads at all for readers who asked for less motion.
            <HeroVideo src={video} poster={banner} />
          ) : slides.length > 1 ? (
            <HeroImageCarousel images={slides} />
          ) : (
            <Image
              src={slides[0] ?? banner}
              // Decorative: the heading beside it already says what the shop
              // is, and "banner" only made a screen reader announce a word
              // that tells its listener nothing.
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 620px"
              className="select-none object-cover"
              // The home page's LCP image. In Next 16 `priority` only
              // preloads; fetchPriority is what lifts it to High (SEO
              // review, 13/10/2026).
              preload
              fetchPriority="high"
            />
          )}
        </div>
      </div>

      <ScrollCta targetId={SCROLL_TARGET_ID} label="Khám phá ngay" animated />
    </section>
  );
}
