import Link from "next/link";
import { Phone } from "lucide-react";

import { listCategories, listDocArticles } from "@/lib/queries";
import { sentenceCase } from "@/lib/displayCase";
import { ThemeToggle } from "../shared/ThemeToggle";
import { getShopSettings } from "@/lib/settingsStore";
import { categoryHref, docHref } from "@/lib/routes";
import {
  DiscordGlyph,
  FacebookGlyph,
  TiktokGlyph,
  ZaloGlyph,
} from "@/components/sites/menzu-lol-f7ae197a/shared/BrandGlyphs";

/**
 * How many rows each shelf shows before deferring to its index page; "Xem tất
 * cả" carries the rest. The two counts are separate because the shelves answer
 * different questions: what the shop sells is worth listing in full, while the
 * wiki is a library nobody reads from a footer — four of its most-read pages
 * is a sample, and a longer list would just push the columns apart.
 */
const CATEGORY_SHELF = 5;
const WIKI_SHELF = 4;

interface FooterLink {
  label: string;
  href: string;
}

/** The bar under the rule: the places a reader might still be looking for. */
const BOTTOM_LINKS: FooterLink[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Sản phẩm", href: "/categories" },
  { label: "Wiki", href: "/docs" },
  // The per-tool documentation (12/10/2026), beside the wiki it grew out of.
  { label: "Tài liệu", href: "/tai-lieu" },
  { label: "Sitemap", href: "/sitemap.xml" },
];

/**
 * Three tiers, told apart by weight, case and colour rather than by size:
 * wordmark, heading, row. Carrying the hierarchy that way lets the type sit a
 * step smaller than a footer usually does and still read at a glance.
 */
const HEADING = "font-display text-[15px] font-semibold text-frost";
const ROW = "text-[13px] leading-[1.45] text-neutral-400 hover:text-white transition-colors";
// The footer's one colour is the storefront's red accent, the same one the
// section headings above it use — the shop tried the brand purple and plain
// white in these three spots and came back to this.
// py-2 on a phone so the thumb has a 36px row to hit (27/10/2026, the phone
// pass); none from sm, as before.
const SEE_ALL =
  "group inline-flex items-center gap-1.5 py-2 text-[14px] font-semibold text-frost underline-offset-4 hover:underline transition-colors sm:py-0";

interface FooterContact {
  zalo: string;
  facebook: string;
  hotline: string;
  tiktok: string;
  discord: string;
}

/**
 * One icon per way of actually reaching the shop.
 *
 * A blank field means that channel does not exist yet, so its icon does not
 * either — the capture shipped four of these as inert "#" links, two of them
 * pointing at the same page. Fill Cấu hình → Liên hệ and they appear.
 */
function socialLinks(contact: FooterContact) {
  const digits = contact.zalo.replace(/\D/g, "");
  return [
    contact.facebook
      ? { key: "facebook", href: contact.facebook, label: "Facebook", Glyph: FacebookGlyph }
      : null,
    digits
      ? { key: "zalo", href: `https://zalo.me/${digits}`, label: "Zalo", Glyph: ZaloGlyph }
      : null,
    contact.tiktok
      ? { key: "tiktok", href: contact.tiktok, label: "TikTok", Glyph: TiktokGlyph }
      : null,
    contact.discord
      ? { key: "discord", href: contact.discord, label: "Discord", Glyph: DiscordGlyph }
      : null,
    contact.hotline
      ? {
          key: "hotline",
          href: `tel:${contact.hotline.replace(/[^\d+]/g, "")}`,
          label: `Hotline ${contact.hotline}`,
          Glyph: () => <Phone className="w-[17px] h-[17px]" strokeWidth={2} />,
        }
      : null,
  ].filter((entry) => entry !== null);
}

/**
 * A name too long for a phone's half-width column breaks at its dash:
 * "Hack truy kích PC -" over "truy kích 2", "Hack CS2 -" over "Counter
 * Strike 2", never with "- CF4VN" opening a line or "2" left alone. The dash
 * holds on to the word before it and a short tail is glued together, both
 * with no-break spaces; a tail longer than a line keeps its spaces. Applied
 * after sentenceCase, which folds every space to a plain one. A name that
 * fits on one line looks the same either way.
 */
function breakAtDash(label: string): string {
  return label.replace(
    / - (.+)$/,
    (_, tail: string) => ` - ${tail.length <= 20 ? tail.replace(/ /g, " ") : tail}`,
  );
}

/**
 * A shelf of links under a heading, optionally closed by a "see all" line.
 * `soft` gives each label a sentence-case twin (CaseText) for the light
 * trial "moi"; only the category names, which the admin types in capitals,
 * ask for it (a support link such as "DMCA & Bản quyền" must keep its caps).
 */
