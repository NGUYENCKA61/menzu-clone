"use client";

import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ClipboardList,
  LayoutDashboard,
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
export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:block w-full lg:w-[280px] shrink-0 sticky top-[88px]">
      <nav className="bg-neutral-900/60 border border-white/10 rounded-2xl p-3">
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
