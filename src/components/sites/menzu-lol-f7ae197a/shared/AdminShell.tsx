"use client";

import {
  Boxes,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShoppingBag,
  Repeat,
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
  { label: "Đơn hàng", href: "/admin/orders", icon: ShoppingBag },
  { label: "Marketing", href: "/admin/marketing", icon: Ticket },
  { label: "Thu cũ đổi mới", href: "/admin/trade", icon: Repeat },
  { label: "Người dùng", href: "/admin/users", icon: Users },
  { label: "Bài viết", href: "/admin/docs", icon: FileText },
  { label: "Vận hành", href: "/admin/operations", icon: MessageSquare },
  { label: "Cấu hình", href: "/admin/settings", icon: Settings },
];

const ACTIVE = "flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors bg-[var(--brand)]/15 text-[#a78bfa]";
const INACTIVE = "flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors text-neutral-300 hover:text-white hover:bg-white/5";

interface AdminShellProps {
  title: string;
  subtitle: string;
  username: string;
  children: ReactNode;
}

/**
 * Admin chrome. Deliberately plain rather than a clone of the storefront —
 * this area does not exist on menzu.lol, so dressing it up in the site's
 * styling would blur the line between what was cloned and what was added.
 */
export function AdminShell({ title, subtitle, username, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-[#050508] text-white">
      <header className="border-b border-white/10 bg-[#0d0d12]">
        <div className="max-w-[1320px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black uppercase tracking-widest text-white">
              Menzu Admin
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[var(--brand)]/20 border border-[var(--brand)]/40 text-[9px] font-black uppercase tracking-widest text-[#a78bfa]">
              {username}
            </span>
          </div>
          <Link
            href="/"
            className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            Về trang bán hàng
          </Link>
        </div>
      </header>

      <div className="flex-1 w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <aside className="w-full lg:w-[240px] shrink-0">
            <nav className="rounded-2xl border border-white/10 bg-neutral-900/60 p-3 flex flex-col gap-1">
              {NAV.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={pathname === href ? ACTIVE : INACTIVE}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="flex-1 w-full min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                {title}
              </h1>
              <p className="text-sm text-neutral-400 mt-1.5">{subtitle}</p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
