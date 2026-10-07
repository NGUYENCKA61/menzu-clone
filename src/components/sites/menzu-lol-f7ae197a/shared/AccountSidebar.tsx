"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LinkPending } from "./LinkPending";
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
// `relative` so the pending wash has something to fill. 12px corners: the
// card's 24px less its 12px padding, so a lit row follows the card's curve
// (the owner, 03/10/2026, the sidebar's sizes "cho đồng bộ" → "làm đi").
const LINK_ACTIVE =
  "relative flex items-center gap-3 py-2.5 px-3 rounded-[12px] text-sm font-bold transition-colors bg-[var(--menzu-accent)]/10 text-white";
const LINK_INACTIVE =
  "relative flex items-center gap-3 py-2.5 px-3 rounded-[12px] text-sm font-bold transition-colors text-neutral-300 hover:text-white hover:bg-white/5";

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
      {/* The account panel's own plate (AccountPanel): solid #111, a 5% rim,
          24px corners, so the two cards of an account page match (the owner,
          03/10/2026: "màu card trái và card phải đồng bộ chưa" → "rồi làm
          đi"). It was neutral-900 at 60%, a 10% rim and 18px. */}
      <nav className="bg-[#111111] border border-white/5 rounded-[24px] p-3">
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
              {/* 10px, the size of every other small label on the account
                  pages; at 9px it was the smallest type on the site. An admin
                  reads in the shop's red, the colour of the ADMIN plate on the
                  overview (the owner, 07/10/2026: "admin cho chữ đỏ đi");
                  everyone else in neutral-400. */}
              <span
                className={`text-[10px] font-black uppercase tracking-widest leading-none ${
                  user.role === "ADMIN" ? "text-[var(--menzu-accent)]" : "text-neutral-400"
                }`}
              >
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
            duplicated a menu two clicks away. In capitals, red, at the rows'
            14px bold (the owner, 03/10/2026, after trying it in its own case:
            "dashboard quản lý chữ in đi"); black weight on top of that had
            outshouted the page's own title. */}
        {isAdmin ? (
          <div className="mb-2 pb-2 border-b border-white/5">
            <Link
              href="/admin"
              className="flex items-center gap-3 py-2.5 px-3 rounded-[12px] text-[var(--menzu-accent)] hover:text-white hover:bg-[var(--menzu-accent)]/10 transition-colors"
            >
              <Shield size={16} className="shrink-0" />
              <span className="text-sm font-bold uppercase tracking-wider">Dashboard quản lý</span>
            </Link>
          </div>
        ) : null}

        {/* The đại lý's own door — same privileged slot as the admin's. */}
        {user?.role === "AGENCY" ? (
          <div className="mb-2 pb-2 border-b border-white/5">
            <Link
              href="/agency/dashboard"
              className="flex items-center gap-3 py-2.5 px-3 rounded-[12px] text-amber-400 hover:text-white hover:bg-amber-500/10 transition-colors"
            >
              <KeyRound size={16} className="shrink-0" />
              <span className="text-sm font-bold uppercase tracking-wider">Bàn đại lý</span>
            </Link>
          </div>
        ) : null}

        {NAV_GROUPS.map((group, index) => (
          <div
            key={group[0]!.href}
            className={index > 0 ? "mt-2 border-t border-white/5 pt-2" : undefined}
          >
            {group.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href;

              // <Link>, as the two privileged rows above already are: a
              // bare anchor here reloaded the whole application on every
              // menu click, ĐANG TẢI curtain and all.
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? LINK_ACTIVE : LINK_INACTIVE}
                >
                  <LinkPending />
                  {/* The lit row's icon in the accent, as the same icon
                      heads the page beside it. */}
                  <Icon
                    size={16}
                    className={isActive ? "text-[var(--menzu-accent)]" : undefined}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
