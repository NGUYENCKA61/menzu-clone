"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";

interface AccountNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Admin destinations, mirroring AdminShell's sidebar. */
const ADMIN_ITEMS: { label: string; href: string }[] = [
  { label: "Tổng quan hệ thống", href: "/admin" },
  { label: "Sản phẩm", href: "/admin/products" },
  { label: "Đơn hàng", href: "/admin/orders" },
  { label: "Marketing", href: "/admin/marketing" },
  { label: "Thu cũ đổi mới", href: "/admin/trade" },
  { label: "Người dùng", href: "/admin/users" },
  { label: "Bài viết", href: "/admin/docs" },
  { label: "Vận hành", href: "/admin/operations" },
];

const NAV_ITEMS: AccountNavItem[] = [
  { label: "Tổng quan", href: "/profile", icon: LayoutDashboard },
  { label: "Nạp tiền", href: "/wallet", icon: Wallet },
  { label: "Lịch sử giao dịch", href: "/transactions", icon: ArrowLeftRight },
  { label: "Lịch sử mua", href: "/orders", icon: ShoppingBag },
  { label: "Đơn dịch vụ", href: "/service-orders", icon: ClipboardList },
  { label: "Bảo mật", href: "/security", icon: ShieldCheck },
];

// Tailwind can't see dynamically-composed class names, so the link's active
// and inactive states are always emitted as complete literal strings.
const LINK_ACTIVE =
  "flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors bg-[#7C3AED]/15 text-[#a78bfa]";
const LINK_INACTIVE =
  "flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors text-neutral-300 hover:text-white hover:bg-white/5";

/**
 * Authenticated account sidebar navigation. The live /profile "tab bar" is
 * actually six separate routes rather than client-side tabs, so this renders
 * plain links and highlights whichever one matches the current pathname.
 */
export function AccountSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="hidden lg:block w-full lg:w-[280px] shrink-0 sticky top-[88px]">
      <nav className="bg-neutral-900/60 border border-white/10 rounded-2xl p-3">
        {/* Above the account links, and collapsed by default: it is a place to
            go on purpose, not something to hit while reaching for Tổng quan. */}
        {isAdmin ? (
          <div className="mb-2 pb-2 border-b border-white/5">
            <button
              type="button"
              onClick={() => setAdminOpen((value) => !value)}
              aria-expanded={adminOpen}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-500/10 transition-colors"
            >
              <Shield size={16} className="shrink-0" />
              <span className="text-sm font-black uppercase tracking-wider">
                Dashboard quản lý
              </span>
              <ChevronDown
                size={14}
                className={`ml-auto transition-transform ${adminOpen ? "rotate-180" : ""}`}
              />
            </button>

            {adminOpen ? (
              <div className="pl-4 mt-1">
                {ADMIN_ITEMS.map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    aria-current={pathname === href ? "page" : undefined}
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
                      pathname === href
                        ? "bg-[#7C3AED]/15 text-[#a78bfa]"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="w-1 h-1 rounded-full bg-indigo-400/60 shrink-0" />
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <a
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? LINK_ACTIVE : LINK_INACTIVE}
            >
              <Icon size={16} />
              {label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
