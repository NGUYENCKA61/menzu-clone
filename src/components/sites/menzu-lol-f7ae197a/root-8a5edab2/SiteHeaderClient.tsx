"use client"

import Image from "next/image"
import Link from "next/link"
import {
  Activity,
  AppWindow,
  BookOpen,
  ChevronDown,
  Cpu,
  CreditCard,
  Gift,
  KeyRound,
  Menu,
  Send,
  Smartphone,
  Star,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  AnnouncementCenter,
  type AnnouncementItem,
  type StatusEventItem,
} from "../shared/AnnouncementCenter";
import { STATUS_TAB_HREF } from "@/lib/softwareStatus";
import { CartButton } from "./CartButton";
import { HeaderSearch } from "./HeaderSearch"
import { SiteLink } from "../shared/SiteLink";
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
  "ĐÁNH GIÁ": "/feedback",
  "XEM TRẠNG THÁI": STATUS_TAB_HREF,
  "WIKI & HƯỚNG DẪN": "/docs",
  "Nạp Qua ATM + Momo": "/wallet",
  "Nạp Thẻ Điện Thoại": "/wallet",
}

function hrefFor(label: string): string {
  return LINK_HREFS[label] ?? "#"
}

/**
 * The one strip link whose address is not a page here but the shop's
 * Telegram bot, read from Cấu hình at render time; left out entirely while
 * no bot is configured, since a dead link sells nothing.
 */
const TELEGRAM_SHOP_LINK = "MUA TRÊN TELEGRAM"

// "GÓP Ý" used to sit fourth and went to the same page as "ĐÁNH GIÁ"; the
// reviews took its slot and the Telegram shop took the front.
const QUICK_LINKS = [
  TELEGRAM_SHOP_LINK,
  "XEM TRẠNG THÁI",
  "WIKI & HƯỚNG DẪN",
  "ĐÁNH GIÁ",
  "CỘNG ĐỒNG",
]

// Nav text sits at neutral-200 rather than the captured neutral-400: at 10-11px
// and letter-spaced, the darker grey on the near-black bar was closer to
// disabled than to a link. Hover still lands on pure white, so the two states
// stay distinguishable.
const QUICK_LINK_CLASS =
  "text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-white transition-colors"

// A rung of the main bar that opens a page rather than a panel. Written once
// because there are two of them now, and a nav where one rung underlines on
// hover and its neighbour does not reads as a bug rather than as a variant.
const NAV_LINK_CLASS =
  "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-widest text-neutral-200 hover:text-[var(--menzu-accent)] transition-colors duration-200 ease-[ease] after:absolute after:bottom-1.5 after:inset-x-3 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--menzu-accent)] after:transition-transform after:duration-200 hover:after:scale-x-100"

// The two ways the shop sells a hack: a board you plug in, and a file you run.
// Labels only for now — neither has a page in this clone, so both fall to "#"
// through hrefFor, the same as the SHOP ACC pair.
const HACK_CATEGORY_ITEMS: DropdownItem[] = [
  { label: "HACK DMA & MẠCH CỨNG", icon: Cpu },
  { label: "HACK PHẦN MỀM", icon: AppWindow },
]

const NAP_TIEN_ITEMS: DropdownItem[] = [
  { label: "Nạp Qua ATM + Momo", icon: CreditCard },
  { label: "Nạp Thẻ Điện Thoại", icon: Smartphone },
]

// Placeholder labels, left from when this menu was "HACK FREE MIỄN PHÍ": the
// shop has not said what hangs under SHOP ACC yet, and there is no account
// category with anything in it to hang there. Both fall to "#" through
// hrefFor until their pages exist.
const SHOP_ACC_ITEMS: DropdownItem[] = [
  { label: "Nhận Key Miễn Phí", icon: KeyRound },
  { label: "Sự Kiện Tặng Hack", icon: Gift },
]

/**
 * The strip's five links, as drawer rows. On a phone the strip is gone (the
 * bottom bar took its place and its height), and these are the only links
 * on it that the bottom bar does not carry, so the menu carries them.
 */
const QUICK_LINK_ITEMS: DropdownItem[] = [
  { label: TELEGRAM_SHOP_LINK, icon: Send },
  { label: "XEM TRẠNG THÁI", icon: Activity },
  { label: "WIKI & HƯỚNG DẪN", icon: BookOpen },
  { label: "ĐÁNH GIÁ", icon: Star },
  { label: "CỘNG ĐỒNG", icon: Users },
]

