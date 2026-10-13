"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Inbox,
  MessageCircle,
  MessagesSquare,
  Send,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { relativeTime } from "@/lib/announcements";
import { floatingWidgetHidden } from "@/lib/supportWidgetRoutes";
import { mergeMessages, POLL_MS, SHOP_MESSAGE_MAX, type ChatMessage } from "@/lib/warrantyChat";
import { INBOX_POLL_MS, INBOX_RECENT_DAYS, type InboxTicket, type InboxView } from "@/lib/warrantyInbox";
import { WARRANTY_STATUS, warrantyOpen, type WarrantyStatus } from "@/lib/warrantyRequests";

import { lockScroll, unlockScroll } from "./modalChrome";
import { FRAME, GLASS, LAUNCHER, PANEL_SHADOW } from "./supportChrome";
import { useClientNow } from "./useClientClock";
import { PHONE, useScrollingOnPhone } from "./useScrollingOnPhone";
import { WarrantyThread } from "./WarrantyThread";

type Tab = "waiting" | "open";

/** Where a Tab press may land inside the phone's sheet: the reply box too. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** One ticket's conversation as this tab knows it. */
interface ThreadState {
  id: string;
  status: WarrantyStatus;
  messages: ChatMessage[];
  /** The first read has come back. */
  loaded: boolean;
  /** The last read failed; the poll tries again. */
  failed: boolean;
}

/** The DOM id of a ticket's row, so focus can return to it from the thread. */
function rowDomId(prefix: string, ticketId: string): string {
  return `${prefix}-row-${ticketId}`;
}

