import type { ReactNode } from "react";

/**
 * A home section's title: a short red bar, then the words in capitals (the
 * owner, 17/10/2026, the row headings' "kiểu 1", still parked on the review
 * page as #tieude). Hot trending, the game list, the reviews and the
 * questions wear it (18/10/2026: "làm hết đi"; the last two tried the main
 * site's two-tone titles and came back: "Về kiểu vạch đỏ như hàng game"), so
 * a later pick changes them all here. row-heading is a hook for the light
 * trial "moi" (theme-light.css, part 6).
 */
export function SectionHeading({
  id,
  children,
  suffix,
}: {
  id?: string;
  children: ReactNode;
  /** Drawn after the words, on the same line. */
  suffix?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div aria-hidden className="h-5 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
      <h2 id={id} className="row-heading text-xl font-black uppercase tracking-wider text-frost sm:text-2xl">
        {children}
      </h2>
      {suffix}
    </div>
  );
}
