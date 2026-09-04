"use client";

import {
  Activity,
  Home,
  LayoutGrid,
  ShoppingCart,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { STATUS_TAB_HREF } from "@/lib/softwareStatus";

interface NavEntry {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * The five places a phone visitor actually goes. The captured site's bar
 * (Check Skin, Thu Acc, Profile…) belonged to an account shop and every one
 * of its tabs pointed at "#"; this shop sells tools, so the bar takes the
 * visitor to the catalogue, the status board, the basket and their account.
 * Profile is a real route that sends a stranger to the login page itself.
 */
const NAV_ENTRIES: NavEntry[] = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Danh mục", href: "/categories", icon: LayoutGrid },
  { label: "Trạng thái", href: STATUS_TAB_HREF, icon: Activity },
  { label: "Giỏ hàng", href: "/cart", icon: ShoppingCart },
  { label: "Tài khoản", href: "/profile", icon: User },
];

/**
 * Whether the tab is the page being read. Home is exact, since every other
 * address begins with "/". The others match their own page and anything
 * under it; the status tab's query string is dropped for the comparison so
 * the whole announcements page lights it, whichever tab is open there.
 */
function isCurrent(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  const path = href.split("?")[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#0a0a0d]">
      <div className="grid grid-cols-5 h-16">
        {NAV_ENTRIES.map(({ label, href, icon: Icon }) => {
          const current = isCurrent(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={
                current
                  ? "flex flex-col items-center justify-center gap-1 text-[var(--menzu-accent)] transition-colors"
                  : "flex flex-col items-center justify-center gap-1 text-neutral-500 hover:text-[var(--menzu-accent)] transition-colors"
              }
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
