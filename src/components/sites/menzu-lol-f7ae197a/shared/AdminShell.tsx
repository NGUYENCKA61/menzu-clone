"use client";

import {
  Bell,
  Boxes,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  Settings,
  ShoppingBag,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  // Categories live inside the products screen — they are the first step of
  // adding a product, not a separate errand.
  { label: "Sản phẩm", href: "/admin/products", icon: Boxes },
  { label: "Nhóm danh mục", href: "/admin/groups", icon: LayoutGrid },
  { label: "Đơn hàng", href: "/admin/orders", icon: ShoppingBag },
  { label: "Marketing", href: "/admin/marketing", icon: Ticket },
  { label: "Người dùng", href: "/admin/users", icon: Users },
  { label: "Bài viết", href: "/admin/docs", icon: FileText },
  { label: "Vận hành", href: "/admin/operations", icon: MessageSquare },
  { label: "Thông báo", href: "/admin/announcements", icon: Bell },
  { label: "Cấu hình", href: "/admin/settings", icon: Settings },
];

// The active row carries a left rule as well as the tint: on a list this long
// a background alone is easy to lose against the panel it sits on.
const ACTIVE =
  "relative flex items-center gap-3 py-2.5 pl-4 pr-3 rounded-lg text-[13px] font-semibold transition-colors bg-rose-500/[0.08] text-rose-400 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-rose-500";
const INACTIVE =
  "flex items-center gap-3 py-2.5 pl-4 pr-3 rounded-lg text-[13px] font-medium transition-colors text-neutral-400 hover:text-white hover:bg-white/[0.04]";

interface AdminShellProps {
  title: string;
  subtitle: string;
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

  return (
    <div className="min-h-screen bg-[#08080a] text-white lg:flex">
      {/* Full height and flush to the edge on a desktop; above the content and
          scrolling sideways on a phone, where ten items down the side would
          push the dashboard off the bottom of the screen. */}
      <aside className="lg:sticky lg:top-0 lg:h-screen lg:w-[228px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#0a0a0c] flex flex-col">
        <div className="px-5 py-5">
          <Link href="/admin" className="text-lg font-black uppercase tracking-wider">
            <span className="text-white">Men</span>
            <span className="text-rose-500">zu</span>
          </Link>
        </div>

        <nav className="flex-1 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible px-3 pb-4">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`${pathname === href ? ACTIVE : INACTIVE} whitespace-nowrap`}
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex flex-col gap-2 border-t border-white/[0.06] px-5 py-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
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
            <h1 className="text-[26px] font-black uppercase tracking-wide text-white">
              {title}
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">{subtitle}</p>
          </div>
          {aside}
        </div>
        {children}
      </main>
    </div>
  );
}
