import Link from "next/link";

import type { GuideLink, RelatedGuides as RelatedGuidesData } from "@/lib/relatedGuides";

import { SectionHeading } from "./SectionHeading";

/**
 * "Hướng dẫn liên quan": the links lib/relatedGuides.ts picks for a shelf, a
 * tool or an account listing, in three groups: the game's articles, the
 * buying and warranty guides, and the seven setup pages as chips. Draws
 * nothing when every group is empty.
 *
 * Only the data crosses from the server module: this file imports its types
 * alone, so a page that bundles it never pulls the database in.
 */

const LINK =
  "text-sm text-neutral-300 underline-offset-2 transition-colors hover:text-white hover:underline";
const CHIP =
  "inline-flex rounded-full border border-white/10 px-3 py-1 text-[12px] text-neutral-300 transition-colors hover:border-white/25 hover:text-white";
const GROUP = "text-[13px] font-semibold text-neutral-500";

/** The heading over the block. "section" is the red-bar h2 the storefront
 *  sections wear; "sub" is the h3 of the tool page's description, where
 *  this sits between two of them (SoftwareDescription's SUB_HEADING). */
export type RelatedGuidesHeading = "section" | "sub";

function LinkGroup({ heading, links }: { heading: string; links: GuideLink[] }) {
  return (
    <div>
      <p className={GROUP}>{heading}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={LINK}>
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RelatedGuides({
  guides,
  heading = "section",
  old = false,
}: {
  guides: RelatedGuidesData | null;
  heading?: RelatedGuidesHeading;
  /** LAB: ?ban=cu, the "sub" heading as it was before 19/10/2026. */
  old?: boolean;
}) {
  if (!guides) return null;
  const { game, general, setup } = guides;
  if (game.length === 0 && general.length === 0 && setup.length === 0) return null;

  return (
    <section aria-labelledby="related-guides-heading" className="mt-10">
      {heading === "section" ? (
        <SectionHeading id="related-guides-heading">Hướng dẫn liên quan</SectionHeading>
      ) : (
        // Under a product page's write-up it reads as the sub headings beside
        // it ("Yêu cầu hệ thống", "Tính năng nổi bật": the display face,
        // 19px, semibold, the frost white), not a 17px black of its own
        // (19/10/2026, "đồng bộ"); in capitals at 17px with them on trial
        // (25/10/2026, "tiêu đề in hoa thử").
        <h3
          id="related-guides-heading"
          className={old ? "text-[17px] font-black text-white" : "font-display text-[17px] font-extrabold uppercase tracking-wider text-frost"}
        >
          Hướng dẫn liên quan
        </h3>
      )}

      <div className="mt-5 grid gap-8 sm:grid-cols-2">
        {game.length > 0 ? (
          <LinkGroup
            heading={guides.gameName ? `Về ${guides.gameName}` : "Bài viết liên quan"}
            links={game}
          />
        ) : null}
        {general.length > 0 ? <LinkGroup heading="Mua, bảo hành, đổi máy" links={general} /> : null}
      </div>

      {setup.length > 0 ? (
        <div className="mt-6">
          <p className={GROUP}>Chuẩn bị máy</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {setup.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={CHIP}>
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
