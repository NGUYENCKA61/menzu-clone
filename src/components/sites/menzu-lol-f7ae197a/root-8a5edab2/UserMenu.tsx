"use client";

import {
  History,
  LayoutGrid,
  LogOut,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
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

/**
 * The live menu rules its links into three groups rather than listing six in a
 * row: where you are, what touches money, and the account itself.
 */
const GROUPS: { label: string; href: string; icon: LucideIcon }[][] = [
  [{ label: "Tổng quan", href: "/profile", icon: LayoutGrid }],
  [
    { label: "Nạp tiền", href: "/wallet", icon: Wallet },
    { label: "Lịch sử giao dịch", href: "/transactions", icon: History },
    { label: "Lịch sử mua", href: "/orders", icon: ShoppingBag },
    { label: "Đơn dịch vụ", href: "/service-orders", icon: Sparkles },
  ],
  [{ label: "Bảo mật", href: "/security", icon: ShieldCheck }],
];

/** A group of links and the rule above it. */
const GROUP = "border-t border-white/[0.07] py-1.5";
/** px-2 inside a px-2 list: content starts 16px in, level with the avatar
 *  above it and with the rows of the notification panel. */
const ROW = "relative flex w-full items-center gap-3.5 rounded-lg px-2 py-3 transition-colors";
/** ĐĂNG XUẤT and the admin link: same row, shouted. */
const SHOUT = "text-[13px] font-black uppercase tracking-[0.12em]";

const AVATARS = {
  sm: { px: 28, frame: "h-7 w-7 rounded-[9px]", letter: "text-[11px]" },
  lg: { px: 44, frame: "h-11 w-11 rounded-full", letter: "text-[16px]" },
} as const;

/** The picture where there is one, the initial where there is not. */
function Avatar({ user, size }: { user: HeaderUser; size: keyof typeof AVATARS }) {
  const { px, frame, letter } = AVATARS[size];
  const shell = `${frame} shrink-0 overflow-hidden border border-white/10 bg-black/40`;

  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt=""
        width={px}
        height={px}
        className={`${shell} object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${shell} flex items-center justify-center ${letter} font-black uppercase text-neutral-400`}
    >
      {user.username.slice(0, 1)}
    </span>
  );
}

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
          // h-9, which is the bell beside it and the Đăng nhập button this
          // replaces when signed out. It stood 6px taller than both, and a
          // taller trigger drops its panel 6px lower than the bell's.
          className="flex h-9 items-center gap-2 sm:gap-2.5 px-1 sm:px-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-colors"
        >
          {/* The captured markup left this box empty, so the trigger showed a
              black square where every signed-in header shows a face. */}
          <Avatar user={user} size="sm" />
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
          // Same width and same top edge as the notification panel, so the
          // two line up rather than stepping when both are open.
          <div className="absolute right-0 top-11 z-[100] w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#12141c] shadow-2xl">
            {/* Who you are: the face, the name, and the two pills the live
                menu sets under it rather than beside it — the name gets the
                full width that way, however long it runs. */}
            <div className="flex items-center gap-3 px-4 pt-4">
              <Avatar user={user} size="lg" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="truncate text-[15px] font-bold leading-none text-white">
                  {user.username}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-1 text-[10px] font-black uppercase leading-none tracking-widest ${
                      isAdmin
                        ? "bg-[var(--menzu-accent)] text-white"
                        : "bg-gradient-to-r from-[#7b3fe4] to-[#9354ff] text-white"
                    }`}
                  >
                    {isAdmin ? "ADMIN" : "MEMBER"}
                  </span>
                  {user.uid !== undefined ? (
                    <span className="rounded bg-white/[0.07] px-1.5 py-1 text-[10px] font-bold leading-none text-neutral-400">
                      UID: {user.uid}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* No balance card here: the trigger just above already carries
                the figure in green, and repeating it two lines lower said the
                same thing twice. */}
            <div className="px-2 pb-2 pt-4">
              {/* Admins only, and a single link: the admin area carries its
                  own sidebar, so listing every screen here duplicated a menu
                  one click away. */}
              {isAdmin ? (
                <div className={GROUP}>
                  <a
                    href="/admin"
                    className={`${ROW} text-[var(--menzu-accent)] hover:bg-[var(--menzu-accent)]/10`}
                  >
                    <Shield size={18} className="shrink-0" />
                    <span className={SHOUT}>Dashboard</span>
                  </a>
                </div>
              ) : null}

              {GROUPS.map((group) => (
                <div key={group[0]!.href} className={GROUP}>
                  {group.map(({ label, href, icon: Icon }) => {
                    // The page the reader is already on. Marked rather than
                    // left looking like every other row, which is the one
                    // thing a menu of six links can tell you for free.
                    const active = pathname === href;
                    return (
                      <a
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={`${ROW} ${
                          active
                            ? "bg-[var(--menzu-accent)]/[0.08] text-white before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[2px] before:rounded-full before:bg-[var(--menzu-accent)]"
                            : "text-neutral-200 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={`shrink-0 ${active ? "text-[var(--menzu-accent)]" : "text-neutral-400"}`}
                        />
                        <span className="text-[14px] font-medium">{label}</span>
                      </a>
                    );
                  })}
                </div>
              ))}

              <div className={GROUP}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${ROW} text-[var(--menzu-accent)] hover:bg-[var(--menzu-accent)]/10`}
                >
                  <LogOut size={18} className="shrink-0" />
                  <span className={SHOUT}>Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
