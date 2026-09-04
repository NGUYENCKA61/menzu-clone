"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  MessageCircle,
  MessagesSquare,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";

import { pickMessenger, pickZalo } from "@/lib/messenger";
import { SUPPORT_WINDOW, supportStatus } from "@/lib/supportHours";

import { AssistantChat } from "./AssistantChat";

/**
 * Glass, in one place.
 *
 * Both surfaces — the panel and the tab under it — are the same material, so
 * they read as one object that happens to be hinged. The blur is what makes it
 * glass; the inset white hairline along the top is what makes the blur look
 * like a pane rather than a smudge, and it is the piece most often left out.
 */
const GLASS =
  "border border-white/[0.12] bg-[#0b0b10]/70 backdrop-blur-2xl backdrop-saturate-150";

/**
 * The dot beside the status line.
 *
 * Written out per state because Tailwind reads source text: a class built by
 * joining strings compiles to nothing at all.
 */
function NAME_DOT(status: { open: boolean } | null): string {
  const base = "h-1.5 w-1.5 shrink-0 rounded-full";
  if (status === null) return `${base} bg-neutral-600`;
  return status.open
    ? `${base} bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]`
    : `${base} bg-amber-400`;
}

/** Which of the two the visitor last picked, so the choice survives a reload. */
const MODE_KEY = "menzu-support-mode";

export interface SupportChannel {
  id: string;
  label: string;
  url: string;
  iconUrl: string;
}

/**
 * One way to reach a person, as a row you press.
 *
 * Rows rather than a stack of coloured buttons because the shop has two of
 * these now and will have three the day it adds one: Messenger blue and Zalo
 * blue are near enough the same blue that two filled buttons would read as one
 * control drawn twice. The channel's own mark carries the identity, the row
 * carries the press, and only the first one is lit.
 */
