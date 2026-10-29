"use client";

import {
  ArrowUpRight,
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
  Store,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { AdminThemeSwitch, AdminThemeSwitchIcon } from "./AdminThemeSwitch";
import { avatarTone, initials } from "./format";

/**
 * The shop admin's frame, rebuilt white on 30/10/2026 (the owner: "đập đi
 * xây lại cái giao diện dashboard admin sao nó chuyên nghiệp như cái crm").
 * The same language as the CRM's frame — white sidebar, zinc ink, red only
 * as a signal — but its own file: the CRM folder is built to leave for its
 * own VPS one day, so nothing here imports from it.
 *
 * Same props as the old dark AdminShell, so a screen moves over by swapping
 * one import.
 */
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

// On a phone the strip shows three links at a time; the two the owner opens
// every day come straight after the overview. The desktop column keeps its
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

interface AdminChromeProps {
  title: string;
  subtitle?: string;
  username: string;
  /** Optional note on the far side of the heading — a count, a timeframe. */
  aside?: ReactNode;
  children: ReactNode;
}

export function AdminChrome({
  title,
  subtitle,
  username,
  aside,
  children,
}: AdminChromeProps) {
  const pathname = usePathname();
  const strip = useRef<HTMLElement>(null);

  // A screen deeper in a section lights its section's link; "/admin" alone
  // would light on every one of them, so it asks for an exact match.
  const active = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  // The phone strip opens on the page you are on: thirteen links scroll
  // sideways and the lit one may be off the right edge. It moves only when it
  // has to, and only the strip moves — scrollIntoView would drag the page.
  useEffect(() => {
    const nav = strip.current;
    const lit = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !lit) return;
    const left = lit.offsetLeft;
    const right = left + lit.offsetWidth;
    if (left >= nav.scrollLeft && right <= nav.scrollLeft + nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, left - 12);
  }, [pathname]);

  return (
    <div
      className="admin-app flex min-h-dvh flex-col bg-[#f6f6f7] text-zinc-900 lg:flex-row"
      style={{ colorScheme: "light" }}
    >
      {/* ----- desktop sidebar ----- */}
      <aside className="sticky top-0 z-30 hidden h-dvh w-[232px] shrink-0 flex-col self-start border-r border-zinc-200 bg-white lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-4 pb-5 pt-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Store size={17} />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-black tracking-wide">THICHTHIHACK</span>
            <span className="block text-[11px] font-semibold text-zinc-500">Quản trị shop</span>
          </span>
        </Link>

        <nav className="hide-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition-colors ${
                active(href)
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <Icon size={16} className={`shrink-0 ${active(href) ? "text-zinc-900" : "text-zinc-400"}`} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-4">
          <AdminThemeSwitch />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Về trang bán hàng
            <ArrowUpRight size={13} />
          </Link>
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${avatarTone(username)}`}
            >
              {initials(username)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{username}</span>
              <span className="block text-[11px] text-zinc-500">Quản trị viên</span>
            </span>
          </div>
        </div>
      </aside>

      {/* ----- phone top bar: brand row, then the links as tabs ----- */}
      <header className="sticky top-0 z-30 flex flex-col border-b border-zinc-200 bg-white lg:hidden">
        <div className="flex h-12 items-center gap-2.5 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Store size={15} />
          </span>
          <span className="text-[13px] font-black tracking-wide">
            THICHTHIHACK <span className="font-semibold text-zinc-500">· Quản trị</span>
          </span>
          <span className="ml-auto flex items-center gap-2">
            <AdminThemeSwitchIcon />
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${avatarTone(username)}`}
            >
              {initials(username)}
            </span>
          </span>
        </div>
        <nav ref={strip} className="hide-scrollbar flex overflow-x-auto px-2">
          {NAV.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 pb-2 pt-1 text-[13px] font-semibold ${
                PHONE_ORDER[href] ?? ""
              } ${
                active(href)
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ----- content ----- */}
      <main className="min-w-0 flex-1 px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <div className="mx-auto w-full max-w-[1160px]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h1 className="text-[22px] font-black leading-tight sm:text-[26px]">{title}</h1>
              {subtitle ? <p className="mt-1 text-[13px] text-zinc-500">{subtitle}</p> : null}
            </div>
            {aside}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
