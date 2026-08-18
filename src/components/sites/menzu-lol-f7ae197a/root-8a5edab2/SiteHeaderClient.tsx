"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ChevronDown,
  CreditCard,
  Crosshair,
  Gift,
  KeyRound,
  Menu,
  Route,
  Smartphone,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  AnnouncementCenter,
  type AnnouncementItem,
} from "../shared/AnnouncementCenter";
import { UserMenu, type HeaderUser } from "./UserMenu";
import { useEffect, useState } from "react"
import { MobileDrawer, type DrawerGroup } from "./MobileDrawer"

interface DropdownItem {
  label: string
  icon: LucideIcon
}

/**
 * Destinations that exist in this clone. Anything absent keeps href="#":
 * /build, /checkskin and the /hub pages were excluded from the clone, so
 * linking to them would 404.
 */
const LINK_HREFS: Record<string, string> = {
  "ĐÁNH GIÁ KHÁCH HÀNG": "/feedback",
  "HỖ TRỢ KHÁCH HÀNG": "/feedback",
  "WIKI & HƯỚNG DẪN": "/docs",
  "GÓP Ý": "/feedback",
  "Nạp Qua ATM + Momo": "/wallet",
  "Nạp Thẻ Điện Thoại": "/wallet",
}

function hrefFor(label: string): string {
  return LINK_HREFS[label] ?? "#"
}

const QUICK_LINKS = ["ĐÁNH GIÁ KHÁCH HÀNG", "HỖ TRỢ KHÁCH HÀNG", "WIKI & HƯỚNG DẪN", "GÓP Ý", "CỘNG ĐỒNG"]

// Nav text sits at neutral-200 rather than the captured neutral-400: at 10-11px
// and letter-spaced, the darker grey on the near-black bar was closer to
// disabled than to a link. Hover still lands on pure white, so the two states
// stay distinguishable.
const QUICK_LINK_CLASS =
  "text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-white transition-colors"

const VALORANT_HUB_ITEMS: DropdownItem[] = [
  { label: "Crosshair Library", icon: Crosshair },
  { label: "Lineups & Callouts", icon: Route },
  { label: "Tìm Bạn Leo Rank", icon: Users },
]

const NAP_TIEN_ITEMS: DropdownItem[] = [
  { label: "Nạp Qua ATM + Momo", icon: CreditCard },
  { label: "Nạp Thẻ Điện Thoại", icon: Smartphone },
]

// Placeholder labels until the shop names the two free offers; both fall to
// "#" through hrefFor until their pages exist.
const HACK_FREE_ITEMS: DropdownItem[] = [
  { label: "Nhận Key Miễn Phí", icon: KeyRound },
  { label: "Sự Kiện Tặng Hack", icon: Gift },
]

