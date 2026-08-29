"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  DiscordGlyph,
  FacebookGlyph,
  TelegramGlyph,
  ZaloGlyph,
} from "@/components/sites/menzu-lol-f7ae197a/shared/BrandGlyphs";

/** The five places the shop can be reached, as the shop has filled them in. */
export interface ConnectLinks {
  /** The page a buyer messages the desk on. */
  facebookSupport: string;
  discord: string;
  facebookGroup: string;
  zaloGroup: string;
  telegram: string;
}

interface Row {
  key: keyof ConnectLinks;
  title: string;
  subtitle: string;
  Glyph: (props: { className?: string }) => React.ReactElement;
  /** The mark's own colour, and what the row borrows from it on hover. */
  ink: string;
  hover: string;
}

/**
 * The order the rail lists them in: the desk first, then the rooms.
 *
 * Support is what someone with a broken key needs and is the reason most
 * people open this rail at all, so it does not sit under three group links.
 *
 * Each row carries its brand's colour rather than the one amber the tools rail
 * used for everything. These marks are recognised by colour before they are
 * read — a blue circle is Facebook from the corner of an eye, an amber one is
 * nothing — and it also stops four different services looking like four copies
 * of one button. Written out in full because Tailwind reads these strings from
 * the source; a colour assembled at runtime would not exist in the stylesheet.
 */
const ROWS: Row[] = [
  {
    key: "facebookSupport",
    title: "Facebook hỗ trợ",
    subtitle: "Nhắn tin cho admin",
    Glyph: FacebookGlyph,
    ink: "text-[#5b9bff] group-hover:text-[#7fb2ff]",
    hover: "hover:border-[#5b9bff]/35 hover:bg-[#5b9bff]/[0.07]",
  },
  {
    key: "discord",
    title: "Nhóm Discord",
    subtitle: "Cộng đồng chính",
    Glyph: DiscordGlyph,
    ink: "text-[#7d87f6] group-hover:text-[#9aa2f9]",
    hover: "hover:border-[#7d87f6]/35 hover:bg-[#7d87f6]/[0.07]",
  },
  {
    key: "facebookGroup",
    title: "Nhóm Facebook",
    subtitle: "Tin tức & giao lưu",
    Glyph: FacebookGlyph,
    ink: "text-[#5b9bff] group-hover:text-[#7fb2ff]",
    hover: "hover:border-[#5b9bff]/35 hover:bg-[#5b9bff]/[0.07]",
  },
  {
    key: "zaloGroup",
    title: "Nhóm Zalo",
    subtitle: "Trao đổi nhanh",
    Glyph: ZaloGlyph,
    ink: "text-[#3d8bff] group-hover:text-[#6aa6ff]",
    hover: "hover:border-[#3d8bff]/35 hover:bg-[#3d8bff]/[0.07]",
  },
  {
    key: "telegram",
    title: "Nhóm Telegram",
    subtitle: "Kênh cập nhật",
    Glyph: TelegramGlyph,
    ink: "text-[#3fbbf5] group-hover:text-[#6bcdf8]",
    hover: "hover:border-[#3fbbf5]/35 hover:bg-[#3fbbf5]/[0.07]",
  },
];

/** The panel itself, minus the transform that opens and closes it. */
const PANEL =
  "fixed left-0 top-1/2 -translate-y-1/2 z-50 hidden sm:flex flex-col gap-3 select-none font-sans w-[208px] p-3 rounded-r-2xl border-r border-t border-b border-white/[0.08] bg-[#0c0d12]/95 backdrop-blur-md shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)] transition-transform duration-300 transform-gpu";

/**
 * The rail pinned to the left edge: where to find the shop when the shop is
 * not this website.
 *
 * It replaced a "CÔNG CỤ" rail whose four cards — check skin, build, find a
 * teammate, welcome mail — all pointed at "#", because none of those pages
 * exist in this clone. Every row here is a real address the shop typed into
 * Cấu hình, and a row whose address is blank is not drawn: the rail shrinks to
 * what the shop actually has rather than showing five dead links.
 */
export function ConnectRail({ links }: { links: ConnectLinks }) {
  // Closed to begin with. Open, the panel covers 208px of the left edge on
  // every page from the moment it loads — over the first words of every row
  // below it — to say something most visitors are not looking for yet. The
  // handle at the edge is what asks.
  const [collapsed, setCollapsed] = useState(true);

  const rows = ROWS.filter((row) => links[row.key].trim());
  // Nothing filled in yet — no rail at all, rather than an empty panel with a
  // heading on it.
  if (rows.length === 0) return null;

  return (
    <div className={`${PANEL} ${collapsed ? "-translate-x-full" : "translate-x-0"}`}>
      <div className="flex items-center gap-2 px-1 pb-2.5 border-b border-white/[0.06]">
        {/* An online dot rather than a bar or an icon. The five marks below are
            the icons here, so a sixth glyph would only compete with them — and
            what this heading is missing is not decoration but a reason to click
            now: a shop that is awake. The ring pulses out from under the dot,
            and stills under prefers-reduced-motion like the rest of the page.

            aria-hidden because it is a promise the page cannot keep: nothing
            here checks whether anyone is actually at the desk, so it must not
            be announced as a live status. */}
        <span aria-hidden className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
          Kết nối
        </span>
      </div>

      {/* Height comes from the rows. The old rail pinned it at 246px for the
          four cards it always had; here the count is whatever the shop has
          filled in, and a fixed height would either clip the fifth row or
          leave a gap under the second. */}
      <div className="flex flex-col gap-2">
        {rows.map(({ key, title, subtitle, Glyph, ink, hover }) => (
          <a
            key={key}
            href={links[key]}
            target="_blank"
            rel="noopener noreferrer"
            className={`group relative flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 transition-colors ${hover}`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.03] transition-colors group-hover:border-white/10 group-hover:bg-white/[0.06] ${ink}`}
            >
              <Glyph className="h-[17px] w-[17px]" />
            </span>
            <span className="flex min-w-0 flex-col items-start justify-center text-left">
              <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-wider text-neutral-200 transition-colors group-hover:text-white">
                {title}
              </span>
              <span className="whitespace-nowrap text-[9px] text-neutral-500 transition-colors group-hover:text-neutral-400">
                {subtitle}
              </span>
            </span>
          </a>
        ))}
      </div>

      {/* One handle for both directions, rather than a chevron in the header to
          close and a separate tab to open. It rides the panel's right edge, so
          it is on screen either way: open, it sticks out beside the panel;
          closed, the panel has slid left by its own width and the handle is
          what is left at the edge of the screen. The chevron turns to point
          wherever the next click sends the panel. */}
      <button
        type="button"
        className="absolute left-full top-1/2 flex h-16 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg border-r border-t border-b border-white/[0.08] bg-[#0c0d12]/95 text-neutral-400 backdrop-blur-md transition-colors hover:bg-[#161620] hover:text-white"
        aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((open) => !open)}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}
