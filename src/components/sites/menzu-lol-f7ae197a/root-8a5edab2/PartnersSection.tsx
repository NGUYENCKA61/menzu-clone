import Image from "next/image";

export interface PartnerView {
  id: string;
  name: string;
  /** The small grey line under the logo. Null draws the tile without it. */
  tagline: string | null;
  logoUrl: string | null;
  url: string | null;
}

function Tile({ partner }: { partner: PartnerView }) {
  const body = (
    <>
      {partner.logoUrl ? (
        <Image
          src={partner.logoUrl}
          alt={partner.name}
          width={160}
          height={48}
          className="h-10 w-auto max-w-[150px] object-contain"
        />
      ) : (
        <span className="text-sm font-black uppercase tracking-widest text-neutral-300">
          {partner.name}
        </span>
      )}
      {partner.tagline ? (
        <span className="max-w-full truncate text-center text-[10px] font-semibold leading-none text-neutral-500 transition-colors group-hover/partner:text-neutral-300">
          {partner.tagline}
        </span>
      ) : null}
    </>
  );
  // Dashed cells, as on a sheet of stickers: the logos are the content and
  // the lines only keep them apart.
  const tileClass =
    "group/partner flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-4 transition-colors hover:border-white/30 hover:bg-white/[0.05]";
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
 * "Đối tác uy tín" — the shop's partners as a still grid of logos under a
 * heading with its own ghost behind it.
 *
 * Still rather than a marquee: a dozen logos fit on one screen, and a grid
 * lets every one be read; a strip that glides is for a roster too long to
 * show. The ghost word behind the heading is the block's one flourish and
 * sits at four percent white, felt more than read.
 *
 * Renders nothing while the shop has added no partners (Admin → Đối tác): a
 * heading over an empty grid would be worse than no section, and nothing
 * here is seeded with invented names.
 */
export function PartnersSection({ partners }: { partners: PartnerView[] }) {
  if (partners.length === 0) return null;
  return (
    <section className="w-full">
      <div className="relative mb-10 flex flex-col items-center text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[56px] font-black uppercase leading-none tracking-wider text-white/[0.04] sm:text-[96px]"
        >
          Đối tác
        </span>
        <h2 className="relative text-2xl font-black uppercase tracking-wider text-white sm:text-3xl">
          Đối tác <span className="text-[var(--menzu-accent)]">uy tín</span> của chúng tôi
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {partners.map((partner) => (
          <Tile key={partner.id} partner={partner} />
        ))}
      </div>
    </section>
  );
}
