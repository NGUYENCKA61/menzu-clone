import { Fragment } from "react";
import { ChevronRight, House } from "lucide-react";

import { sentenceCase } from "@/lib/displayCase";
import { CrumbPill } from "./CrumbPill";
import { SiteLink } from "./SiteLink";

export interface Crumb {
  label: string;
  href?: string;
}

const CRUMB_LINK_CLASS =
  "hover:text-white transition-colors flex items-center gap-1.5 shrink-0";
// The page you are on reads in white, the way a current tab does; the trail
// behind it stays grey. It used to be indigo, the one place that colour was
// left on the storefront.
// crumb-current and crumb-sep are hooks for the light trial "moi"
// (theme-light.css, part 6), which drops the current crumb on a phone
// product page; they carry no style of their own.
const CRUMB_CURRENT_CLASS =
  "crumb-current text-frost transition-colors font-semibold max-w-[300px] md:max-w-[440px] truncate";

function BreadcrumbTrail({ items }: { items: Crumb[] }) {
  return (
    <>
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;

        return (
          <Fragment key={`${item.label}-${index}`}>
            {/* aria-current marks the page the reader is on, which the
                white crumb only shows (the SEO review, round 2, C12). */}
            {item.href ? (
              <SiteLink
                href={item.href}
                className={CRUMB_LINK_CLASS}
                aria-current={isLast ? "page" : undefined}
              >
                {isFirst && <House size={12} />}
                {sentenceCase(item.label)}
              </SiteLink>
            ) : (
              <span className={CRUMB_CURRENT_CLASS} aria-current={isLast ? "page" : undefined}>
                {isFirst && <House size={12} />}
                {sentenceCase(item.label)}
              </span>
            )}
            {!isLast && <ChevronRight size={12} className="crumb-sep text-neutral-600 shrink-0" />}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * Page breadcrumb trail. Live site renders two sibling <nav> elements — a
 * pill-shaped desktop version and a plain mobile version — toggled purely
 * via `hidden`/breakpoint classes rather than JS, so both stay in the DOM.
 *
 * `margin` is the gap under it: 24px on most pages, none where the page
 * wraps it in its own spaced box, as the account shell and the invoice do.
 */
export function Breadcrumb({
  items,
  margin = "mb-6",
}: {
  items: Crumb[];
  margin?: "mb-6 sm:mb-8" | "mb-6" | "mb-0";
}) {
  return (
    <>
      {/* Named for assistive tech on both, as the ARIA pattern asks; only
          the one the breakpoint shows is announced (the SEO review, round
          2, C12). */}
      {/* TRIAL: the desktop trail's pill with a light fill (the owner,
          27/10/2026: "bỏ phần card bo chỗ đó đi thử", "card bo trong suốt
          đi", "nền nhẹ thử"): its shape and faint edge on white at 4%, no
          shadow or blur. It was bg-panel/80, shadow-lg and
          backdrop-blur-md. LAB: ?duongdan=trong|cu|khong shows the other
          dresses beside it (CrumbPill). */}
      <CrumbPill
        className={`hidden sm:inline-flex items-center flex-wrap gap-x-3 gap-y-2 text-[13px] font-medium text-mist leading-normal transition-all group/nav w-fit ${margin}`}
      >
        <BreadcrumbTrail items={items} />
      </CrumbPill>

      <nav
        aria-label="Breadcrumb"
        className={`flex sm:hidden flex-wrap items-center gap-x-2 gap-y-2.5 text-[13px] font-medium text-mist leading-normal transition-all w-fit ${margin}`}
      >
        <BreadcrumbTrail items={items} />
      </nav>
    </>
  );
}
