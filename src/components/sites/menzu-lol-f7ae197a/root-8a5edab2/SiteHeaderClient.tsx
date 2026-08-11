"use client"

import Image from "next/image"
import {
  ChevronDown,
  Crosshair,
  Gem,
  Gift,
  KeyRound,
  Mail,
  Menu,
  Repeat,
  Route,
  ShoppingCart,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { UserMenu, type HeaderUser } from "./UserMenu";
import { useState } from "react"
import { MobileDrawer, type DrawerGroup } from "./MobileDrawer"

interface DropdownItem {
  label: string
  icon: LucideIcon
}

const QUICK_LINKS = ["TIN TỨC", "LIÊN HỆ", "WIKI & HƯỚNG DẪN", "GÓP Ý", "CỘNG ĐỒNG"]

const QUICK_LINK_CLASS =
  "text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"

const VALORANT_HUB_ITEMS: DropdownItem[] = [
  { label: "Crosshair Library", icon: Crosshair },
  { label: "Lineups & Callouts", icon: Route },
  { label: "Tìm Bạn Leo Rank", icon: Users },
]

const CONG_CU_ITEMS: DropdownItem[] = [
  { label: "Check Skin Valorant", icon: Gem },
  { label: "Valorant Build", icon: Wrench },
  { label: "Check Thư Welcome", icon: Mail },
  { label: "Trình Tạo Mã 2FA", icon: KeyRound },
]

const GIAO_DICH_ITEMS: DropdownItem[] = [
  { label: "Thu Cũ Đổi Mới", icon: Repeat },
  { label: "Mua Account", icon: ShoppingCart },
]

const DRAWER_GROUPS: DrawerGroup[] = [
  { label: "VALORANT HUB", items: VALORANT_HUB_ITEMS },
  { label: "CÔNG CỤ", items: CONG_CU_ITEMS },
  { label: "GIAO DỊCH", items: GIAO_DICH_ITEMS },
]

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
  return (
    <div className="relative group h-full flex items-center">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest transition-all text-neutral-400 hover:text-white"
      >
        {label}
        <ChevronDown size={14} />
      </button>
      <div className="absolute top-full left-0 pt-1 transition-all duration-300 z-[110] w-56 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
        <div className="rounded-xl border border-white/10 bg-[#0c0d12]/95 backdrop-blur-xl p-2 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.label}
                href="#"
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group/item"
              >
                <Icon size={14} className="text-neutral-500 shrink-0" />
                <span className="text-[10px] font-bold text-neutral-300 group-hover/item:text-white uppercase tracking-wider">
                  {item.label}
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function SiteHeaderClient({ user }: { user: HeaderUser | null }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300 flex flex-col bg-[#1a1a1a]">
      <div className="flex w-full h-[40px] border-b border-white/5 bg-[#1a1a1a]">
        <div className="max-w-[1320px] w-full mx-auto px-4 lg:px-6 h-full flex items-center justify-between">
          <div className="lg:hidden flex items-center h-full relative">
            <a href="#" className={QUICK_LINK_CLASS}>
              {QUICK_LINKS[0]}
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-5 h-full">
            {QUICK_LINKS.map((link) => (
              <a key={link} href="#" className={QUICK_LINK_CLASS}>
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center text-[9px] tracking-wider select-none h-full text-neutral-500">
            <a href="#" className="hover:text-white/95 transition-colors duration-200 lowercase">
              menzu.lol
            </a>
            <span className="mx-1.5">⇄</span>
            <a href="#" className="hover:text-white/95 transition-colors duration-200 lowercase">
              menzuvalorant.com
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[1320px] w-full mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8 h-full">
          <div className="flex items-center w-auto">
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-1.5 text-neutral-200 hover:text-white transition-colors flex items-center justify-center"
            >
              <Menu size={18} />
            </button>

            <a href="#" className="flex items-center gap-3 group">
              <div className="relative">
                <Image
                  src="/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/logos/menzu-logo.png"
                  alt="Menzu"
                  width={28}
                  height={28}
                  priority
                  className="w-7 h-7 object-contain transition-transform duration-500 group-hover:scale-110"
                />
                <span className="navbar-spin-ring absolute inset-[-2px] rounded-full border border-transparent border-t-red-500 transition-transform duration-1000 group-hover:scale-110 animate-spin-slow" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black italic tracking-tighter text-white">MENZU</span>
                <span className="text-[9px] font-bold tracking-[0.2em] text-red-500 uppercase">Valorant</span>
              </div>
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-5 h-full">
            <NavDropdown label="VALORANT HUB" items={VALORANT_HUB_ITEMS} />
            <NavDropdown label="CÔNG CỤ" items={CONG_CU_ITEMS} />
            <NavDropdown label="GIAO DỊCH" items={GIAO_DICH_ITEMS} />
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
            >
              <Gift size={14} />
              NHẬN ACC FREE
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 h-9 px-3.5 sm:px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors duration-200 border border-purple-500/30 shrink-0"
            >
              <User size={16} />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                Đăng nhập
              </span>
            </a>
          )}
        </div>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={DRAWER_GROUPS}
      />
    </nav>
  )
}
