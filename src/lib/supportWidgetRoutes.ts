/**
 * Where the floating bottom-right widget stays away: the customer's support
 * bubble and the admin's warranty inbox both read this, so the two can never
 * disagree about which pages keep that corner clear.
 */
export function floatingWidgetHidden(pathname: string): boolean {
  // /bio is a standalone link-in-bio card with no site chrome: the live page
  // carries no widget, and the support channels are already its whole content.
  if (pathname === "/bio") return true;

  // The admin area is staff-side: nobody in there needs customer care, the
  // admin has the full warranty desk there already, and the tab floats exactly
  // over the bottom-right corner every admin table puts its paging controls in.
  if (pathname.startsWith("/admin")) return true;

  // The basket's summary column ends in the "Thanh toán" button, in the very
  // corner the tab sits in: the one press the whole page exists for was
  // landing on the widget instead. Support is a click away in the footer and
  // on every product page; the checkout is not.
  if (pathname === "/cart") return true;

  return false;
}
