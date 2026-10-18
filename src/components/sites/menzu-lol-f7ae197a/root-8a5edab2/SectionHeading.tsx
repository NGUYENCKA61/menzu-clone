import type { ReactNode } from "react";

/**
 * A home section's title: a short red bar, then the words in capitals (the
 * owner, 17/10/2026, the row headings' "kiểu 1", still parked on the review
 * page as #tieude). Hot trending, the game list, the reviews and the
 * questions wear this one (18/10/2026: "làm hết đi"), so a later pick
 * changes them all here. row-heading is a hook for the light trial "moi"
 * (theme-light.css, part 6).
 *
 * Two tones as the main site sets "Chiến thắng trong tầm tay bạn": the
 * first two words white, the rest in the shop's red, on every title so they
 * stay alike (the owner, 18/10/2026: "làm đi", asked whether the red half
 * should come back on all four). A title of two words or fewer stays white.
 */
export function SectionHeading({
  id,
  children,
  suffix,
}: {
  id?: string;
  children: string;
  /** Drawn after the words, on the same line. */
  suffix?: ReactNode;
}) {
  const words = children.trim().split(/\s+/);
  const lead = words.slice(0, 2).join(" ");
  const rest = words.slice(2).join(" ");
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div aria-hidden className="h-5 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
      <h2 id={id} className="row-heading text-xl font-black uppercase tracking-wider text-frost sm:text-2xl">
        {lead}
        {rest ? (
          <>
            {" "}
            <span className="text-[var(--menzu-accent)]">{rest}</span>
          </>
        ) : null}
      </h2>
      {suffix}
    </div>
  );
}
