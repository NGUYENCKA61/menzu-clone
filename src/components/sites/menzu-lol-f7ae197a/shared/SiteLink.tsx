import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * A link that navigates inside the application when it can.
 *
 * A plain `<a href="/orders">` throws the whole running application away and
 * loads it again from scratch: the header re-renders, the session is read
 * again, the cart badge is counted again, and the visitor watches a white
 * flash on the way to a page the browser is already holding most of. The
 * shop's own navigation — breadcrumbs, product cards, category tiles, the
 * header's quick links — was doing exactly that on every click.
 *
 * `<Link>` is not always right, though, which is why this exists rather than
 * a blanket replacement: these lists also carry "#" for a destination the
 * clone never built, `tel:` and `mailto:`, and addresses on other sites.
 * Handing any of those to the router is worse than the reload it avoids. So
 * the test is a positive one — one leading slash and nothing that reads as
 * another origin — and everything else stays an ordinary anchor.
 */
export function SiteLink({
  href,
  children,
  ...rest
}: { href: string; children: ReactNode } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  const internal = /^\/(?![/\\])/.test(href);
  if (internal) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