/** Keeps a Tab press inside the phone's sheet, wrapping at either end. */
function trapTab(panel: HTMLElement, event: KeyboardEvent) {
  const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null,
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !panel.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

/** The buyer's picture, or the first letter of their name in its place. */
function BuyerMark({ name, src }: { name: string; src: string | null }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/40 text-[12px] font-black uppercase text-neutral-300"
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={36}
          height={36}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}

/** The ticket's state, as the desk's own chips draw it. */
function StatusChip({ status }: { status: WarrantyStatus }) {
  const state = WARRANTY_STATUS[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-px text-[9.5px] font-black uppercase tracking-wider ${state.tile}`}
    >
      <span aria-hidden className={`h-1 w-1 rounded-full ${state.dot}`} />
      {state.label}
    </span>
  );
}

/**
 * "5 phút trước", from the browser's own clock once it is known; the
 * server's stamp until then, so nothing is guessed during hydration.
 */
function Ago({ iso, stamp }: { iso: string; stamp: string }) {
  const now = useClientNow();
  return (
    <time dateTime={iso} title={stamp}>
      {now ? relativeTime(new Date(iso), new Date(now)) : stamp}
    </time>
  );
}

/** One ticket in the list; the whole row opens its thread. */
function TicketRow({
  ticket,
  domId,
  onPick,
}: {
  ticket: InboxTicket;
  domId: string;
  onPick: (ticket: InboxTicket) => void;
}) {
  return (
    <li>
      <button
        id={domId}
        type="button"
        onClick={() => onPick(ticket)}
        className="flex w-full items-start gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none"
      >
        <BuyerMark name={ticket.buyerName} src={ticket.buyerAvatar} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-white">
              {ticket.buyerName}
            </span>
            <span className="shrink-0 text-[10.5px] tabular-nums text-neutral-500">
              <Ago iso={ticket.last.sentAt} stamp={ticket.last.at} />
            </span>
            {ticket.waitingForShop ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--menzu-accent)]">
                <span className="sr-only">Chờ trả lời</span>
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
            <span className="font-semibold text-neutral-300">{ticket.orderCode}</span> ·{" "}
            {ticket.productName}
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5">
            <StatusChip status={ticket.status} />
            <span
              className={`min-w-0 truncate text-[11.5px] ${
                ticket.waitingForShop ? "font-semibold text-neutral-200" : "text-neutral-400"
              }`}
            >
              <span className="font-normal text-neutral-500">
                {ticket.last.fromShop ? "Shop: " : "Khách: "}
              </span>
              {ticket.last.text}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * The admin's warranty inbox, floating where customers see the support
 * bubble (the owner, 13/10/2026: "Với tài khoản admin bỏ qua phần chăm sóc
 * khách hàng chat mà thay vào đó là phần nhắn tin trao đổi khách hàng về bảo
 * hành"). Same corner, same size, same glass as SupportWidget.
 *
 * The tab counts the buyers waiting on the shop and asks again every
 * INBOX_POLL_MS while the page is on screen. The panel lists the tickets in
 * two tabs, opens one's thread in place, polls it like the ticket page does,
 * and answers through the same route the ticket page uses. Everything else
 * a ticket can need (moves, refunds, the bank form, the second-round answers)
 * stays on its admin page, one link away.
 */
export function AdminWarrantyInbox({ initial }: { initial: InboxView | null }) {
  const pathname = usePathname();
  const hidden = floatingWidgetHidden(pathname);
  const baseId = useId();
  const panelId = `${baseId}-panel`;

  const [inbox, setInbox] = useState<InboxView | null>(initial);
  // A fresh server render (router.refresh, a sign-in) brings fresh data:
  // adopted as it arrives, without an effect.
  const [seenInitial, setSeenInitial] = useState(initial);
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    if (initial) setInbox(initial);
  }

  /** The route said this is no longer an admin: put the widget away. */
  const [gone, setGone] = useState(false);
  const [open, setOpen] = useState(false);
  /** Opened on a phone, where the panel is a full-screen sheet (modal). */
  const [sheet, setSheet] = useState(false);
  // Leaving for a page that keeps the corner clear (the admin's own, the
  // basket), or losing the role, closes the panel: a sheet left "open" there
  // would hold the page's scroll lock with nothing on screen to release it.
  if (open && (hidden || gone)) setOpen(false);
  const [tab, setTab] = useState<Tab>(initial && initial.waiting > 0 ? "waiting" : "open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The ticket as it was when picked, in case it drops off the list. */
  const [picked, setPicked] = useState<InboxTicket | null>(null);
  const [thread, setThread] = useState<ThreadState | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const tucked = useScrollingOnPhone() && !open;

  const frameRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const backRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ waiting: null, open: null });
  /** Which row to hand focus back to on the way out of a thread. */
  const lastPickedRef = useRef<string | null>(null);
  /** Whether closing should put focus back on the tab (not on a link press). */
  const returnFocusRef = useRef(false);
  const selectedRef = useRef<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const statusRef = useRef<WarrantyStatus | null>(null);

  const tickets = inbox?.tickets ?? [];
  const waitingCount = inbox?.waiting ?? 0;
  const waitingList = tickets.filter((t) => t.waitingForShop);
  const openList = tickets.filter((t) => warrantyOpen(t.status));
  const closedList = tickets.filter((t) => !warrantyOpen(t.status));
  const selected = selectedId
    ? (tickets.find((t) => t.id === selectedId) ?? picked)
    : null;
  const threadHere = thread && selected && thread.id === selected.id ? thread : null;
  const status = threadHere?.status ?? selected?.status ?? null;
  const canReply = status !== null && warrantyOpen(status);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  // The poll's cursor: the newest line on screen, or the report itself.
  useEffect(() => {
    cursorRef.current = threadHere?.messages.at(-1)?.sentAt ?? selected?.report.sentAt ?? null;
  }, [threadHere, selected]);

  // ---- The list and the badge ------------------------------------------

  /** When the list was last read, as far as this tab knows. */
  const fetchedAtRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const againRef = useRef(false);

  const refresh = useCallback(async () => {
    // One read at a time; a call that lands mid-read asks for one more after.
    if (busyRef.current) {
      againRef.current = true;
      return;
    }
    busyRef.current = true;
    try {
      do {
        againRef.current = false;
        try {
          const res = await fetch("/api/admin/warranty-requests/inbox", { cache: "no-store" });
          if (res.status === 401 || res.status === 403) {
            setGone(true);
            return;
          }
          if (!res.ok) continue;
          const data = (await res.json()) as Partial<InboxView>;
          if (Array.isArray(data.tickets) && typeof data.waiting === "number") {
            setInbox({ tickets: data.tickets, waiting: data.waiting });
            fetchedAtRef.current = Date.now();
          }
        } catch {
          // Offline for a moment: the next tick tries again.
        }
      } while (againRef.current);
    } finally {
      busyRef.current = false;
    }
  }, []);

  // Every INBOX_POLL_MS while the tab is on screen, at once on coming back to
  // it after a while, and never on the admin's own pages (the widget is put
  // away there and the desk has its own pulse).
  useEffect(() => {
    if (gone || hidden) return;
    if (fetchedAtRef.current === null) {
      fetchedAtRef.current = initial ? Date.now() : 0;
    }
    const stale = () => Date.now() - (fetchedAtRef.current ?? 0) >= INBOX_POLL_MS;
    if (stale()) void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, INBOX_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && stale()) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // `initial` only seeds the first read time; a later one is adopted above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gone, hidden, refresh]);

  // ---- One ticket's thread ----------------------------------------------

  /** Reads a ticket's messages after `after` (all of them when null). */
  const pullThread = useCallback(async (id: string, after: string | null) => {
    try {
      const query = `id=${encodeURIComponent(id)}${after ? `&after=${encodeURIComponent(after)}` : ""}`;
      const res = await fetch(`/api/admin/warranty-requests/messages?${query}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        setGone(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { status?: WarrantyStatus; messages?: ChatMessage[] };
      // Picked another ticket while this was on its way: not this thread's news.
      if (selectedRef.current !== id) return;
      const fresh = data.messages ?? [];
      const moved = data.status !== undefined && data.status !== statusRef.current;
      setThread((prev) => {
        const base: ThreadState =
          prev && prev.id === id
            ? prev
            : { id, status: data.status ?? "OPEN", messages: [], loaded: false, failed: false };
        return {
          ...base,
          status: data.status ?? base.status,
          messages: fresh.length > 0 ? mergeMessages(base.messages, fresh) : base.messages,
          loaded: true,
          failed: false,
        };
      });
      // Moved elsewhere (the ticket page, another admin): the list follows.
      if (moved) void refresh();
    } catch {
      if (selectedRef.current !== id) return;
      setThread((prev) =>
        prev && prev.id === id
          ? { ...prev, failed: true }
          : { id, status: statusRef.current ?? "OPEN", messages: [], loaded: false, failed: true },
      );
    }
  }, [refresh]);

  /** Whether the open thread's first read has come back. */
  const loadedRef = useRef(false);
  useEffect(() => {
    loadedRef.current = threadHere?.loaded ?? false;
  }, [threadHere]);

  // The whole thread when a ticket is opened, then what follows it every
  // POLL_MS while the panel is open, the page on screen and the ticket open.
  // A closed ticket is read once; its thread no longer changes.
  useEffect(() => {
    if (!open || !selectedId || gone) return;
    const id = selectedId;
    void pullThread(id, null);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const closed = statusRef.current !== null && !warrantyOpen(statusRef.current);
      if (closed && loadedRef.current) return;
      void pullThread(id, loadedRef.current ? cursorRef.current : null);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, selectedId, gone, pullThread]);

  // ---- Opening, closing, focus -----------------------------------------

  const close = useCallback((returnFocus: boolean) => {
    returnFocusRef.current = returnFocus;
    setOpen(false);
  }, []);

  function toggle() {
    if (open) {
      close(true);
      return;
    }
    setSheet(window.matchMedia(PHONE).matches);
    setOpen(true);
    // A list a minute old is not worth reading again before it is shown.
    if (Date.now() - (fetchedAtRef.current ?? 0) > 10_000) void refresh();
  }

  function pick(ticket: InboxTicket) {
    // A half-written reply survives a trip back to the list and into the
    // same ticket; it is dropped only when another ticket is opened.
    const sameAsBefore = lastPickedRef.current === ticket.id;
    lastPickedRef.current = ticket.id;
    setPicked(ticket);
    setSelectedId(ticket.id);
    setSendError(null);
    if (!sameAsBefore) setText("");
  }

  function back() {
    setSelectedId(null);
    setSendError(null);
  }

  // Focus follows the view: the back button in a thread, the row just left
  // (or the tab) in the list. Escape, the cross and the tab itself close it
  // and hand focus back to the tab.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      if (selectedId) {
        backRef.current?.focus();
      } else {
        const row = lastPickedRef.current
          ? document.getElementById(rowDomId(baseId, lastPickedRef.current))
          : null;
        (row ?? tabRefs.current[tab])?.focus();
      }
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      if (returnFocusRef.current) launcherRef.current?.focus();
    }
    // The tab only matters on the way into the list; switching tabs moves
    // focus by itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId]);

  // Escape closes; on a phone, where the panel is the whole screen, Tab stays
  // inside it and the page under it holds still.
  useEffect(() => {
    if (!open) return;
    if (sheet) lockScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) {
        // Not while a dialog of the page's own is up over everything: that
        // Escape is for it. Some stay mounted while closed (the phone menu
        // slides), hidden and inert, and do not count.
        const other = [
          ...document.querySelectorAll('[aria-modal="true"]:not([aria-hidden="true"])'),
        ].some((el) => !frameRef.current?.contains(el) && el.closest("[inert]") === null);
        if (other) return;
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key === "Tab" && sheet && panelRef.current) {
        trapTab(panelRef.current, event);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (sheet) unlockScroll();
    };
  }, [open, sheet, close]);

  function onTabKey(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "waiting" ? "open" : "waiting";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  // ---- Answering ---------------------------------------------------------

  async function send() {
    const body = text.trim();
    if (!selected || sending || !body || !canReply) return;
    const id = selected.id;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/admin/warranty-requests/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, body }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401 || res.status === 403) {
        setGone(true);
        return;
      }
      // The admin may have moved to another ticket while this one was on its
      // way: its outcome belongs to the ticket it was sent for, never to the
      // draft or the error line of the one now open.
      const stillHere = selectedRef.current === id;
      if (!res.ok) {
        if (!stillHere) return;
        setSendError(data.error ?? "Không gửi được tin nhắn");
        // Refused because the ticket was closed meanwhile: the read brings
        // the new state, and the reply box gives way to the closed note.
        void pullThread(id, cursorRef.current);
        return;
      }
      if (!stillHere) {
        void refresh();
        return;
      }
      setText("");
      // The line comes back signed with this admin's name, and the ticket
      // stops waiting: both reads, at once rather than at the next tick.
      await Promise.all([pullThread(id, cursorRef.current), refresh()]);
    } catch {
      if (selectedRef.current === id) setSendError("Không kết nối được máy chủ");
    } finally {
      setSending(false);
    }
  }

  if (gone || hidden) return null;

  const listed = tab === "waiting" ? waitingList : openList;
  const summary =
    waitingCount > 0 ? `${waitingCount} khách chờ trả lời` : "Không có tin chờ trả lời";
  const badge = waitingCount > 99 ? "99+" : String(waitingCount);

  return (
    <div ref={frameRef} className={FRAME}>
      {open ? (
        <>
          {/* On a phone the panel is the whole screen, standing on solid
              ground rather than glass over a page that keeps moving. */}
          <div aria-hidden className="pointer-events-auto fixed inset-0 -z-10 bg-[#0c0d12] sm:hidden" />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal={sheet || undefined}
            aria-label="Tin nhắn bảo hành"
            className={`pointer-events-auto flex flex-col overflow-hidden max-sm:fixed max-sm:inset-0 max-sm:rounded-none max-sm:border-0 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:pt-[env(safe-area-inset-top)] sm:mb-2 sm:h-[min(580px,calc(100dvh-9rem))] sm:w-[380px] sm:rounded-[20px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 ${PANEL_SHADOW} ${GLASS}`}
          >
            {selected ? (
              <>
                {/* THE THREAD: who, which order, its state, the way back and
                    the way to the full ticket page. */}
                <div className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-transparent px-2.5 py-2.5">
                  <button
                    ref={backRef}
                    type="button"
                    onClick={back}
                    aria-label="Quay lại danh sách"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <ArrowLeft size={16} aria-hidden />
                  </button>
                  <BuyerMark name={selected.buyerName} src={selected.buyerAvatar} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-white">
                      {selected.buyerName}
                    </span>
                    <span className="block truncate text-[11px] text-neutral-500">
                      <span className="font-semibold text-neutral-300">{selected.orderCode}</span> ·{" "}
                      {selected.productName}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => close(true)}
                    aria-label="Đóng"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.03] px-4 py-2">
                  {status ? <StatusChip status={status} /> : <span />}
                  <Link
                    href={`/admin/warranty/${selected.id}`}
                    onClick={() => close(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400 transition-colors hover:text-white"
                  >
                    Mở trang đầy đủ
                    <ExternalLink size={12} aria-hidden />
                  </Link>
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-3">
                  {/* The report is known from the list, so it shows at once;
                      the rest of the thread fills in under it. */}
                  <WarrantyThread
                    viewer="shop"
                    buyerName={selected.buyerName}
                    buyerAvatar={selected.buyerAvatar}
                    buyerInitial={selected.buyerName.slice(0, 1)}
                    opening={selected.report}
                    messages={threadHere?.messages ?? []}
                    size="min-h-0 flex-1"
                    footer={
                      !threadHere?.loaded
                        ? threadHere?.failed
                          ? "Không tải được tin nhắn, đang thử lại."
                          : "Đang tải tin nhắn…"
                        : threadHere.failed
                          ? "Mất kết nối, đang thử lại."
                          : null
                    }
                  />
                </div>

                {canReply ? (
                  <div className="shrink-0 border-t border-white/[0.07] bg-white/[0.02] p-3">
                    <div className="flex items-end gap-2">
                      {/* 16px on a phone: below that, iOS zooms the whole
                          sheet in on focus. */}
                      <textarea
                        value={text}
                        onChange={(event) => {
                          setText(event.target.value.slice(0, SHOP_MESSAGE_MAX));
                          if (sendError) setSendError(null);
                        }}
                        onKeyDown={(event) => {
                          // Enter sends where there is a keyboard, Shift+Enter is
                          // a new line; on a phone Enter is a new line and the
                          // button sends. Ctrl/⌘+Enter sends anywhere, as on the
                          // ticket page. Never mid-composition: a Vietnamese
                          // keyboard is still building the letter.
                          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                          const coarse = window.matchMedia("(pointer: coarse)").matches;
                          if (event.ctrlKey || event.metaKey || (!event.shiftKey && !coarse)) {
                            event.preventDefault();
                            void send();
                          }
                        }}
                        rows={Math.min(4, Math.max(1, text.split("\n").length))}
                        maxLength={SHOP_MESSAGE_MAX}
                        placeholder="Nhắn cho khách…"
                        aria-label="Trả lời khách"
                        className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-base leading-snug sm:text-[13px] text-white placeholder-neutral-600 outline-none transition-colors focus:border-[var(--menzu-accent)]/60"
                      />
                      <button
                        type="button"
                        onClick={() => void send()}
                        disabled={sending || text.trim().length === 0}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--menzu-accent)] px-3 text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Send size={15} aria-hidden />
                        {sending ? "Đang gửi…" : "Gửi"}
                      </button>
                    </div>
                    {sendError ? (
                      <p role="alert" className="mt-2 text-[12px] font-semibold text-rose-300">
                        {sendError}
                      </p>
                    ) : null}
                    {text.length > SHOP_MESSAGE_MAX - 100 ? (
                      <p className="mt-1 text-right text-[10.5px] tabular-nums text-neutral-500">
                        {text.length}/{SHOP_MESSAGE_MAX}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="shrink-0 border-t border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[12px] text-neutral-500">
                    Yêu cầu đã xong, khung trao đổi đã đóng.
                  </p>
                )}
              </>
            ) : (
              <>
                {/* THE LIST: what the panel is, how many are waiting, and
                    the way out. */}
                <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-transparent px-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/[0.14] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <MessagesSquare size={18} aria-hidden className="text-[var(--menzu-accent)]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-black text-white">
                      Tin nhắn bảo hành
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-400">
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          waitingCount > 0 ? "bg-[var(--menzu-accent)]" : "bg-neutral-600"
                        }`}
                      />
                      <span className="truncate">{summary}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => close(true)}
                    aria-label="Đóng"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <X size={15} aria-hidden />
                  </button>
                </div>

                {/* The two views, drawn like the support panel's chooser: the
                    selected one a lit pane, the other plain. */}
                <div
                  role="tablist"
                  aria-label="Lọc yêu cầu bảo hành"
                  className="flex shrink-0 gap-1 border-b border-white/[0.07] bg-white/[0.03] p-1.5"
                >
                  {(
                    [
                      { key: "waiting", label: "Chờ trả lời", count: waitingList.length },
                      { key: "open", label: "Đang mở", count: openList.length },
                    ] as const
                  ).map((item) => {
                    const on = tab === item.key;
                    return (
                      <button
                        key={item.key}
                        ref={(el) => {
                          tabRefs.current[item.key] = el;
                        }}
                        id={`${baseId}-tab-${item.key}`}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        aria-controls={`${baseId}-list`}
                        tabIndex={on ? 0 : -1}
                        onClick={() => setTab(item.key)}
                        onKeyDown={onTabKey}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors ${
                          on
                            ? "border-white/[0.14] bg-white/[0.10] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                            : "border-transparent text-neutral-400 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        {item.label}
                        <span
                          className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                            item.key === "waiting" && item.count > 0
                              ? "bg-[var(--menzu-accent)] text-white"
                              : "bg-white/10 text-neutral-300"
                          }`}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  id={`${baseId}-list`}
                  role="tabpanel"
                  aria-labelledby={`${baseId}-tab-${tab}`}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                >
                  {listed.length === 0 ? (
                    <div className="flex flex-col items-center px-6 py-10 text-center">
                      <Inbox size={28} aria-hidden className="text-neutral-600" />
                      <p className="mt-3 text-[13px] font-bold text-white">
                        {tab === "waiting"
                          ? "Không có khách nào chờ trả lời"
                          : "Không có yêu cầu bảo hành nào đang mở"}
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-neutral-500">
                        {inbox === null
                          ? "Đang tải danh sách…"
                          : "Tin mới của khách sẽ hiện ở đây."}
                      </p>
                    </div>
                  ) : (
                    <ul>
                      {listed.map((ticket) => (
                        <TicketRow
                          key={ticket.id}
                          ticket={ticket}
                          domId={rowDomId(baseId, ticket.id)}
                          onPick={pick}
                        />
                      ))}
                    </ul>
                  )}
                  {/* Closed tickets still talked about this week, under the
                      open ones: read-only, for the context of a recent fix. */}
                  {tab === "open" && closedList.length > 0 ? (
                    <>
                      <p className="border-b border-white/[0.05] bg-white/[0.02] px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        Đã xong trong {INBOX_RECENT_DAYS} ngày qua
                      </p>
                      <ul>
                        {closedList.map((ticket) => (
                          <TicketRow
                            key={ticket.id}
                            ticket={ticket}
                            domId={rowDomId(baseId, ticket.id)}
                            onPick={pick}
                          />
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>

                <Link
                  href="/admin/warranty"
                  onClick={() => close(false)}
                  className="flex shrink-0 items-center justify-center gap-1.5 border-t border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-white"
                >
                  Xem tất cả yêu cầu
                  <ChevronRight size={12} aria-hidden />
                </Link>
              </>
            )}
          </div>
        </>
      ) : null}

      {/* The same tab as the support widget's, in the same place: tucked
          while the phone scrolls, put away on a phone while its sheet is up
          (the sheet has its own cross). */}
      <div
        className={`pointer-events-auto transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none ${
          tucked ? "max-sm:opacity-60 max-sm:motion-safe:translate-x-[calc(50%+0.75rem)]" : ""
        } ${open ? "max-sm:hidden" : ""}`}
      >
        <button
          ref={launcherRef}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={`Tin nhắn bảo hành, ${summary.toLowerCase()}`}
          className={`relative ${LAUNCHER}`}
        >
          {/* The phone's mark: a chat bubble. Wider screens show the inbox
              mark beside the name. */}
          <MessageCircle aria-hidden size={24} className="shrink-0 text-[var(--menzu-accent)] sm:hidden" />
          <MessagesSquare
            aria-hidden
            size={21}
            className="hidden shrink-0 text-[var(--menzu-accent)] sm:block"
          />

          <span className="hidden min-w-0 flex-1 sm:block">
            <span className="block text-[13px] font-bold leading-tight tracking-tight text-white">
              Tin nhắn bảo hành
            </span>
            <span className="mt-0.5 block text-[10.5px] leading-tight text-neutral-500">
              {summary}
            </span>
          </span>

          {/* Red only when somebody is waiting: a zero is no news. */}
          {waitingCount > 0 ? (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--menzu-accent)] px-1 text-[10px] font-black tabular-nums leading-none text-white shadow-[0_0_0_2px_rgba(0,0,0,0.35)] sm:static sm:shrink-0"
            >
              {badge}
            </span>
          ) : null}

          <ChevronDown
            aria-hidden
            size={15}
            className={`hidden shrink-0 text-neutral-500 transition-[transform,color] duration-200 group-hover:text-white motion-reduce:transition-none sm:block ${
              open ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
