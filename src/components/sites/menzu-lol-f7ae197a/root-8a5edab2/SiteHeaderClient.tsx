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
  Ticket,
  Star,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import { AnnouncementCenter, type AnnouncementItem } from "../shared/AnnouncementCenter";
import { sentenceCase, softTitle } from "@/lib/displayCase";
import { STATUS_TAB_HREF } from "@/lib/softwareStatus";
// A bare constant in a module with no imports of its own, so it is safe in
// this client bundle (the wheel's client components read it already).
import { CartButton } from "./CartButton";
import { HeaderSearch } from "./HeaderSearch"
import { SiteLink } from "../shared/SiteLink";
import { UserMenu, type HeaderUser } from "./UserMenu";
import { usePathname } from "next/navigation"
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
  // Three labels that used to fall through to "#". Each now goes where it
  // honestly leads: every tool the shop sells is software, so the software
  // menu is the shelf of shelves; the gift events are announcements and live
  // on the notices page; and the community is the list of the shop’s own
  // channels.
  "HACK PHẦN MỀM": "/categories",
  "Sự Kiện Tặng Hack": "/thong-bao",
  // "LIÊN HỆ", once "CỘNG ĐỒNG": the menu, the page's breadcrumb and its
  // title now say the same thing (the owner, 02/10/2026: "làm hết thử").
  "LIÊN HỆ": "/lien-he",
  "XEM TRẠNG THÁI": STATUS_TAB_HREF,
  "WIKI & HƯỚNG DẪN": "/docs",
  // The documentation area, per tool, open as long as the key (12/10/2026).
  "TÀI LIỆU": "/tai-lieu",
  "Nạp Qua Ngân Hàng": "/wallet",
  // menzu's own address for the card desk: the wallet opens on its Thẻ cào tab.
  "Nạp Thẻ Cào": "/wallet?method=card",
}

function hrefFor(label: string): string {
  return LINK_HREFS[label] ?? "#"
}

/**
 * The one quick link whose address is not a page here but the shop's
 * Telegram bot, read from Cấu hình at render time; left out entirely while
 * no bot is configured, since a dead link sells nothing.
 */
const TELEGRAM_SHOP_LINK = "MUA TRÊN TELEGRAM"

// A rung of the main bar that opens a page rather than a panel. Written once
// because there are two of them now, and a nav where one rung underlines on
// hover and its neighbour does not reads as a bug rather than as a variant.
const NAV_LINK_CLASS =
  "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-[14px] font-semibold text-frost/90 hover:text-white transition-colors duration-200 ease-[ease] after:absolute after:bottom-1.5 after:inset-x-3 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--menzu-accent)] after:transition-transform after:duration-200 hover:after:scale-x-100"

// The two ways the shop sells a hack: a board you plug in, and a file you run.
// Labels only for now — neither has a page in this clone, so both fall to "#"
// through hrefFor, the same as the SHOP ACC pair.
const HACK_CATEGORY_ITEMS: DropdownItem[] = [
  { label: "HACK DMA & MẠCH CỨNG", icon: Cpu },
  { label: "HACK PHẦN MỀM", icon: AppWindow },
]

const NAP_TIEN_ITEMS: DropdownItem[] = [
  // Named and marked as the wallet names and marks them: the wallet has two
  // tabs, Ngân Hàng and Thẻ Cào, and no wallet provider at all — "Momo" was a
  // promise nothing in the shop can keep. The card keeps the ticket the wallet
  // gives it; a phone glyph here meant a third thing that does not exist.
  { label: "Nạp Qua Ngân Hàng", icon: CreditCard },
  { label: "Nạp Thẻ Cào", icon: Ticket },
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
  // "TÀI LIỆU" hidden for now (the owner, 18/10/2026: "tạm ẩn trang tài liệu
  // trên navbar đi xấu quá"; the page is still served and the footer links it); its row was
  // { label: "TÀI LIỆU", icon: Library }, Library from lucide-react.
  { label: "ĐÁNH GIÁ", icon: Star },
  { label: "LIÊN HỆ", icon: Users },
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
    { label: "SHOP ACC", items: withHrefs(SHOP_ACC_ITEMS) },
    { label: "NẠP TIỀN", items: withHrefs(NAP_TIEN_ITEMS) },
    { label: "LIÊN KẾT NHANH", items: withHrefs(QUICK_LINK_ITEMS) },
  ]
}

