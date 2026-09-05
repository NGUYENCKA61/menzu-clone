import Image from "next/image";

import { RevealGrid } from "./RevealGrid";

export interface PartnerView {
  id: string;
  name: string;
  /** The small grey line under the name. Null draws the card without it. */
  tagline: string | null;
  logoUrl: string | null;
  url: string | null;
}

/**
 * How many times the set is repeated inside the moving track.
 *
 * The loop animates the track left by exactly one set's share of its width,
 * then snaps back — seamless only while one set is at least as wide as the
 * viewport. Four copies keep that true down to a couple of partners on a
 * desktop screen; the animation distance below must stay in step with it.
 */
const COPIES = 4;

const MARQUEE_STYLES = `
.partners-marquee {
  animation: ticker-scroll var(--partners-duration, 36s) linear infinite;
  will-change: transform;
}
.partners-marquee:hover {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .partners-marquee {
    animation: none;
  }
}
`;

/**
 * One partner as a small standing card: the square mark on top, the name
 * under it, the line under that. The shop's partners are cheat makers whose
 * marks are square avatars, so the card is built round a 1:1 image — 64px,
 * rounded, a hairline ring that warms to the accent under the pointer so a
 * dark mark keeps an edge on the dark glass. A partner without a mark gets
 * its initial in the same square.
 *
 * Under the pointer the card lifts and carries the accent glow that follows
 * the cursor (`.spot-glow`, placed by RevealGrid), the same touch the review
 * cards above have; the strip pauses while the pointer is on it.
 */
function Card({ partner }: { partner: PartnerView }) {
  const body = (
    <>
      <span aria-hidden className="spot-glow -z-10" />
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 transition-shadow duration-300 group-hover/partner:ring-[var(--menzu-accent)]/60">
        {partner.logoUrl ? (
          <Image
            src={partner.logoUrl}
            alt=""
            width={128}
            height={128}
            className="h-16 w-16 object-cover"
          />
        ) : (
          <span className="text-2xl font-black uppercase text-neutral-300">
            {partner.name.trim().charAt(0) || "?"}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col items-center gap-0.5">
        <span className="max-w-full truncate text-[12px] font-black uppercase tracking-wider text-white">
          {partner.name}
        </span>
        {partner.tagline ? (
          <span className="max-w-full truncate text-[10px] font-semibold text-neutral-400 transition-colors group-hover/partner:text-neutral-200">
            {partner.tagline}
          </span>
        ) : null}
      </span>
    </>
  );

  const cardClass =
    "group/partner relative isolate flex w-[160px] shrink-0 flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-5 text-center shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04),0_1px_2px_0_rgb(0_0_0/0.4)] transition-[border-color,translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-white/[0.2] hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06),0_8px_24px_-8px_rgb(255_49_88/0.18)]";

  // A link only when there is somewhere to go — a dead anchor would show a
  // pointer cursor over nothing.
  return partner.url ? (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      data-spot
      className={cardClass}
    >
      {body}
    </a>
  ) : (
    <div data-spot className={cardClass}>
      {body}
    </div>
  );
}

/**
 * "Đối tác uy tín" — the makers whose tools the shop sells, as standing
 * cards gliding past in a marquee under a faint accent wash.
 *
 * Renders nothing while the shop has added no partners: a heading over an
 * empty strip would be worse than no section, and nothing here is seeded
 * with invented names.
 *
 * The motion reuses the global ticker-scroll keyframes. The track holds the
 * set COPIES times and travels 1/COPIES of its width per loop, so the reset
 * lands on an identical frame. Repeats past the first are aria-hidden — a
 * screen reader should meet each partner once.
 */
export function PartnersSection({ partners }: { partners: PartnerView[] }) {
  if (partners.length === 0) return null;

  return (
    <section className="relative w-full">
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_STYLES }} />

      {/* A soft pool of the accent behind the strip, the way the hero's sky
          and lmarket's sections sit their content on a glow rather than on
          flat black. Blurred wide and kept faint so it is felt, not seen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[280px] w-[min(720px,100%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--menzu-accent)]/[0.07] blur-[110px]"
      />

      {/* Centered, unlike the row headings above — this block closes the
          social-proof pair with the reviews. Two-tone like the reviews
          heading right above it — white with the one word that matters in
          the accent red. */}
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-black uppercase tracking-wider text-white sm:text-3xl">
          Đối tác <span className="text-[var(--menzu-accent)]">uy tín</span> của chúng tôi
        </h2>
        <p className="text-[13px] text-neutral-400">
          Những nhà phát triển đứng sau các tool shop đang phân phối.
        </p>
      </div>

      {/* The clip box gets padding pulled back by the same margins, so a
          lifted card's shadow is not cut off at the bottom edge while the
          block keeps its height. RevealGrid here only places the glow; no
          card rises in — the strip's own glide is the motion. */}
      <RevealGrid className="relative -my-8 mt-0 overflow-hidden py-8">
        {/* Soft fades at both edges so cards slide in and out of a gradient
            instead of popping at a hard border. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0d0d12] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0d0d12] to-transparent" />

        <div
          className="partners-marquee flex gap-4"
          style={{
            ["--ticker-width" as string]: `${100 / COPIES}%`,
            // 4s per partner: one loop in 24s for six — ~44px/s, brisk
            // enough to read as motion at a glance, still slow enough that
            // a mark is recognised mid-glide. Scales with the roster, so a
            // longer strip keeps the same feel instead of speeding up.
            ["--partners-duration" as string]: `${Math.max(16, partners.length * 4)}s`,
          }}
        >
          {Array.from({ length: COPIES }, (_, copy) =>
            partners.map((partner) => (
              <div key={`${partner.id}-${copy}`} aria-hidden={copy > 0 || undefined}>
                <Card partner={partner} />
              </div>
            )),
          )}
        </div>
      </RevealGrid>
    </section>
  );
}
