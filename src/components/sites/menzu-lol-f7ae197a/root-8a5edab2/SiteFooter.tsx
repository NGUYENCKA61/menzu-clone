import Link from "next/link";
import { Phone } from "lucide-react";

import { listCategories, listDocArticles } from "@/lib/queries";
import { getShopSettings } from "@/lib/settingsStore";

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

/** The bar under the rule: the four places a reader might still be looking for. */
const BOTTOM_LINKS: FooterLink[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Sản phẩm", href: "/categories" },
  { label: "Wiki", href: "/docs" },
  { label: "Sitemap", href: "/sitemap.xml" },
];

/**
 * Three tiers, told apart by weight, case and colour rather than by size:
 * wordmark, heading, row. Carrying the hierarchy that way lets the type sit a
 * step smaller than a footer usually does and still read at a glance.
 */
const HEADING = "text-[11px] font-black uppercase tracking-[0.16em] text-white";
const ROW = "text-[13px] leading-[1.45] text-neutral-400 hover:text-white transition-colors";
const SEE_ALL =
  "group inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-[var(--brand)] hover:text-white transition-colors";

/* The live site serves its social glyphs from icons8 with signed query strings
 * that cannot be re-hosted; inline brand paths stand in, sized to the tile. */
function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function ZaloGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]">
      <path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.7 1.4 5.1 3.6 6.7-.1.9-.5 2.2-1.3 3.2-.2.3.1.7.4.6 1.9-.5 3.3-1.3 4.1-1.9.9.2 1.9.3 2.9.3 5.5 0 10-3.9 10-8.7S17.5 2 12 2Zm-4.6 6.1h3.4v.9L8.5 12.5h2.4v1H7.2v-.9l2.3-3.6H7.4v-.9Zm4.6 0h1v5.4h-1V8.1Zm3.6 1.4c1.2 0 2.1.9 2.1 2s-.9 2-2.1 2-2.1-.9-2.1-2 .9-2 2.1-2Zm0 .9c-.6 0-1.1.5-1.1 1.1s.5 1.1 1.1 1.1 1.1-.5 1.1-1.1-.5-1.1-1.1-1.1Z" />
    </svg>
  );
}

function TiktokGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12v-3.2a5.79 5.79 0 0 0-.76-.05 5.78 5.78 0 1 0 5.78 5.78V9.01a7.35 7.35 0 0 0 4.29 1.38V7.3a4.29 4.29 0 0 1-3.33-1.48Z" />
    </svg>
  );
}

function DiscordGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]">
      <path d="M20.32 4.57A19.79 19.79 0 0 0 15.43 3c-.21.38-.46.9-.63 1.31a18.27 18.27 0 0 0-5.6 0C9.03 3.9 8.77 3.38 8.56 3a19.74 19.74 0 0 0-4.89 1.57C.56 9.09-.28 13.5.14 17.84a19.9 19.9 0 0 0 6.07 3.08c.49-.67.93-1.39 1.3-2.14-.71-.27-1.4-.6-2.04-.99.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.06 0c.16.14.33.27.5.4-.65.39-1.33.72-2.05.99.38.75.81 1.47 1.3 2.14a19.87 19.87 0 0 0 6.08-3.08c.5-5.03-.84-9.4-3.54-13.27ZM8.02 15.2c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.21 0 2.18 1.09 2.16 2.4 0 1.32-.95 2.4-2.16 2.4Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.21 0 2.18 1.09 2.16 2.4 0 1.32-.95 2.4-2.16 2.4Z" />
    </svg>
  );
}

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

/** A shelf of links under a heading, optionally closed by a "see all" line. */
function Column({
  heading,
  links,
  seeAll,
}: {
  heading: string;
  links: FooterLink[];
  seeAll?: FooterLink;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <h4 className={HEADING}>{heading}</h4>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className={ROW}>
              {link.label}
            </Link>
          </li>
        ))}
        {seeAll ? (
          <li className="pt-1.5">
            <Link href={seeAll.href} className={SEE_ALL}>
              {seeAll.label}
              {/* The same nudge the wiki cards' "Chi tiết →" gives. */}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
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
    .map((c) => ({ label: c.name, href: `/category/${c.slug}` }));

  // "Nổi bật" measured rather than chosen: the most-read guides, which also
  // keeps half-written drafts with no readers out of the footer. Warranty
  // articles are left to the support column so neither shelf repeats the other.
  const guideLinks = [...articles]
    .filter((a) => a.category !== "WARRANTY")
    .sort((a, b) => b.views - a.views)
    .slice(0, WIKI_SHELF)
    .map((a) => ({ label: a.title, href: `/docs/${a.slug}` }));

  /** A policy gets its own page once the shop writes one; until then the wiki
   *  index is the honest destination — never a 404. */
  const policyHref = (pattern: RegExp): string => {
    const hit = articles.find((a) => pattern.test(a.title) || pattern.test(a.slug));
    return hit ? `/docs/${hit.slug}` : "/docs";
  };

  const supportLinks: FooterLink[] = [
    { label: "Câu hỏi thường gặp", href: "/docs#FAQ" },
    { label: "Chính sách bảo hành", href: "/docs#WARRANTY" },
    { label: "Điều khoản sử dụng", href: policyHref(/điều khoản|dieu-khoan|terms/i) },
    { label: "Chính sách bảo mật", href: policyHref(/bảo mật|bao-mat|privacy/i) },
    { label: "DMCA & Bản quyền", href: policyHref(/dmca|bản quyền|ban-quyen|copyright/i) },
    { label: "Liên hệ hỗ trợ", href: "/feedback" },
  ];

  return (
    <footer className="relative z-10 w-full bg-[#0a0a0e] border-t border-white/[0.07] mt-auto">
      {/* The accent hairline the wiki and category headings draw under their
          titles, run across the seam instead — it ties the footer to the page
          above without another solid rule. */}
      <div
        aria-hidden
        className="h-px w-full bg-gradient-to-r from-transparent via-[var(--brand)]/40 to-transparent"
      />

      {/* pb-28 on the narrow layout clears the fixed bottom navigation, which
          would otherwise sit on top of the copyright line. */}
      <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-10 pb-24 sm:py-11">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8 lg:gap-10">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="text-[22px] sm:text-[24px] font-black tracking-tight leading-none text-white"
            >
              {wordmark}
              <span className="text-[var(--brand)]">.COM</span>
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
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 select-none">
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
                      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300 hover:border-[var(--brand)]/50 hover:bg-[var(--brand)]/10 hover:text-white transition-colors"
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
            seeAll={{ label: "Xem tất cả danh mục", href: "/categories" }}
          />

          <Column
            heading="Wiki hướng dẫn"
            links={guideLinks}
            seeAll={{ label: "Xem tất cả hướng dẫn", href: "/docs" }}
          />

          <Column heading="Hỗ trợ" links={supportLinks} />
        </div>

        <div className="mt-9 pt-5 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-neutral-500 text-center md:text-left">
            © {new Date().getFullYear()}{" "}
            <span className="font-bold text-neutral-300">
              {wordmark}
              <span className="text-neutral-400">.COM</span>
            </span>
            . All rights reserved.
          </p>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5">
            {BOTTOM_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] text-neutral-500 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