function NavDropdown({
  label,
  items,
  linkFor = hrefFor,
}: {
  label: string;
  items: DropdownItem[];
  /** Where a row goes; the label lookup unless the caller knows better. */
  linkFor?: (label: string) => string;
}) {
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
        aria-haspopup="true"
        className="relative flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-[14px] font-semibold text-frost/90 group-hover:text-white group-focus-within:text-white transition-colors duration-200 ease-[ease] after:absolute after:bottom-1.5 after:inset-x-3 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--menzu-accent)] after:transition-transform after:duration-200 group-hover:after:scale-x-100 group-focus-within:after:scale-x-100"
      >
        {sentenceCase(label)}
        <ChevronDown size={14} />
      </button>
      {/* Also on focus-within: a keyboard reached the trigger and then
          tabbed into six invisible links, each of which navigated on Enter.
          With the panel open while anything inside holds focus, whatever is
          focused is on screen. */}
      <div className="absolute top-full left-0 pt-1 transition-all duration-300 z-[110] w-56 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto">
        {/* The same corner, hairline and ground as the search results panel:
            two lists hanging off one bar should not be two designs. */}
        <div className="rounded-[12px] border border-line bg-panel/97 backdrop-blur-xl p-2 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon
            return (
              // Icon and label rest at different greys, so they cannot share
              // one inherited colour the way the trigger's chevron does — each
              // carries its own rule to arrive at the same red together.
              <SiteLink
                key={item.label}
                href={linkFor(item.label)}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group/item"
              >
                <Icon
                  size={14}
                  className="text-neutral-400 group-hover/item:text-[var(--menzu-accent)] shrink-0 transition-colors duration-200 ease-[ease]"
                />
                {/* nav-item-label is a hook for the light trial "moi"
                    (theme-light.css, part 6); no style of its own. */}
                <span className="nav-item-label text-[14px] font-medium text-frost/90 group-hover/item:text-white transition-colors duration-200 ease-[ease]">
                  {/* The brand keeps its capital, as the strip wrote it:
                      softTitle lowers an all-caps label whole. */}
                  {item.label === TELEGRAM_SHOP_LINK ? "Mua trên Telegram" : softTitle(item.label)}
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
  cartCount,
  telegramShopUrl,
}: {
  user: HeaderUser | null;
  brand: HeaderBrand;
  announcements: AnnouncementItem[];
  /** Status changes of the tools this reader follows; empty for a guest. */
  /** Lines waiting in the basket; 0 for a guest. */
  cartCount: number;
  /** t.me link of the shop bot, or null while Cấu hình has no bot. */
  telegramShopUrl: string | null;
}) {
  const linkFor = (label: string) =>
    label === TELEGRAM_SHOP_LINK ? (telegramShopUrl ?? "#") : hrefFor(label)
  const drawerGroups = drawerGroupsFor(linkFor, telegramShopUrl !== null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // The login button brings the visitor back to the page they were reading:
  // it used to be a bare /login, and a guest who tapped it on a tool page was
  // dropped on the home page afterwards — on a phone, where the header has no
  // search box, that meant finding the tool again through the drawer. The
  // path alone is enough (product addresses carry no query); the auth pages
  // and the home page get the bare link.
  const pathname = usePathname()
  const loginHref =
    pathname === "/" || /^\/(login|signup|register|forgot-password|reset-password)(\/|$)/.test(pathname)
      ? "/login"
      : `/login?next=${encodeURIComponent(pathname)}`

  // True once the page has scrolled a little. Drives the condensed header:
  // translucent + blurred. The header is position:fixed with a spacer under
  // it, so restyling it never shifts the page below. LAB: the main row keeps its 64px and the logo
  // its size on scroll, where the row went to 58px and the logo to 94% (the
  // owner, 18/10/2026: "thu gọn nhưng đừng có co lại mất độ cao ban đầu").
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
      // Frosted glass from sm up from the top of the page, not only once it
      // has scrolled (lab 3200 trial, 26/10/2026: "thử chuyển sang kính mờ
      // với navbar hiện tại"): a hero pulled up under the bar shows through
      // it blurred. The shadow still comes with the scroll; a phone keeps
      // its solid bar at the top and the near-opaque one after, no blur.
      // In the raised tone (#17171c) rather than the page's own #111111,
      // one step lighter so the bar reads as a layer of its own (lab 3200
      // trial, 26/10/2026: "màu navbar có tối quá không", then "làm 2 thử"),
      // and edged below with the cards' own 1px line ("thêm viền luôn").
      className={`site-nav fixed top-0 left-0 right-0 z-[100] transition-all duration-300 flex flex-col border-b border-line sm:bg-raise/80 sm:backdrop-blur-xl ${
        scrolled ? "bg-raise/97 shadow-lg shadow-black/30" : "bg-raise"
      }`}
    >
      {/* One row (lab 3200 trial, 26/10/2026: "thử thu navbar hiện về navbar
          1 tầng đi"): the 40px strip of quick links that stood over it is
          gone, its links hang from the "Hỗ trợ" rung below, and the pages'
          104px spacers are 64px from sm up (globals.css). A tablet finds
          them in the menu, under LIÊN KẾT NHANH, as a phone always has. */}
      <div className="max-w-[1320px] w-full mx-auto px-4 lg:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-8 h-full">
          {/* The logo stays below xl only: from xl the bar opens on the word
              "Trang chủ" instead (lab 3200 trial, 26/10/2026: "chỗ này đổi
              thành trang chủ thử", "chữ trang chủ"). */}
          <div className="flex items-center w-auto xl:hidden">
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="xl:hidden p-2.5 sm:p-1.5 text-neutral-200 hover:text-white transition-colors flex items-center justify-center"
            >
              <Menu size={18} />
            </button>

            <Link
              href="/"
              className="flex items-center gap-3 group"
            >
              {/* LAB: the mark shows from 430px only, and never shrinks. On a
                  narrower phone the row had no room for it: flex squeezed it
                  to nothing (a 28px image with max-width 100% gives way
                  first), leaving its spinning ring as a stray red tick, while
                  the sign-in button was pushed past the screen's edge (the
                  owner, 18/10/2026: "rà soát lại nút đăng nhập và logo chuẩn
                  chưa có bị lệch hay gì k nếu có thì căn lại"). */}
              <div className="relative hidden shrink-0 min-[430px]:block">
                <Image
                  src={brand.logo}
                  alt={brandWord}
                  width={28}
                  height={28}
                  // Not preloaded: a 28px mark has no business competing
                  // with the page's LCP image for the line.
                  className="w-7 h-7 object-contain transition-transform duration-500 group-hover:scale-110"
                />
                <span className="navbar-spin-ring absolute inset-[-2px] rounded-full border border-transparent border-t-red-500 transition-transform duration-1000 group-hover:scale-110 animate-spin-slow" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black italic tracking-tighter text-white">
                  {brandWord}
                </span>
                {brandTail ? (
                  <span className="whitespace-nowrap text-[9px] font-bold tracking-[0.2em] text-red-500 uppercase">
                    {brandTail}
                  </span>
                ) : null}
              </div>
            </Link>
          </div>

          {/* The full bar from xl, not lg: logo, four rungs, the search box,
              the bell and the account need about 1160px, so on every screen
              from 1024 to 1279 (an iPad on its side, a small laptop) the
              rungs wrapped to two and three lines and, once the header had
              shrunk on scroll, poked out of it. Those widths now get the
              tablet header — menu button, strip of quick links, search —
              which already fits. MobileDrawer switches on the same line. */}
          <div className="hidden xl:flex items-center gap-5 h-full">
            {/* TRIAL: the word "Trang chủ" becomes a wordmark, now KWINHACK,
                KWIN in the accent and HACK in white (the owner, 27/10/2026:
                "chữ này đổi thành logo chữ THICHTHIHACK đi THICHTHI màu đỏ
                HACK màu trắng", then "đổi này thành KWIN đi", "kwinhack";
                the THICHTHI/HACK version is c0e03729). It starts on the
                page's left edge as the logo did, still the home link, named
                "Trang chủ" for screen readers. */}
            <Link
              href="/"
              aria-label="Trang chủ"
              className="mr-2 flex items-center whitespace-nowrap font-display text-[20px] font-black leading-none tracking-[-0.02em] transition-opacity hover:opacity-85"
            >
              {/* KWIN in white, HACK in the accent, no hyphen (the owner,
                  27/10/2026: "KWIN-HACK", then "KWIN chữ trắng HACK đỏ",
                  "bỏ -"). */}
              <span className="text-white">KWIN</span>
              <span className="text-[var(--menzu-accent)]">HACK</span>
            </Link>
            <NavDropdown label="CÁC LOẠI HACK" items={HACK_CATEGORY_ITEMS} />
            <NavDropdown label="SHOP ACC" items={SHOP_ACC_ITEMS} />
            <NavDropdown label="NẠP TIỀN" items={NAP_TIEN_ITEMS} />

            {/* Shown to everyone, signed in or not: a visitor who does not know
                the wheel exists never signs in for it. /vong-quay itself asks
                for the login and comes back here after. Shown while the wheel
                is closed too: the page behind it carries the "tạm ngưng"
                notice (hidden 13/10/2026 in the UI consistency review; back on
                the owner's word, 16/10/2026: "hiện cái đổi thưởng lại đi", as
                the overview's Đổi thưởng door came back the same morning). */}
            <Link href="/vong-quay" className={NAV_LINK_CLASS}>
              Đổi thưởng
            </Link>

            {/* The strip's links, now that the bar is one row: the Telegram
                shop only while Cấu hình has a bot, as the strip had it. */}
            <NavDropdown
              label="HỖ TRỢ"
              items={QUICK_LINK_ITEMS.filter(
                (item) => item.label !== TELEGRAM_SHOP_LINK || telegramShopUrl !== null,
              )}
              linkFor={linkFor}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Renders nothing at all when the shop has no live notice, so a
              header with an empty bell is not the resting state. */}
          {/* Basket and bell read as one cluster of icon buttons — they are
              the same kind of control, so they sit tight against each other
              and keep the wider gap for the account button beside them. */}
          <div className="flex items-center gap-1.5">
            {/* Left of the basket: a box on a desktop, a button on a phone. */}
            <HeaderSearch />
            <CartButton count={cartCount} />
          </div>

          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href={loginHref}
              aria-label="Đăng nhập"
              // LAB: the main site's 10px corners again, the search box's and
              // the basket's, where it had gone to 14px (the owner,
              // 18/10/2026: "nút đăng nhập trên navbar có cần bo hình chữ nhật
              // giống 3100", "giống bên navbar 3100"). The label keeps the
              // lab's sentence case, as the rest of this header does. On a
              // phone it sits 2px tighter inside and 4px closer to the basket
              // (px-3, gap-1.5, the row's gap-2), the room the word needs.
              className="flex items-center gap-1.5 sm:gap-2 h-9 px-3 sm:px-4 rounded-[10px] bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors duration-200 shrink-0"
            >
              <User size={16} />
              {/* Under 390px the header has no room for the word: with the
                  menu, the logo's name and the basket it ran past the screen's
                  edge (18px cut off at 360, 3.5px at 375). The icon and the
                  label carry it there; the bottom bar has "Tài khoản" too. */}
              <span className="text-[14px] font-semibold text-white whitespace-nowrap max-[389px]:hidden">
                Đăng nhập
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Draws nothing in the bar: only the notice sheet, when there is an
          unread one. It used to be the bell between the basket and the
          account button. */}
      <AnnouncementCenter announcements={announcements} />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={drawerGroups}
        brandName={brand.name}
        brandLogo={brand.logo}
        user={user}
      />
    </nav>
  )
}