function Column({
  heading,
  links,
  seeAll,
  soft = false,
  className = "",
}: {
  heading: string;
  links: FooterLink[];
  seeAll?: FooterLink;
  soft?: boolean;
  /** Placement in the footer's grid. */
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3.5 ${className}`}>
      {/* h2, not h4. These footer columns are the page's last top-level
          sections, and the only headings above them are the h2s of the
          sections themselves — an h4 with no h3 anywhere before it leaves a
          screen reader's outline with a hole in it, which is exactly what
          heading-order reports. The styling is the footer's own either way. */}
      <h2 className={HEADING}>{heading}</h2>
      {/* On a phone, two to a row, a long name wraps: its lines sit at the
          rows' own 1.45 (not the inherited 24px, which spaced them like two
          links), the gap between links grows to 12px so a wrapped name still
          reads as one, and text-pretty keeps a lone "2" or "CF4VN" off the
          last line. sm up is unchanged. */}
      <ul className="flex flex-col gap-2.5 max-sm:gap-3 max-sm:text-[13px] max-sm:leading-[1.45] max-sm:text-pretty">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className={ROW}>
              {breakAtDash(soft ? sentenceCase(link.label) : link.label)}
            </Link>
          </li>
        ))}
        {seeAll ? (
          <li className="pt-1.5">
            <Link href={seeAll.href} className={SEE_ALL}>
              {seeAll.label}
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/**
 * Reads the shop identity itself rather than taking props: a dozen pages
 * render this footer, and threading the same values through all of them would
 * be churn with no reader.
 *
 * Two of the four columns are read from the database rather than written here,
 * where they would go stale the first time a category is renamed or an article
 * published. Every destination is a page this site serves — the captured
 * footer carried a whole "Valorant Hub" column sitting on href="#", and a dead
 * link in a footer is worse than a missing one: the reader spends a click
 * finding out.
 */
export async function SiteFooter() {
  const [settings, categories, articles] = await Promise.all([
    getShopSettings(),
    listCategories(),
    listDocArticles(),
  ]);

  const contact: FooterContact = {
    zalo: settings.contactZalo,
    facebook: settings.contactFacebook,
    hotline: settings.contactHotline,
    tiktok: settings.contactTiktok,
    discord: settings.contactDiscord,
  };
  const socials = socialLinks(contact);

  // The wordmark reads as one word with the domain in the accent, so the shop
  // name loses its spaces here rather than in Cấu hình, where the spaced form
  // is what page titles and the header want.
  const wordmark = settings.brandName.toUpperCase().replace(/\s+/g, "");

  // What is on sale leads; a shelf the shop has opened but not stocked yet
  // still earns a line, because "we sell PUBG too" is worth saying and the
  // page it lands on says plainly that the shelf is empty. The index below
  // picks up whatever did not fit.
  const shopLinks = [
    ...categories.filter((c) => c.productCount > 0),
    ...categories.filter((c) => c.productCount === 0),
  ]
    .slice(0, CATEGORY_SHELF)
    .map((c) => ({ label: c.name, href: categoryHref(c.slug) }));

  // "Nổi bật" measured rather than chosen: the most-read guides, which also
  // keeps half-written drafts with no readers out of the footer. Policies and
  // the general terms are left to the support column so neither shelf repeats
  // the other.
  const guideLinks = [...articles]
    .filter((a) => a.category !== "WARRANTY" && a.category !== "TERMS")
    .sort((a, b) => b.views - a.views)
    .slice(0, WIKI_SHELF)
    .map((a) => ({ label: a.title, href: docHref(a.slug) }));

  /** A policy gets its own page once the shop writes one; until then the wiki
   *  index is the honest destination — never a 404. */
  const policyHref = (pattern: RegExp): string => {
    const hit = articles.find((a) => pattern.test(a.title) || pattern.test(a.slug));
    return hit ? docHref(hit.slug) : "/docs";
  };

  const supportLinks: FooterLink[] = [
    { label: "Câu hỏi thường gặp", href: "/docs#FAQ" },
    { label: "Chính sách bảo hành", href: "/docs#WARRANTY" },
    { label: "Điều khoản sử dụng", href: policyHref(/điều khoản|dieu-khoan|terms/i) },
    { label: "Chính sách bảo mật", href: policyHref(/bảo mật|bao-mat|privacy/i) },
    { label: "DMCA & Bản quyền", href: policyHref(/dmca|bản quyền|ban-quyen|copyright/i) },
    // /feedback is the wall of customer reviews; a reader who clicked "liên hệ
    // hỗ trợ" wanted the shop's own addresses, which is a different page.
    { label: "Liên hệ hỗ trợ", href: "/lien-he" },
  ];

  return (
    // The header bar's #0f1015 (trial): the site keeps two grounds — the
    // storefront's #0f1015 and the account and utility pages' darker
    // --menzu-bg — and a footer in the header's tone frames every page top and
    // bottom in the same colour, whichever ground sits between them.
    <footer className="relative z-10 w-full bg-panel border-t border-white/10 mt-auto">
      {/* The narrow layout's bottom padding clears the fixed bottom
          navigation (64px) and the chat button floating over it (56px, 76px
          up): at pb-24 the button sat on the last line of links at the end
          of the page and hid "Sitemap"; pb-36 lifts that line above it (the
          owner, 18/10/2026, footer review: no link hidden). */}
      <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-10 pb-36 sm:py-11">
        {/* LAB: on a phone the shelves stand two to a row the way menzu.lol
            lays its footer out (the owner, 18/10/2026: "hay làm footer kiểu
            menzu căn ra 1 hàng 2 bên", "làm đi khỏi ẩn link"): Danh mục and
            Hỗ trợ side by side, the wiki's long titles across the full width
            under them (order-last), every link still shown. It was one
            column, 1211px tall on a 390px phone. From sm the old placement
            returns: two columns, then four from lg. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-2 sm:gap-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-10">
          <div className="col-span-2 flex flex-col gap-4 sm:col-span-1">
            <Link
              href="/"
              className="text-[22px] sm:text-[24px] font-black tracking-tight leading-none text-white"
            >
              {wordmark}
              <span className="text-[var(--menzu-accent)]">.COM</span>
            </Link>

            {/* 13px over 1.6 rather than 14 over 1.625: the line count is the
                same at this width, so the paragraph loses height without
                losing a line — and Vietnamese dấu still clear the line above. */}
            <p className="max-w-[290px] text-[13px] leading-[1.6] text-neutral-400">
              Cung cấp các sản phẩm kỹ thuật số và tài khoản game. Hỗ trợ nhanh chóng,
              thông tin rõ ràng và cập nhật hướng dẫn sử dụng chi tiết.
            </p>

            {/* The channels close the column the wordmark opens: who the shop
                is, what it sells, and how to reach it. */}
            {socials.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] text-dim select-none">
                  Theo dõi &amp; kết nối
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {socials.map(({ key, href, label, Glyph }) => (
                    <a
                      key={key}
                      href={href}
                      aria-label={label}
                      title={label}
                      // tel: opens the dialer in this tab; only the web ones leave.
                      {...(href.startsWith("tel:")
                        ? {}
                        : { target: "_blank", rel: "noopener noreferrer" })}
                      // The same tile the quantity stepper and the tool rail use,
                      // so a channel reads as something to press rather than as
                      // decoration floating on the background.
                      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300 hover:border-[var(--menzu-accent)]/50 hover:bg-[var(--menzu-accent)]/10 hover:text-white transition-colors"
                    >
                      <Glyph />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <Column
            heading="Danh mục"
            links={shopLinks}
            soft
            seeAll={{ label: "Xem tất cả danh mục", href: "/categories" }}
          />

          <Column
            heading="Wiki hướng dẫn"
            links={guideLinks}
            seeAll={{ label: "Xem tất cả hướng dẫn", href: "/docs" }}
            className="order-last col-span-2 sm:order-none sm:col-span-1"
          />

          <Column heading="Hỗ trợ" links={supportLinks} />
        </div>

        {/* border-white/5 is what the storefront uses for a rule inside a
            panel, as against the /10 that marks the panel's own edge. */}
        <div className="mt-9 pt-5 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-neutral-500 text-center md:text-left">
            © {new Date().getFullYear()}{" "}
            <span className="font-bold text-neutral-300">
              {wordmark}
              <span className="text-neutral-400">.COM</span>
            </span>
            {/* Parted by dots rather than full stops, as menzu parts its
                footer: a full stop straight after ".COM" read as a stutter. */}
            <span aria-hidden className="mx-2 text-neutral-700">
              •
            </span>
            All rights reserved
            {/* Who built it, signed the way menzu signs its footer: after the
                copyright from md up, on a line of its own on a phone, where a
                separator would be left hanging at the end of a wrapped line. */}
            <span className="mt-1 block md:mt-0 md:inline">
              <span aria-hidden className="mx-2 hidden text-neutral-700 md:inline">
                •
              </span>
              Designed &amp; developed by{" "}
              <span className="font-bold text-[var(--menzu-accent)]">KWIN</span>
            </span>
          </p>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5">
            {BOTTOM_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2 text-[12px] text-neutral-500 hover:text-white transition-colors sm:py-0"
              >
                {link.label}
              </Link>
            ))}
            <ThemeToggle className="py-2 text-[12px] text-neutral-500 hover:text-white transition-colors sm:py-0" />
          </nav>
        </div>
      </div>
    </footer>
  );
}
