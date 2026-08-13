"use client";

import {
  ArrowLeftRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface HeaderUser {
  username: string;
  balance: number;
  avatarUrl: string | null;
  uid?: number;
  /** "ADMIN" swaps the badge and adds the Dashboard link to the menu. */
  role?: string;
}

const ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Tổng quan", href: "/profile", icon: LayoutDashboard },
  { label: "Nạp tiền", href: "/wallet", icon: Wallet },
  { label: "Lịch sử giao dịch", href: "/transactions", icon: ArrowLeftRight },
  { label: "Lịch sử mua", href: "/orders", icon: ShoppingBag },
  { label: "Đơn dịch vụ", href: "/service-orders", icon: ClipboardList },
  { label: "Bảo mật", href: "/security", icon: ShieldCheck },
];

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Signed-in header cluster: notification bell plus the avatar dropdown.
 * Mirrors the live menu — the same six account links and ĐĂNG XUẤT, over a
 * header block showing username, role, UID and balance.
 */
export function UserMenu({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const isAdmin = user.role === "ADMIN";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.refresh();
    router.push("/");
  }

  return (
    <>
      {/* A second bell used to sit here, from the captured markup: an anchor
          to "#" with a badge hard-coded to 0. It went nowhere and counted
          nothing. The one in the header beside it is the real one — it lists
          the shop's announcements — and two bells side by side asked the
          visitor to guess which. */}
      <div className="relative" ref={wrapper}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 sm:gap-2.5 p-1 sm:px-2 sm:py-1.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-colors"
        >
          <span className="h-7 w-7 rounded-[9px] overflow-hidden bg-black/50 shrink-0 relative z-10 border border-white/10 block" />
          <span className="hidden sm:flex flex-col justify-center relative z-10 text-left">
            <span className="text-[11px] font-bold text-white leading-none truncate mb-[4px]">
              {user.username}
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest leading-none truncate text-emerald-400">
              {formatVnd(user.balance)}đ
            </span>
          </span>
        </button>

        {open ? (
          <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#12141c] shadow-2xl">
            <div className="flex flex-col gap-1 border-b border-white/[0.07] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">{user.username}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                    isAdmin
                      ? "bg-[var(--menzu-accent)]/15 border border-[var(--menzu-accent)]/40 text-[var(--menzu-accent)]"
                      : "bg-white/10 border border-white/15 text-neutral-300"
                  }`}
                >
                  {isAdmin ? "ADMIN" : "MEMBER"}
                </span>
              </div>
              {user.uid !== undefined ? (
                <span className="text-[10px] text-neutral-500 font-semibold">
                  UID: {user.uid}
                </span>
              ) : null}
              <span className="text-[10px] font-semibold text-neutral-500">
                Số dư{" "}
                <span className="text-emerald-400 font-black">
                  {formatVnd(user.balance)}đ
                </span>
              </span>
            </div>

            <div className="p-2">
              {/* Admins only, and a single link: the admin area carries its
                  own sidebar, so listing every screen here duplicated a menu
                  one click away. */}
              {isAdmin ? (
                <div className="mb-1 pb-1 border-b border-white/[0.07]">
                  <a
                    href="/admin"
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg text-[var(--menzu-accent)] hover:text-white hover:bg-[var(--menzu-accent)]/10 transition-colors"
                  >
                    <Shield size={14} className="shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Dashboard quản lý
                    </span>
                  </a>
                </div>
              ) : null}

              {ITEMS.map(({ label, href, icon: Icon }) => {
                // The page the reader is already on. Marked rather than left
                // looking like every other row, which is the one thing a menu
                // of six links can tell you for free.
                const active = pathname === href;
                return (
                  <a
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 py-2.5 pl-3 pr-2 rounded-lg transition-colors ${
                      active
                        ? "bg-[var(--menzu-accent)]/[0.08] text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-[var(--menzu-accent)]"
                        : "text-neutral-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={`shrink-0 ${active ? "text-[var(--menzu-accent)]" : "text-neutral-500"}`}
                    />
                    <span className="text-[11px] font-bold">{label}</span>
                  </a>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 py-2.5 px-2 mt-1 rounded-lg text-[var(--menzu-accent)] hover:bg-[var(--menzu-accent)]/10 transition-colors border-t border-white/[0.07]"
              >
                <LogOut size={14} className="shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-widest">
                  ĐĂNG XUẤT
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
