"use client";

import {
  BadgeCheck,
  Bell,
  Boxes,
  FileText,
  Headset,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { DEFAULT_SETTINGS } from "@/lib/settings";

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  // Categories live inside the products screen — they are the first step of
  // adding a product, not a separate errand.
  { label: "Sản phẩm", href: "/admin/products", icon: Boxes },
  { label: "Nhóm danh mục", href: "/admin/groups", icon: LayoutGrid },
  { label: "Đơn hàng", href: "/admin/orders", icon: ShoppingBag },
  { label: "CRM", href: "/crm", icon: Headset },
  { label: "Bảo hành", href: "/admin/warranty", icon: ShieldCheck },
  { label: "Marketing", href: "/admin/marketing", icon: Ticket },
  { label: "Người dùng", href: "/admin/users", icon: Users },
  { label: "Xác thực", href: "/admin/verifications", icon: BadgeCheck },
  { label: "Bài viết", href: "/admin/docs", icon: FileText },
  { label: "Vận hành", href: "/admin/operations", icon: MessageSquare },
  { label: "Thông báo", href: "/admin/announcements", icon: Bell },
  { label: "Cấu hình", href: "/admin/settings", icon: Settings },
];

// On a phone the strip shows three links at a time, and the two the owner
// opens every day sat 420px and 1.000px to the right of the screen. There
// they come straight after the overview; the desktop column keeps its
// grouped order. Literal class names, so Tailwind can see them.
const PHONE_ORDER: Record<string, string> = {
  "/admin": "order-1",
  "/admin/orders": "order-2",
  "/crm": "order-3",
  "/admin/operations": "order-4",
  "/admin/products": "order-5",
  "/admin/users": "order-6",
  "/admin/groups": "order-7",
  "/admin/warranty": "order-8",
  "/admin/marketing": "order-9",
  "/admin/docs": "order-10",
  "/admin/announcements": "order-11",
  "/admin/settings": "order-12",
  "/admin/verifications": "order-13",
};

// LAB: the active row is a lighter well with a rim, like the shop's lit tabs;
// red stays for actions (the owner, 16/10/2026: "bớt AI bớt rối").
const ACTIVE =
  "flex items-center gap-3 py-2.5 pl-4 pr-3 rounded-lg text-[13px] font-semibold transition-colors bg-white/[0.07] text-frost ring-1 ring-inset ring-white/10";
const INACTIVE =
  "flex items-center gap-3 py-2.5 pl-4 pr-3 rounded-lg text-[13px] font-medium transition-colors text-neutral-400 hover:text-white hover:bg-white/[0.04]";

interface AdminShellProps {
  title: string;
  subtitle?: string;
  username: string;
  /** Optional note on the far side of the heading — a count, a timeframe. */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * Admin chrome. Deliberately plain rather than a clone of the storefront —
 * this area does not exist on menzu.lol, so dressing it up in the site's
 * styling would blur the line between what was cloned and what was added.
 */
export function AdminShell({
  title,
  subtitle,
  username,
  aside,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const strip = useRef<HTMLElement>(null);

  // The strip opens on the page you are on: eleven links scroll sideways and
  // the one that is lit may be off the right edge. It moves only when it has
  // to — a lit link already in view stays where it is, with its neighbours —
  // and only the strip moves; scrollIntoView would drag the page down too.
  useEffect(() => {
    const nav = strip.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (left >= nav.scrollLeft && right <= nav.scrollLeft + nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, left - 12);
  }, [pathname]);

  return (
    <div className="keep-dark min-h-screen bg-[#08080a] text-white lg:flex">
      {/* Full height and flush to the edge on a desktop. On a phone it is one
          row — the name, then the links scrolling sideways — and it stays at
          the top of the screen: the owner used to scroll up 5.000px of
          settings and swipe the strip twice to reach the orders. z-30 keeps
          it under the dialogs and toasts, which sit at z-50. */}
      <aside
        className="sticky top-0 z-30 lg:h-screen lg:w-[228px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#0a0a0c] flex items-center lg:flex-col lg:items-stretch"
      >
        <div className="shrink-0 px-4 py-3 lg:px-5 lg:py-5">
          {/* The shop's own name, not the source shop's. The rest of the
              brand is a setting the admin pages do not fetch, so the default
              stands in here; the storefront header reads the stored one. */}
          <Link href="/admin" className="block">
            <span className="block text-sm lg:text-lg font-black text-white">
              {DEFAULT_SETTINGS.brandName}
            </span>
            <span className="hidden lg:block text-[12px] font-semibold text-rose-500">
              Quản trị
            </span>
          </Link>
        </div>

        <nav
          ref={strip}
          className="hide-scrollbar relative min-w-0 flex-1 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible py-2 pr-3 lg:px-3 lg:pt-0 lg:pb-4"
        >
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`${pathname === href ? ACTIVE : INACTIVE} whitespace-nowrap ${PHONE_ORDER[href] ?? ""} lg:order-none`}
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex flex-col gap-2 border-t border-white/[0.06] px-5 py-4">
          <span className="text-[12px] font-semibold text-neutral-600">
            Đăng nhập bởi
          </span>
          <span className="truncate text-[13px] font-semibold text-neutral-300">
            {username}
          </span>
          <Link
            href="/"
            className="mt-1 text-[11px] font-semibold text-neutral-500 hover:text-white transition-colors"
          >
            ← Về trang bán hàng
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-5 lg:px-8 py-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h1 className="text-[24px] font-black leading-tight text-frost sm:text-[30px]">
              {title}
            </h1>
            {subtitle ? <p className="mt-1 text-[13px] text-neutral-500">{subtitle}</p> : null}
          </div>
          {aside}
        </div>
        {children}
      </main>
    </div>
  );
}