// Each row goes where its desktop twin goes: the same label lookup, so a
// destination added for the dropdowns reaches the drawer in the same edit.
// Built per render rather than once, because one address (the Telegram
// shop) comes from settings the component is handed.
function drawerGroupsFor(
  linkFor: (label: string) => string,
  telegramShop: boolean,
): DrawerGroup[] {
  const withHrefs = (items: DropdownItem[]) =>
    items
      .filter((item) => telegramShop || item.label !== TELEGRAM_SHOP_LINK)
      .map((item) => ({ ...item, href: linkFor(item.label) }))
  return [
    { label: "CÁC LOẠI HACK", items: withHrefs(HACK_CATEGORY_ITEMS) },
    { label: "NẠP TIỀN", items: withHrefs(NAP_TIEN_ITEMS) },
    { label: "SHOP ACC", items: withHrefs(SHOP_ACC_ITEMS) },
    { label: "LIÊN KẾT NHANH", items: withHrefs(QUICK_LINK_ITEMS) },
  ]
}

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
              <SiteLink
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
              </SiteLink>
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
  statusEvents,
  cartCount,
  telegramShopUrl,
}: {
  user: HeaderUser | null;
  brand: HeaderBrand;
  announcements: AnnouncementItem[];
  /** Status changes of the tools this reader follows; empty for a guest. */
  statusEvents: StatusEventItem[];
  /** Lines waiting in the basket; 0 for a guest. */
  cartCount: number;
  /** t.me link of the shop bot, or null while Cấu hình has no bot. */
  telegramShopUrl: string | null;
}) {
  const linkFor = (label: string) =>
    label === TELEGRAM_SHOP_LINK ? (telegramShopUrl ?? "#") : hrefFor(label)
  const quickLinks = QUICK_LINKS.filter(
    (link) => link !== TELEGRAM_SHOP_LINK || telegramShopUrl !== null,
  )
  const drawerGroups = drawerGroupsFor(linkFor, telegramShopUrl !== null)
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
      {/* Not on a phone: the bottom bar holds the first-rank links there,
          and the strip's own five sit in the menu under LIÊN KẾT NHANH, so
          this row would only push the page down 40px for a second copy. */}
      <div
        className={`hidden w-full overflow-hidden border-b bg-[#1a1a1a] transition-all duration-300 sm:flex ${
          scrolled ? "h-0 opacity-0 border-transparent" : "h-[40px] opacity-100 border-white/5"
        }`}
      >
        <div className="max-w-[1320px] w-full mx-auto px-4 lg:px-6 h-full flex items-center justify-between">
          {/* On a phone the strip used to show the first link alone, as the
              captured site did; the shop read that as the rest being lost.
              All five, in a row that scrolls sideways under the thumb. */}
          <div className="lg:hidden flex h-full min-w-0 items-center gap-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickLinks.map((link) => (
              <SiteLink key={link} href={linkFor(link)} className={QUICK_LINK_CLASS}>
                {link}
              </SiteLink>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-5 h-full">
            {quickLinks.map((link) => (
              <SiteLink key={link} href={linkFor(link)} className={QUICK_LINK_CLASS}>
                {link}
              </SiteLink>
            ))}
          </div>

          {/* The strip's right end used to advertise menzu.lol ⇄
              menzuvalorant.com — the captured shop's two domains, both on
              href="#" here. Gone: this shop has one address, and it is in the
              logo. */}
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
            <NavDropdown label="CÁC LOẠI HACK" items={HACK_CATEGORY_ITEMS} />
            <NavDropdown label="NẠP TIỀN" items={NAP_TIEN_ITEMS} />
            <NavDropdown label="SHOP ACC" items={SHOP_ACC_ITEMS} />

            {/* Signed in only: the wheel spends the points an account has, and
                /vong-quay bounces a signed-out visitor to the login page. A rung
                that always ends in a redirect is a rung that lies about what it
                does, so it is drawn only once it leads somewhere.

                Last in the row on purpose — appearing here leaves the four
                rungs the shop knows exactly where they were before signing in,
                rather than shuffling them along by one. */}
            {user ? (
              <Link href="/vong-quay" className={NAV_LINK_CLASS}>
                ĐỔI THƯỞNG
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Renders nothing at all when the shop has no live notice, so a
              header with an empty bell is not the resting state. */}
          {/* Basket and bell read as one cluster of icon buttons — they are
              the same kind of control, so they sit tight against each other
              and keep the wider gap for the account button beside them. */}
          <div className="flex items-center gap-1.5">
            {/* Left of the basket: a box on a desktop, a button on a phone. */}
            <HeaderSearch />
            <CartButton count={cartCount} />
            <AnnouncementCenter announcements={announcements} statusEvents={statusEvents} />
          </div>

          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 h-9 px-3.5 sm:px-4 rounded-[10px] bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors duration-200 border border-white/10 shrink-0"
            >
              <User size={16} />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                Đăng nhập
              </span>
            </Link>
          )}
        </div>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={drawerGroups}
      />
    </nav>
  )
}