function ContactRow({
  iconUrl,
  action,
  note,
  href,
  first = false,
}: {
  iconUrl: string;
  /** What pressing it does, not what the channel is called. */
  action: string;
  note: string;
  href: string;
  /** The one the shop would rather you used. */
  first?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-200 ${
        first
          ? "border-white/20 bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-white/[0.15]"
          : "border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.09]"
      }`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.12] bg-black/30">
        <Image
          src={iconUrl}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] object-contain"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-bold text-white">{action}</span>
        <span className="block truncate text-[11px] text-neutral-500">{note}</span>
      </span>
      <ChevronRight
        aria-hidden
        size={15}
        className="shrink-0 text-neutral-600 transition-colors duration-200 group-hover:text-white"
      />
    </a>
  );
}

/**
 * One channel as a single pill, mark and name together, for the phone,
 * where the panel is skipped and the pill itself is the press. Same glass
 * as the tab; the channel's own mark leads, its name follows, so the two
 * fanned-out pills read as a choice rather than two unlabelled blue circles.
 */
function DirectChannel({
  href,
  iconUrl,
  name,
  label,
}: {
  href: string;
  iconUrl: string;
  /** What it is called, printed beside the mark. */
  name: string;
  /** What pressing it does, for screen readers. */
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-12 w-[168px] items-center gap-3 whitespace-nowrap rounded-full border border-white/[0.14] bg-[#0c0d12] pl-3 pr-4 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors duration-200 active:bg-[#14141c]"
    >
      <Image
        src={iconUrl}
        alt=""
        width={26}
        height={26}
        className="h-[26px] w-[26px] shrink-0 object-contain"
      />
      <span className="text-[13px] font-bold leading-none text-white">{name}</span>
    </a>
  );
}

/**
 * Floating support panel pinned to the bottom-right, on every page.
 *
 * One tab, one panel, two channels behind a chooser: the assistant, which
 * answers the two questions the shop was answering by hand all day, and the
 * shop's own inbox for everything a machine cannot do. A visitor here wants to
 * say something to somebody, and both halves are somebody to say it to.
 *
 * The fanpage comes from the same BioLink rows /bio renders — one set of
 * handles, and keeping a second copy in source would guarantee the two drift
 * apart.
 */
export function SupportWidget({
  channels,
  assistant,
  brand,
}: {
  channels: SupportChannel[];
  /** False when the shop has set no API key: the panel is the inbox alone. */
  assistant: boolean;
  /** The shop's own name and mark, so the panel is the shop's, not a widget. */
  brand: { name: string; logo: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The shop's Facebook row, read as an inbox rather than a page to look at.
  // Null when the shop has no Facebook link, and then there is simply no
  // second half to the panel.
  const fanpage = pickMessenger(channels);

  // The other row a person actually answers. Zalo is where most Vietnamese
  // customers already are, and the shop keeps the number on /bio beside the
  // Facebook one — so it costs nothing to offer both and let them choose.
  const zalo = pickZalo(channels);

  /** Whether there is any human on the other end at all. */
  const canMessage = Boolean(fanpage || zalo);

  /**
   * Which half is showing. The assistant answers now and a person answers when
   * they are at the desk, so the instant one opens first — but that is a
   * default, not a verdict: whoever would rather type at a human presses one
   * button, and the panel remembers it next time.
   */
  const [mode, setMode] = useState<"ai" | "fanpage">(assistant ? "ai" : "fanpage");

  /**
   * Whether anyone is at the desk. Null until the panel is first opened.
   *
   * Read on the click and not during render: the server has its own clock and
   * this page can be served from a cache, so a status decided up there would
   * be stale by the time somebody read it — and would hydrate wrong besides.
   */
  const [status, setStatus] = useState<{ open: boolean; label: string } | null>(null);

  function toggle() {
    setOpen((value) => {
      if (value) return false;
      setStatus(supportStatus(new Date()));
      try {
        const saved = window.localStorage.getItem(MODE_KEY);
        if (saved === "fanpage" && canMessage) setMode("fanpage");
        if (saved === "ai" && assistant) setMode("ai");
      } catch {
        // Private windows and blocked site data: the default stands.
      }
      return true;
    });
  }

  function choose(next: "ai" | "fanpage") {
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // Not remembering it is a small loss; failing to switch is not.
    }
  }

  const showing = mode === "fanpage" && canMessage ? "fanpage" : assistant ? "ai" : "fanpage";

  // Nothing to say anything into: no assistant and no page to message. A tab
  // that opens an empty panel is worse than no tab.
  if (!assistant && !canMessage) return null;

  // /bio is a standalone link-in-bio card with no site chrome — the live page
  // carries no widget, and these same channels are already its whole content.
  if (pathname === "/bio") return null;

  // The admin area is staff-side: nobody in there needs customer care, and the
  // tab floats exactly over the bottom-right corner every admin table puts its
  // paging controls in.
  if (pathname.startsWith("/admin")) return null;

  // The basket's summary column ends in the "Thanh toán" button, in the very
  // corner the tab sits in — the one press the whole page exists for was
  // landing on customer care instead. Support is a click away in the footer
  // and on every product page; the checkout is not.
  if (pathname === "/cart") return null;

  return (
    // pointer-events-none on the frame, restored on each real control below.
    // The frame is as tall as the collapsed panel plus the tab, and the panel
    // inside it passes clicks through rather than swallowing them, which means
    // they land on the frame instead. Anything the page puts in that corner
    // became unclickable: the paging buttons on the admin lists sit there.
    // On a phone the bottom edge belongs to the bottom nav (h-16, sm:hidden),
    // so the whole thing lifts above it; from sm up it hinges on the window
    // edge as before.
    <div className="pointer-events-none fixed bottom-[calc(4rem+0.75rem)] right-3 z-[101] flex flex-col items-end sm:bottom-0 sm:right-4">
      <div
        className={`mb-0 w-[calc(100vw-2rem)] max-w-[340px] origin-bottom transition-all duration-300 ${
          canMessage ? "hidden sm:block " : ""
        }${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        // Hidden from the tree when collapsed so Tab does not land inside it.
        aria-hidden={!open}
        // A boolean, not "": React 19 reads an empty string as false, so the
        // panel was never actually inert while collapsed.
        inert={!open}
      >
        <div
          className={`mb-2 overflow-hidden rounded-[20px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.14)] ${GLASS}`}
        >
          {/* The shop's own mark and name, not a product name for a chat
              widget: whoever opens this wants to know they are talking to
              THICHTHIHACK, and the line under it is the one promise the panel
              makes — kept honest by the clock rather than always claiming five
              minutes. */}
          <div className="flex items-center gap-3 border-b border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-transparent px-4 py-3.5">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/[0.14] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              <Image
                src={brand.logo}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-black uppercase tracking-wide text-white">
                {brand.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span aria-hidden className={NAME_DOT(status)} />
                <span className="truncate">{status?.label ?? "Hỗ trợ khách hàng"}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <X size={15} />
            </button>
          </div>

          {/* The choice itself. Drawn only when there are two things to choose
              between — one button that cannot be pressed to anywhere else is
              furniture, not a control. The selected one is a lit pane rather
              than a block of colour: on glass, weight comes from the light
              catching an edge, not from filling a shape in. */}
          {assistant && canMessage ? (
            <div className="flex gap-1 border-b border-white/[0.07] bg-white/[0.03] p-1.5">
              <button
                type="button"
                onClick={() => choose("ai")}
                aria-pressed={showing === "ai"}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors ${
                  showing === "ai"
                    ? "border-white/[0.14] bg-white/[0.10] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "border-transparent text-neutral-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Bot
                  size={14}
                  className={showing === "ai" ? "text-[var(--menzu-accent)]" : ""}
                />
                Trợ lý AI
              </button>
              <button
                type="button"
                onClick={() => choose("fanpage")}
                aria-pressed={showing === "fanpage"}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors ${
                  showing === "fanpage"
                    ? "border-white/[0.14] bg-white/[0.10] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "border-transparent text-neutral-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <MessagesSquare
                  size={14}
                  className={showing === "fanpage" ? "text-[#4c8dff]" : ""}
                />
                Nhắn admin
              </button>
            </div>
          ) : null}

          {showing === "fanpage" && canMessage ? (
            <div className="flex flex-col gap-2.5 p-3">
              {/* No chat box embedded in here, and that is Meta's decision
                  rather than a shortcut: the Chat Plugin — the only thing that
                  ever put a real Messenger conversation inside somebody else's
                  page — was discontinued on 9 May 2024 and its script still
                  answers 500 today. Zalo has never offered one at all. So the
                  panel does the honest thing instead: it says who is on the
                  other end, and opens the app the customer already has. */}
              <p className="px-1 pt-0.5 text-[12px] leading-relaxed text-neutral-400">
                Chọn kênh bạn hay dùng — tin nhắn vào thẳng hộp thư của shop.
                Admin tư vấn chọn hack, xử lý đơn hàng và hướng dẫn cài đặt.
              </p>

              {fanpage ? (
                <ContactRow
                  iconUrl={fanpage.iconUrl}
                  action="Nhắn qua Messenger"
                  note="Fanpage chính thức của shop"
                  href={fanpage.chatUrl}
                  first
                />
              ) : null}

              {/* Lit only when there is no Messenger above it: two rows both
                  claiming to be the first one is no order at all. */}
              {zalo ? (
                <ContactRow
                  iconUrl={zalo.iconUrl}
                  action="Nhắn qua Zalo"
                  note="Số Zalo hỗ trợ của shop"
                  href={zalo.chatUrl}
                  first={!fanpage}
                />
              ) : null}

              {fanpage ? (
                <a
                  href={fanpage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-2 text-[12px] font-bold text-neutral-300 transition-colors hover:bg-white/[0.09] hover:text-white"
                >
                  <ExternalLink size={14} />
                  Xem fanpage
                </a>
              ) : null}

              <p className="px-1 text-center text-[10.5px] leading-relaxed text-neutral-500">
                Mở ở tab mới, trang shop vẫn giữ nguyên.
              </p>
            </div>
          ) : assistant ? (
            <AssistantChat />
          ) : null}

          {/* True whichever half is showing, and the reason the header can
              afford to promise minutes at all. */}
          <p className="flex items-center justify-center gap-1.5 border-t border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <Clock size={11} />
            Hỗ trợ {SUPPORT_WINDOW} hằng ngày
          </p>
        </div>
      </div>

      {/* The same pane as the panel, hinged at the bottom edge of the window.
          It carries no accent fill of its own — the shop's colour appears once,
          on the mark, and everything else is light on glass.

          On a phone the tab is the mark alone, a round button the size of a
          thumb: the wide tab covered a third of the bottom nav and its two
          lines of text were unreadable at that width anyway. The name moves
          into the aria-label, and the open state swaps the mark for a cross
          since the chevron that says so on wider screens is hidden here.

          And when the shop has a channel to press, the phone skips the panel:
          the round button wears a chat mark, and a tap fans out the Messenger
          and Zalo marks above it, each of which opens that conversation in
          its app. The same open flag drives the fan here and the panel on
          wider screens; only one of the two is ever on screen. */}
      {canMessage && open ? (
        // Behind everything in the frame (negative z inside its stacking
        // context), above the page and the bottom bar: the page dims, the two
        // pills stand alone, and a tap anywhere else closes them.
        <button
          type="button"
          onClick={toggle}
          aria-label="Đóng"
          className="pointer-events-auto fixed inset-0 -z-10 bg-black/60 backdrop-blur-[2px] sm:hidden"
        />
      ) : null}
      {canMessage ? (
        <div
          className={`mb-2.5 flex flex-col items-end gap-2.5 transition-all duration-200 sm:hidden ${
            open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
          }`}
          aria-hidden={!open}
          inert={!open}
        >
          {fanpage ? (
            <DirectChannel
              href={fanpage.chatUrl}
              iconUrl={fanpage.iconUrl}
              name="Facebook"
              label="Nhắn qua Messenger"
            />
          ) : null}
          {zalo ? (
            <DirectChannel href={zalo.chatUrl} iconUrl={zalo.iconUrl} name="Zalo" label="Nhắn qua Zalo" />
          ) : null}
        </div>
      ) : null}
      <div className="pointer-events-auto">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={assistant && !fanpage ? "Trợ lý AI" : "Hỗ trợ khách hàng"}
          className={`group flex h-14 w-14 items-center justify-center rounded-full text-left shadow-[0_12px_40px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors duration-200 hover:bg-[#14141c]/80 sm:h-auto sm:w-auto sm:min-w-[250px] sm:justify-start sm:gap-3 sm:rounded-none sm:rounded-t-[18px] sm:border-b-0 sm:px-3.5 sm:py-3 sm:shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] ${GLASS}`}
        >
          {/* Bare, with no tile around it. The tab is already a lit pane, so a
              second pane behind the icon was a box inside a box — and the mark
              reads stronger standing on the glass than boxed off from it.

              Named for what is actually behind it: a person when a person can
              be reached, the bot only when the bot is all there is. */}
          {open ? <X aria-hidden size={22} className="shrink-0 text-white sm:hidden" /> : null}
          {/* The phone's mark when there are channels to fan out: a chat
              bubble, since the press opens a choice of chats rather than a
              person. Wider screens keep the person or the bot. */}
          {canMessage && !open ? (
            <MessageCircle aria-hidden size={24} className="shrink-0 text-[var(--menzu-accent)] sm:hidden" />
          ) : null}
          {assistant && !fanpage ? (
            <Bot
              aria-hidden
              size={21}
              className={`shrink-0 text-[var(--menzu-accent)] ${open || canMessage ? "hidden sm:block" : ""}`}
            />
          ) : (
            <UserRound
              aria-hidden
              size={21}
              className={`shrink-0 text-[var(--menzu-accent)] ${open || canMessage ? "hidden sm:block" : ""}`}
            />
          )}

          <span className="hidden min-w-0 flex-1 sm:block">
            <span className="block text-[13px] font-bold leading-tight tracking-tight text-white">
              {assistant && !fanpage ? "Trợ lý AI" : "Hỗ trợ khách hàng"}
            </span>
            {/* The hours, not a status: this tab is server-rendered and can be
                served from a cache, and a green "online" frozen into a cached
                page would be lying at two in the morning. The live status is
                read from the browser's own clock when the panel opens. */}
            <span className="mt-0.5 block text-[10.5px] leading-tight text-neutral-500">
              Hỗ trợ {SUPPORT_WINDOW} hằng ngày
            </span>
          </span>

          <ChevronDown
            aria-hidden
            size={15}
            className={`hidden shrink-0 text-neutral-500 transition-[transform,color] duration-200 group-hover:text-white sm:block ${
              open ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
