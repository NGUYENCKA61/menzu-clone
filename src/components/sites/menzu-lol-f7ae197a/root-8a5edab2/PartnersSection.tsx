import Image from "next/image";

export interface PartnerView {
  id: string;
  name: string;
  /** The small grey line under the name. Null draws the tile without it. */
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
 * One partner: a square mark on the left, the name (and the line under it)
 * on the right. The shop's partners are cheat makers whose marks are square
 * avatars, not wide wordmarks, so the tile is built for a 1:1 image — 48px,
 * softly rounded, a hairline ring so a dark mark keeps an edge against the
 * dark glass. A partner without a mark gets its initial in the same square.
 */
function Tile({ partner }: { partner: PartnerView }) {
  const body = (
    <>
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/[0.04] ring-1 ring-white/10">
        {partner.logoUrl ? (
          <Image
            src={partner.logoUrl}
            alt=""
            width={96}
            height={96}
            className="h-12 w-12 object-cover"
          />
        ) : (
          <span className="text-lg font-black uppercase text-neutral-300">
            {partner.name.trim().charAt(0) || "?"}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-black uppercase tracking-wider text-white">
          {partner.name}
        </span>
        {partner.tagline ? (
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-neutral-400 transition-colors group-hover/partner:text-neutral-200">
            {partner.tagline}
          </span>
        ) : null}
      </span>
    </>
  );

  const tileClass =
    "group/partner flex h-20 w-[220px] shrink-0 items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-white/[0.06]";

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
 * "Đối tác uy tín" — a marquee of partner tiles.
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

      {/* Centered, unlike the row headings above — this block opens the
          social-proof pair with the reviews. The mock's "Trusted Partners"
          eyebrow between two rules went by the shop's decision: the heading
          says it already, and the line only made the top of the block busy.
          Two-tone like the reviews heading right above it — white with the
          one word that matters in the accent red — after a whole-line red
          and a whole-line purple both read as too much of one colour. */}
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          Đối tác <span className="text-[var(--menzu-accent)]">uy tín</span> của chúng tôi
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
            // 4s per partner: one loop in 20s for five — ~47px/s, brisk
            // enough to read as motion at a glance, still slow enough that
            // a mark is recognised mid-glide. Scales with the roster, so a
            // longer strip keeps the same feel instead of speeding up.
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
