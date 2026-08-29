"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronsUp,
  Gift,
  Handshake,
  KeyRound,
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

/** What the header block needs to draw the signed-in visitor. */
export interface SidebarUser {
  username: string;
  avatarUrl: string | null;
  role: string;
}

// Grouped the way the captured menzu sidebar rules its rows: the everyday
// screens together, Bảo mật alone under a hairline. The partner pair is this
// shop's own addition, kept below Bảo mật on the user's instruction.
const NAV_GROUPS: AccountNavItem[][] = [
  [
    { label: "Tổng quan", href: "/profile", icon: LayoutDashboard },
    { label: "Nạp tiền", href: "/wallet", icon: Wallet },
    { label: "Lịch sử giao dịch", href: "/transactions", icon: ArrowLeftRight },
    { label: "Lịch sử mua", href: "/orders", icon: ShoppingBag },
    { label: "Vòng quay đổi thưởng", href: "/vong-quay", icon: Gift },
  ],
  [{ label: "Bảo mật", href: "/security", icon: ShieldCheck }],
  [
    { label: "Cộng tác viên", href: "/affiliate", icon: Handshake },
    { label: "Nâng cấp đại lý", href: "/agency", icon: ChevronsUp },
  ],
];

// Tailwind can't see dynamically-composed class names, so the link's active
// and inactive states are always emitted as complete literal strings.
const LINK_ACTIVE =
  "flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors bg-[var(--menzu-accent)]/10 text-white";
const LINK_INACTIVE =
  "flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors text-neutral-300 hover:text-white hover:bg-white/5";

/**
 * Authenticated account sidebar navigation. The live /profile "tab bar" is
 * actually separate routes rather than client-side tabs, so this renders
 * plain links and highlights whichever one matches the current pathname.
 */
export function AccountSidebar({
  isAdmin = false,
  user = null,
}: {
  isAdmin?: boolean;
  user?: SidebarUser | null;
}) {
  const pathname = usePathname();

  return (
    <div className="hidden lg:block w-full lg:w-[280px] shrink-0 sticky top-[88px]">
      <nav className="bg-neutral-900/60 border border-white/10 rounded-2xl p-3">
        {/* The face on top, as the captured sidebar has it: avatar, name, and
            the role in a whisper underneath. */}
        {user ? (
          <div className="mb-2 flex items-center gap-3 border-b border-white/5 px-3 pb-4 pt-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/40">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="text-sm font-black uppercase text-neutral-400"
                >
                  {user.username.slice(0, 1)}
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="truncate text-sm font-bold leading-none text-white">
                {user.username}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none text-neutral-500">
                {user.role === "ADMIN"
                  ? "Admin"
                  : user.role === "AGENCY"
                    ? "Đại lý"
                    : "Member"}
              </span>
            </span>
          </div>
        ) : null}

        {/* A single link above the account items. The admin area has its own
            sidebar once you are inside it, so listing all eight screens here
            duplicated a menu two clicks away. */}
        {isAdmin ? (
          <div className="mb-2 pb-2 border-b border-white/5">
            <a
              href="/admin"
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-[var(--menzu-accent)] hover:text-white hover:bg-[var(--menzu-accent)]/10 transition-colors"
            >
              <Shield size={16} className="shrink-0" />
              <span className="text-sm font-black uppercase tracking-wider">
                Dashboard quản lý
              </span>
            </a>
          </div>
        ) : null}

        {/* The đại lý's own door — same privileged slot as the admin's. */}
        {user?.role === "AGENCY" ? (
          <div className="mb-2 pb-2 border-b border-white/5">
            <a
              href="/agency/dashboard"
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/10 transition-colors"
            >
              <KeyRound size={16} className="shrink-0" />
              <span className="text-sm font-black uppercase tracking-wider">
                Bàn đại lý
              </span>
            </a>
          </div>
        ) : null}

        {NAV_GROUPS.map((group, index) => (
          <div
            key={group[0]!.href}
            className={index > 0 ? "mt-2 border-t border-white/5 pt-2" : undefined}
          >
            {group.map(({ label, href, icon: Icon }) => {
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
          </div>
        ))}
      </nav>
    </div>
  );
}