const DRAWER_GROUPS: DrawerGroup[] = [
  { label: "HƯỚNG DẪN", items: VALORANT_HUB_ITEMS },
  { label: "NẠP TIỀN", items: NAP_TIEN_ITEMS },
  { label: "HACK FREE MIỄN PHÍ", items: HACK_FREE_ITEMS },
]

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
  return (
    <div className="relative group h-full flex items-center">
      {/* Hover is a colour change and nothing else — no glow, no background,
          no scale. The chevron is drawn with currentColor, so it inherits the
          animated colour and turns with the label rather than needing its own
          rule.

          Keyed to group-hover, not hover: the panel below opens on exactly the
          same condition, so the trigger stays red for as long as the panel is
          open — including once the pointer has left the button and moved down
          into the panel, which is where it spends most of the interaction. */}
      <button
        type="button"
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest text-neutral-200 group-hover:text-[var(--menzu-accent)] transition-colors duration-200 ease-[ease] after:absolute after:bottom-1.5 after:inset-x-3 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--menzu-accent)] after:transition-transform after:duration-200 group-hover:after:scale-x-100"
      >
        {label}
        <ChevronDown size={14} />
      </button>
      <div className="absolute top-full left-0 pt-1 transition-all duration-300 z-[110] w-56 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
        <div className="rounded-xl border border-white/10 bg-[#0c0d12]/95 backdrop-blur-xl p-2 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon
            return (
              // Icon and label rest at different greys, so they cannot share
              // one inherited colour the way the trigger's chevron does — each
              // carries its own rule to arrive at the same red together.
              <a
                key={item.label}
                href={hrefFor(item.label)}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group/item"
              >
                <Icon
                  size={14}
                  className="text-neutral-400 group-hover/item:text-[var(--menzu-accent)] shrink-0 transition-colors duration-200 ease-[ease]"
                />
                <span className="text-[10px] font-bold text-neutral-200 group-hover/item:text-[var(--menzu-accent)] uppercase tracking-wider transition-colors duration-200 ease-[ease]">
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

export interface HeaderBrand {
  name: string;
  logo: string;
}

export function SiteHeaderClient({
  user,
  brand,
  announcements,
}: {
  user: HeaderUser | null;
  brand: HeaderBrand;
  announcements: AnnouncementItem[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // True once the page has scrolled past the top bar. Drives the condensed
  // header: top bar hidden, main row shorter, translucent + blurred, logo
  // nudged down a touch. The header is already position:fixed with a 104px
  // spacer under it, so shrinking it never shifts the page below.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // The logotype's big line is the name's first word; the small line is the
  // shop's tagline, fixed here rather than derived from the rest of the name —
  // the preloader and metadata read brand.name whole, so restyling this tail
  // must never reword them.
  const [brandWord] = brand.name.trim().split(/\s+/);
  const brandTail = "hack là thích";

  return (
    <nav
      className={`site-nav fixed top-0 left-0 right-0 z-[100] transition-all duration-300 flex flex-col ${
        scrolled
          ? "bg-[#1a1a1a]/80 backdrop-blur-xl shadow-lg shadow-black/30"
          : "bg-[#1a1a1a]"
      }`}
    >
      <div
        className={`flex w-full overflow-hidden border-b bg-[#1a1a1a] transition-all duration-300 ${
          scrolled ? "h-0 opacity-0 border-transparent" : "h-[40px] opacity-100 border-white/5"
        }`}
      >
        <div className="max-w-[1320px] w-full mx-auto px-4 lg:px-6 h-full flex items-center justify-between">
          <div className="lg:hidden flex items-center h-full relative">
            <a href={hrefFor(QUICK_LINKS[0])} className={QUICK_LINK_CLASS}>
              {QUICK_LINKS[0]}
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-5 h-full">
            {QUICK_LINKS.map((link) => (
              <a key={link} href={hrefFor(link)} className={QUICK_LINK_CLASS}>
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

      <div
        className={`max-w-[1320px] w-full mx-auto px-4 lg:px-6 flex items-center justify-between transition-all duration-300 ${
          scrolled ? "h-[58px]" : "h-16"
        }`}
      >
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

            <Link
              href="/"
              className={`flex items-center gap-3 group origin-left transition-transform duration-300 ${
                scrolled ? "scale-[0.94]" : "scale-100"
              }`}
            >
              <div className="relative">
                <Image
                  src={brand.logo}
                  alt={brandWord}
                  width={28}
                  height={28}
                  priority
                  className="w-7 h-7 object-contain transition-transform duration-500 group-hover:scale-110"
                />
                <span className="navbar-spin-ring absolute inset-[-2px] rounded-full border border-transparent border-t-red-500 transition-transform duration-1000 group-hover:scale-110 animate-spin-slow" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black italic tracking-tighter text-white">
                  {brandWord}
                </span>
                {brandTail ? (
                  <span className="text-[9px] font-bold tracking-[0.2em] text-red-500 uppercase">
                    {brandTail}
                  </span>
                ) : null}
              </div>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-5 h-full">
            <NavDropdown label="HƯỚNG DẪN" items={VALORANT_HUB_ITEMS} />
            <NavDropdown label="NẠP TIỀN" items={NAP_TIEN_ITEMS} />
            {/* A plain link, per the shop — the status board is one page.
                "#" until that page exists. */}
            <a
              href="#"
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest text-neutral-200 hover:text-[var(--menzu-accent)] transition-colors duration-200 ease-[ease] after:absolute after:bottom-1.5 after:inset-x-3 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--menzu-accent)] after:transition-transform after:duration-200 hover:after:scale-x-100"
            >
              TRẠNG THÁI HACK
            </a>
            <NavDropdown label="HACK FREE MIỄN PHÍ" items={HACK_FREE_ITEMS} />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Renders nothing at all when the shop has no live notice, so a
              header with an empty bell is not the resting state. */}
          <AnnouncementCenter announcements={announcements} />

          {user ? (
            <UserMenu user={user} />
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 h-9 px-3.5 sm:px-4 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors duration-200 border border-purple-500/30 shrink-0"
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
