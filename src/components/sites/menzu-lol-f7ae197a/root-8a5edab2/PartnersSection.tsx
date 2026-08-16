import Image from "next/image";

export interface PartnerView {
  id: string;
  name: string;
  /** The small grey line under the logo. Null draws the tile without it. */
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

function Tile({ partner }: { partner: PartnerView }) {
  const body = (
    <>
      {partner.logoUrl ? (
        <Image
          src={partner.logoUrl}
          alt={partner.name}
          width={140}
          height={40}
          className="h-9 w-auto max-w-[140px] object-contain"
        />
      ) : (
        <span className="text-sm font-black uppercase tracking-widest text-neutral-300">
          {partner.name}
        </span>
      )}
      {/* Fits inside the tile's existing 80px without growing it: the logo is
          36px and this line 12, so a column with a small gap still centers
          with room over. Brightens a step with the tile's own hover. */}
      {partner.tagline ? (
        <span className="max-w-full truncate text-center text-[10px] font-semibold leading-none text-neutral-400 transition-colors group-hover/partner:text-neutral-200">
          {partner.tagline}
        </span>
      ) : null}
    </>
  );

  const tileClass =
    "group/partner flex h-20 w-[180px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-5 transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-white/[0.06]";

  // A link only when there is somewhere to go — a dead anchor would show a
  // pointer cursor over nothing.
  return partner.url ? (
    <a href={partner.url} target="_blank" rel="noopener noreferrer" className={tileClass}>
      {body}
    </a>
  ) : (
    <div className={tileClass}>{body}</div>
  );
}

/**
 * "Đối tác uy tín" — a marquee of partner logos.
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
    <section className="w-full">
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_STYLES }} />

      {/* Centered, unlike the row headings above — this block closes the
          social-proof pair with the reviews, and the mock treats it as its own
          little masthead: red eyebrow between two rules, then the heading,
          then one line of copy. */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px w-8 bg-[var(--menzu-accent)]" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--menzu-accent)]">
            Trusted Partners
          </span>
          <span aria-hidden className="h-px w-8 bg-[var(--menzu-accent)]" />
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          Đối tác uy tín của chúng tôi
        </h2>
      </div>

      <div className="relative overflow-hidden py-1">
        {/* Soft fades at both edges so tiles slide in and out of a gradient
            instead of popping at a hard border. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0d0d12] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0d0d12] to-transparent" />

        <div
          className="partners-marquee flex gap-4"
          style={{
            ["--ticker-width" as string]: `${100 / COPIES}%`,
            // 4s per partner: one loop in 24s for the six starters — ~49px/s,
            // brisk enough to read as motion at a glance, still slow enough
            // that a logo is recognised mid-glide. Scales with the roster, so
            // a longer strip keeps the same feel instead of speeding up.
            ["--partners-duration" as string]: `${Math.max(16, partners.length * 4)}s`,
          }}
        >
          {Array.from({ length: COPIES }, (_, copy) =>
            partners.map((partner) => (
              <div key={`${partner.id}-${copy}`} aria-hidden={copy > 0 || undefined}>
                <Tile partner={partner} />
              </div>
            )),
          )}
        </div>
      </div>
    </section>
  );
}
