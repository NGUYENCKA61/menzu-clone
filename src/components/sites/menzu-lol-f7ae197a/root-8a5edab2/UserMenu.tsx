"use client";

import {
  ArrowLeftRight,
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
      <a
        href="#"
        className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
        aria-label="Thông báo"
      >
        <Bell size={16} />
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-[#0a0a0d]">
          0
        </span>
      </a>

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
          <div className="absolute right-0 top-[calc(100%+4px)] w-[280px] bg-[#111111] rounded-xl shadow-none border border-white/10 z-[100] overflow-hidden">
            <div className="p-4 border-b border-white/5 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{user.username}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                    isAdmin
                      ? "bg-indigo-500/15 border border-indigo-500/40 text-indigo-300"
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
                <div className="mb-1 pb-1 border-b border-white/5">
                  <a
                    href="/admin"
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-500/10 transition-colors"
                  >
                    <Shield size={14} className="shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Dashboard quản lý
                    </span>
                  </a>
                </div>
              ) : null}

              {ITEMS.map(({ label, href, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Icon size={14} className="text-neutral-500 shrink-0" />
                  <span className="text-[11px] font-bold">{label}</span>
                </a>
              ))}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 py-2.5 px-2 mt-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/5"
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
