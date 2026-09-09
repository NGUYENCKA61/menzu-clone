"use client";

import { useLinkStatus } from "next/link";

/**
 * The tint a link wears between the click and the page.
 *
 * Every storefront page is rendered on demand, so a click waits half a second
 * or more for the server, and until now nothing on the screen said the click
 * had registered. This is that something: a wash of the accent over the row or
 * chip that was pressed, no more.
 *
 * Rendered as a sibling of the link's own children rather than by restyling
 * the link, so a row that is already the current page keeps its own chrome
 * and only the row being left for lights up — two lit rows read as a broken
 * menu. Held back 120ms by the animation itself (`.link-pending` in
 * globals.css) so a navigation that lands fast never flashes. Must sit inside
 * a <Link>, which is where `useLinkStatus` reads from; the link needs
 * `relative` and, ideally, a radius for the wash to inherit.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="link-pending pointer-events-none absolute inset-0 rounded-[inherit] bg-[var(--menzu-accent)]/10"
    />
  );
}
