import { Fragment } from "react";
import { ChevronRight, House } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

const CRUMB_LINK_CLASS =
  "hover:text-white transition-colors flex items-center gap-1.5 shrink-0";
// The page you are on reads in white, the way a current tab does; the trail
// behind it stays grey. It used to be indigo, the one place that colour was
// left on the storefront.
const CRUMB_CURRENT_CLASS =
  "text-white transition-colors font-black max-w-[300px] md:max-w-[400px] truncate";

function BreadcrumbTrail({ items }: { items: Crumb[] }) {
  return (
    <>
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;

        return (
          <Fragment key={`${item.label}-${index}`}>
            {item.href ? (
              <a href={item.href} className={CRUMB_LINK_CLASS}>
                {isFirst && <House size={12} />}
                {item.label}
              </a>
            ) : (
              <span className={CRUMB_CURRENT_CLASS}>
                {isFirst && <House size={12} />}
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight size={12} className="text-neutral-600 shrink-0" />}
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
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <>
      <nav className="hidden sm:inline-flex items-center flex-wrap gap-x-3 gap-y-2 px-4 py-2.5 bg-[#111111]/80 border border-white/10 hover:border-white/20 shadow-lg rounded-full text-xs font-black uppercase tracking-widest text-neutral-300 leading-normal backdrop-blur-md transition-all group/nav w-fit mb-6">
        <BreadcrumbTrail items={items} />
      </nav>

      <nav className="flex sm:hidden flex-wrap items-center gap-x-2 gap-y-2.5 text-[10px] font-black uppercase tracking-widest leading-normal transition-all w-fit mb-6">
        <BreadcrumbTrail items={items} />
      </nav>
    </>
  );
}
