"use client";

import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Headset,
  Inbox,
  Megaphone,
  Plug,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { avatarTone, initials } from "./format";

/**
 * The CRM's own frame (29/10/2026): white, its own sidebar, none of the
 * shop's chrome. The owner plans to lift this app onto its own VPS one day,
 * so the frame talks to the shop only the way the screens do — JSON under
 * /api/admin/crm — and nothing in here imports the storefront's components.
 *
 * Desktop: a fixed 216px sidebar and a full-height content column, the
 * layout every working CRM (HubSpot, Pipedrive, Freshworks) settled on.
 * Phone: a compact top bar with the same two destinations as tabs.
 */
const NAV = [
  { label: "Hộp thư", href: "/crm", icon: Inbox },
  { label: "Khách hàng", href: "/crm/khach", icon: Users },
  { label: "Sổ tay bot", href: "/crm/so-tay", icon: BookOpen },
  { label: "Báo cáo", href: "/crm/bao-cao", icon: BarChart3 },
  { label: "Đăng bài", href: "/crm/dang-bai", icon: Megaphone },
  { label: "Kết nối", href: "/crm/ket-noi", icon: Plug },
];

export function CrmShell({
  adminUsername,
  children,
}: {
  adminUsername: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/crm" ? pathname === "/crm" : pathname.startsWith(href);

  return (
    <div
      className="flex min-h-dvh flex-col bg-[#f6f6f7] text-zinc-900 lg:h-dvh lg:flex-row lg:overflow-hidden"
      style={{ colorScheme: "light" }}
    >
      {/* ----- desktop sidebar ----- */}
      <aside className="hidden w-[216px] shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white">
            <Headset size={17} />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-black tracking-wide">THICHTHIHACK</span>
            <span className="block text-[11px] font-semibold text-zinc-500">
              CRM chăm sóc khách
            </span>
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition-colors ${
                active(href)
                  ? "bg-red-50 text-red-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <Icon size={16} className={active(href) ? "text-red-600" : "text-zinc-400"} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-zinc-200 px-4 py-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Trang quản trị shop
            <ArrowUpRight size={13} />
          </Link>
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${avatarTone(adminUsername)}`}
            >
              {initials(adminUsername)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{adminUsername}</span>
              <span className="block text-[11px] text-zinc-500">Quản trị viên</span>
            </span>
          </div>
        </div>
      </aside>

      {/* ----- phone top bar ----- */}
      <header className="flex flex-col border-b border-zinc-200 bg-white lg:hidden">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
            <Headset size={15} />
          </span>
          <span className="text-[13px] font-black tracking-wide">THICHTHIHACK CRM</span>
          <span
            className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${avatarTone(adminUsername)}`}
          >
            {initials(adminUsername)}
          </span>
        </div>
        <nav className="hide-scrollbar flex gap-1 overflow-x-auto px-2">
          {NAV.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 pb-2 pt-1 text-[13px] font-semibold ${
                active(href)
                  ? "border-red-600 text-red-700"
                  : "border-transparent text-zinc-500"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
