"use client";

import { ArrowRight, Bell, BellOff, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  dismissalKey,
  isSnoozed,
  relativeTime,
  SNOOZE_MS,
  TYPE_HEADINGS,
  TYPE_LABELS,
  type AnnouncementPriority,
  type AnnouncementType,
} from "@/lib/announcements";

import {
  SOFTWARE_STATUS,
  STATUS_EVENT_COPY,
  type SoftwareStatusValue,
} from "@/lib/softwareStatus";

import { TYPE_ICONS, TYPE_TILE } from "./announcementIcons";
import { useClientNow } from "./useClientClock";

export interface AnnouncementItem {
  id: string;
  title: string;
  /** Plain text. Rendered as text — see the note on the model. */
  body: string;
  /** The "Lưu ý" list. Empty when the shop wrote none. */
  bullets: string[];
  /** The callout box at the foot. Both or neither. */
  noticeTitle: string | null;
  noticeBody: string | null;
  /** An illustration above the body, when the shop attached one. */
  imageUrl: string | null;
  /** A button that takes the reader straight to what the notice is about —
   *  "Xem ngay" on a refund request lands on the request. Both or neither. */
  ctaLabel: string | null;
  ctaHref: string | null;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  revision: number;
  /** ISO; turned into "5 phút trước" in the browser, where the clock is. */
  startAt: string;
  /** Formatted on the server, where the timezone is fixed. */
  updatedLabel: string;
}

/** One status change of a tool the reader follows — a bell row that links
 *  to the tool rather than opening a notice. */
export interface StatusEventItem {
  id: string;
  productName: string;
  productHref: string;
  status: SoftwareStatusValue;
  /** ISO, measured against the reader's clock like `startAt`. */
  at: string;
}

/** What a browser remembers a status row under: the row is immutable, so
 *  its id is the whole key. */
function statusKey(id: string): string {
  return `menzu.status.${id}`;
}

/**
 * What this browser has already closed.
 *
 * localStorage rather than a table: a dismissal is a per-browser preference,
 * it is worthless to anybody else, and storing it server-side would mean a row
 * per visitor per notice that nobody will ever query.
 *
 * Read through a subscription rather than an effect, so the value arrives with
 * the first client render instead of one render later, and so a notice closed
 * in one tab stops nagging in the others.
 */
const SEEN_KEY = "menzu.announcement.seen";
const seenListeners = new Set<() => void>();

/** The raw string, because a snapshot has to be stable between reads. */
function readSeenRaw(): string {
  try {
    return window.localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    // Private mode, a full quota, or somebody's extension. Showing a notice
    // again is a much smaller failure than the site not rendering.
    return "";
  }
}

function subscribeSeen(listener: () => void): () => void {
  seenListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SEEN_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    seenListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeSeen(keys: Set<string>) {
  try {
    // Bounded: a shop running for years would otherwise grow this forever.
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...keys].slice(-100)));
  } catch {
    // Nothing to do — the notice reappears next visit, which is harmless.
  }
  // storage events do not fire in the tab that wrote, so this tab is told
  // directly.
  for (const notify of seenListeners) notify();
}

/**
 * "Not now", per notice, with an expiry.
 *
 * Per notice rather than one blanket quiet period: a shop that posts an urgent
 * maintenance warning while somebody is snoozing a promotion should still
 * reach them. Kept in its own key so clearing it never disturbs what has
 * actually been read.
 */
const SNOOZE_KEY = "menzu.announcement.snooze";

function readSnoozeRaw(): string {
  try {
    return window.localStorage.getItem(SNOOZE_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribeSnooze(listener: () => void): () => void {
  seenListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SNOOZE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    seenListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function useSnoozes(): Record<string, number> | null {
  const raw = useSyncExternalStore(subscribeSnooze, readSnoozeRaw, () => null);
  return useMemo(() => {
    if (raw === null) return null;
    try {
      const parsed = raw ? (JSON.parse(raw) as unknown) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, number>)
        : {};
    } catch {
      return {};
    }
  }, [raw]);
}

function writeSnooze(current: Record<string, number>, key: string, until: number) {
  // Expired entries are dropped on the way past, so this cannot grow without
  // bound on a shop that posts often.
  const now = Date.now();
  const next: Record<string, number> = { [key]: until };
  for (const [k, v] of Object.entries(current)) {
    if (typeof v === "number" && v > now) next[k] = v;
  }
  try {
    window.localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
  } catch {
    // The notice simply reappears, which is the harmless direction to fail.
  }
  for (const notify of seenListeners) notify();
}

/** Null until the browser has read the store; the server cannot know this. */
function useSeen(): Set<string> | null {
  const raw = useSyncExternalStore(subscribeSeen, readSeenRaw, () => null);
  return useMemo(() => {
    if (raw === null) return null;
    try {
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      return new Set(Array.isArray(list) ? list.filter((k) => typeof k === "string") : []);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
}

/**
 * The bell, its list, and the notice modal.
 *
 * One component rather than a bell in the header and a modal in the layout,
 * because they share one piece of state: what this browser has already read.
 * Split across two trees that would need a provider around the whole site to
 * keep the badge honest when somebody closes the modal.
 */
export function AnnouncementCenter({
  announcements,
  statusEvents = [],
}: {
  announcements: AnnouncementItem[];
  statusEvents?: StatusEventItem[];
}) {
  const now = useClientNow();
  const seen = useSeen();
  const snoozes = useSnoozes();
  const [openList, setOpenList] = useState(false);
  // What the visitor opened from the list, which outranks the automatic one.
  const [picked, setPicked] = useState<AnnouncementItem | null>(null);
  // Set the first time anything is closed, so the modal opens by itself once
  // per page load rather than marching through every unread notice in turn.
  const [autoDone, setAutoDone] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const unread = useMemo(
    () =>
      seen === null
        ? []
        : announcements.filter((a) => !seen.has(dismissalKey(a.id, a.revision))),
    [announcements, seen],
  );
  const unreadStatus = useMemo(
    () => (seen === null ? [] : statusEvents.filter((e) => !seen.has(statusKey(e.id)))),
    [statusEvents, seen],
  );
  // The badge counts both kinds; the modal only ever opens for a notice.
  const unreadCount = unread.length + unreadStatus.length;

  // Snoozed notices stay unread — they keep their place in the bell and their
  // dot in the list. All that is held back is the modal opening by itself.
  const autoTarget = useMemo(() => {
    if (seen === null || snoozes === null || now === null) return null;
    return (
      unread.find(
        (a) => !isSnoozed(snoozes[dismissalKey(a.id, a.revision)] ?? null, now),
      ) ?? null
    );
  }, [unread, snoozes, seen, now]);

  // Derived rather than stored: the first unread notice is showing precisely
  // because it is unread, so closing it — which marks it read — closes it. No
  // effect has to notice and no second copy of the truth can drift from it.
  const reading = picked ?? (autoDone ? null : autoTarget);

  const dismiss = useCallback(
    (item: AnnouncementItem) => {
      const next = new Set(seen ?? []);
      next.add(dismissalKey(item.id, item.revision));
      writeSeen(next);
      setPicked(null);
      setAutoDone(true);
    },
    [seen],
  );

  /**
   * Clears the badge without opening anything.
   *
   * Marks every notice currently on the list, not only the unread ones — the
   * set is keyed by id and revision, so re-adding one already there changes
   * nothing, and listing them all means a notice that arrives between two
   * renders is not quietly marked read without ever being shown.
   */
  const markAllRead = useCallback(() => {
    const next = new Set(seen ?? []);
    for (const item of announcements) next.add(dismissalKey(item.id, item.revision));
    for (const event of statusEvents) next.add(statusKey(event.id));
    writeSeen(next);
    setAutoDone(true);
  }, [announcements, statusEvents, seen]);

  /** A status row is read the moment it is followed to the tool. */
  const readStatus = useCallback(
    (event: StatusEventItem) => {
      const next = new Set(seen ?? []);
      next.add(statusKey(event.id));
      writeSeen(next);
    },
    [seen],
  );

  const snooze = useCallback(
    (item: AnnouncementItem) => {
      writeSnooze(
        snoozes ?? {},
        dismissalKey(item.id, item.revision),
        Date.now() + SNOOZE_MS,
      );
      setPicked(null);
      setAutoDone(true);
    },
    [snoozes],
  );

  // Clicking away closes the list. Pointerdown rather than click, so it fires
  // before a link inside the list would navigate.
  useEffect(() => {
    if (!openList) return;
    const onDown = (event: PointerEvent) => {
      if (!listRef.current?.contains(event.target as Node)) setOpenList(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenList(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openList]);

  // The bell is drawn whether or not the shop has anything to say. It used to
  // hide itself when the list was empty, back when the header carried a second
  // decorative bell that was always there; that one is gone, and a header
  // whose notification icon appears and disappears reads as broken rather than
  // as quiet.

  return (
    <>
      <div ref={listRef} className="relative">
        <button
          type="button"
          onClick={() => setOpenList((open) => !open)}
          aria-label={
            unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"
          }
          aria-expanded={openList}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Bell size={16} />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>

        {openList ? (
          <div className="absolute right-0 top-11 z-50 w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#12141c] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <span className="text-[14px] font-bold text-white">Thông báo</span>
              {/* Only offered when it would do something. A control that is
                  always there and usually inert teaches people to ignore it. */}
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] font-black uppercase tracking-widest text-[var(--menzu-accent)] transition-opacity hover:opacity-80"
                >
                  Đánh dấu đã đọc
                </button>
              ) : null}
            </div>

            <div className="max-h-[340px] overflow-y-auto">
              {announcements.length === 0 && statusEvents.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-600">
                    <BellOff size={18} />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold text-neutral-300">
                    Chưa có thông báo nào
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Thông báo từ shop sẽ hiện ở đây.
                  </p>
                </div>
              ) : null}

              {announcements.map((item) => {
                const isUnread = unread.some((a) => a.id === item.id);
                const Icon = TYPE_ICONS[item.type];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPicked(item);
                      setOpenList(false);
                    }}
                    // The unread wash is deliberately faint. It marks a row
                    // without competing with the dot, and a list where every
                    // row glows is a list nobody scans.
                    className={`flex w-full items-start gap-3 border-b border-white/[0.07] px-4 py-3 text-left transition-colors last:border-0 ${
                      isUnread
                        ? "bg-[var(--menzu-accent)]/[0.06] hover:bg-[var(--menzu-accent)]/[0.1]"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${TYPE_TILE}`}
                    >
                      <Icon size={16} />
                    </span>

                    <span className="min-w-0 flex-1">
                      {/* The kind, then the headline. Naming the kind in the
                          accent above the title is what makes a column of five
                          notices scannable without reading any of them. */}
                      <span className="block text-[10px] font-black uppercase tracking-widest text-[var(--menzu-accent)]">
                        {TYPE_LABELS[item.type]}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[13px] font-bold ${
                          isUnread ? "text-white" : "text-neutral-300"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-neutral-400">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[10px] text-neutral-600">
                        {now === null ? "" : relativeTime(new Date(item.startAt), new Date(now))}
                      </span>
                    </span>

                    {isUnread ? (
                      <span
                        aria-label="Chưa đọc"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--menzu-accent)]"
                      />
                    ) : null}
                  </button>
                );
              })}

              {/* The tools this reader follows, under the shop's notices. A
                  row is a link to the tool — there is nothing more to read
                  than the line itself — and following it marks it read. */}
              {statusEvents.length > 0 ? (
                <div className="border-t border-white/[0.07] px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Trạng thái hack
                </div>
              ) : null}
              {statusEvents.map((event) => {
                const isUnread = unreadStatus.some((e) => e.id === event.id);
                const state = SOFTWARE_STATUS[event.status];
                return (
                  <Link
                    key={event.id}
                    href={event.productHref}
                    onClick={() => {
                      readStatus(event);
                      setOpenList(false);
                    }}
                    className={`flex w-full items-start gap-3 border-b border-white/[0.07] px-4 py-3 text-left transition-colors last:border-0 ${
                      isUnread
                        ? "bg-[var(--menzu-accent)]/[0.06] hover:bg-[var(--menzu-accent)]/[0.1]"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${state.tile}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${state.dot}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[10px] font-black uppercase tracking-widest ${state.text}`}>
                        {state.label}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[13px] font-bold ${
                          isUnread ? "text-white" : "text-neutral-300"
                        }`}
                      >
                        {event.productName}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-neutral-400">
                        {STATUS_EVENT_COPY[event.status]}
                      </span>
                      <span className="mt-1 block text-[10px] text-neutral-600">
                        {now === null ? "" : relativeTime(new Date(event.at), new Date(now))}
                      </span>
                    </span>
                    {isUnread ? (
                      <span
                        aria-label="Chưa đọc"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--menzu-accent)]"
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>

            <Link
              href="/thong-bao"
              onClick={() => setOpenList(false)}
              className="block border-t border-white/[0.07] px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest text-[var(--menzu-accent)] transition-colors hover:bg-white/[0.03]"
            >
              Xem tất cả thông báo →
            </Link>
          </div>
        ) : null}
      </div>

      {reading ? (
        <AnnouncementModal
          item={reading}
          onClose={() => dismiss(reading)}
          onSnooze={() => snooze(reading)}
        />
      ) : null}
    </>
  );
}

/**
 * The notice itself.
 *
 * Three bands separated by hairlines, as the payment confirmation is: a header
 * naming what this is, the notice, and the two ways out of it. Everything in
 * the middle band is optional except the body, so a one-line "shop nghỉ Tết"
 * renders as a short card rather than an outline with empty slots in it.
 *
 * The two actions carry different weight because they do not mean the same
 * thing. Closing settles the notice; snoozing only quiets it, and the label
 * says for how long rather than leaving the reader to guess.
 */
export function AnnouncementModal({
  item,
  onClose,
  onSnooze,
}: {
  item: AnnouncementItem;
  onClose: () => void;
  onSnooze: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const HeaderIcon = TYPE_ICONS[item.type];

  /**
   * The latest onClose, reachable from an effect that does not depend on it.
   *
   * The parent re-renders every second — a shared clock drives the "5 phút
   * trước" labels in the bell list — and onClose is a fresh closure each time.
   * Naming it as a dependency below therefore tore the effect down and set it
   * up again every second, and its first act is to focus the panel: whatever
   * button the reader had just tabbed to lost focus within the second.
   */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Keyed to the notice, not to the callback: a different notice deserves the
  // focus and the scroll lock afresh, a re-render of the same one does not.
  useEffect(() => {
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep Tab inside the sheet; behind it is the page the reader was on,
      // and reaching it without seeing it is disorienting.
      const stops = panel.current?.querySelectorAll<HTMLElement>("button");
      if (!stops?.length) return;
      const first = stops[0]!;
      const last = stops[stops.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [item.id, item.revision]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        tabIndex={-1}
        className="relative flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e0e11] shadow-2xl outline-none"
      >
        {/* A single accent rule along the top edge — the one piece of colour
            the frame gets, so the eye lands on the sheet before the words. */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-rose-500/70" />

        <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          {/* The kind's own glyph, the same one the bell list and the admin
              table use. It replaced a fixed "!", which read as a warning on a
              notice that was handing somebody a present. */}
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${TYPE_TILE}`}
          >
            <HeaderIcon size={16} />
          </span>
          <h2 className="text-[15px] font-semibold text-white">
            {TYPE_HEADINGS[item.type]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="ml-auto text-neutral-600 transition-colors hover:text-neutral-300"
          >
            <X size={16} />
          </button>
        </header>

        {/* Scrolls on its own so a long notice never pushes the buttons off
            the bottom of a laptop screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <h3
            id="announcement-title"
            className="text-[20px] font-bold leading-snug text-white"
          >
            {item.title}
          </h3>
          <p className="mt-1.5 text-[12px] text-neutral-500">
            Cập nhật: {item.updatedLabel}
          </p>

          {item.imageUrl ? (
            // Edge to edge inside the sheet: the sheet is barely wider than
            // the picture, and a 420px cap left a ragged gap down the right.
            // The height is still capped, cropped rather than letterboxed (a
            // black band above a screenshot reads as a broken image), and the
            // whole picture is one click away.
            <a
              href={item.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-950 transition-colors hover:border-white/25"
            >
              <Image
                src={item.imageUrl}
                alt=""
                width={1120}
                height={630}
                className="max-h-[300px] w-full object-cover"
              />
            </a>
          ) : null}

          {/* whitespace-pre-line keeps the shop's line breaks. It is still
              text: React escapes it, and nothing here renders HTML. */}
          <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-neutral-300">
            {item.body}
          </p>

          {item.bullets.length > 0 ? (
            <>
              <p className="mt-5 text-[13px] font-semibold text-white">Lưu ý:</p>
              <ul className="mt-2.5 flex flex-col gap-2">
                {item.bullets.map((line, index) => (
                  <li key={index} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
                    />
                    <span className="text-[13.5px] leading-relaxed text-neutral-300">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {item.noticeTitle && item.noticeBody ? (
            // A left rule rather than a full border: it marks the passage as
            // set apart without drawing a second box inside the sheet.
            <div className="mt-5 rounded-r-lg border-l-2 border-rose-500 bg-rose-500/[0.06] px-4 py-3">
              <p className="text-[13px] font-semibold text-rose-400">{item.noticeTitle}</p>
              <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
                {item.noticeBody}
              </p>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-wrap justify-end gap-2.5 border-t border-white/[0.07] px-5 py-4">
          <button
            type="button"
            onClick={onSnooze}
            className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[13px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            Không hiện lại trong 2 giờ
          </button>
          {/* A gift notice says "Nhận quà" per the reference. It does what
              "Đóng" does — closes and marks read. The claiming itself is
              whatever the shop wrote in the body, because nothing in the
              codebase grants anything. */}
          {/* When the notice is about something with an address, the way there
              is the primary button and closing becomes the quiet one: a notice
              that names a screen and then leaves the reader to go find it has
              done half its job. */}
          {item.ctaLabel && item.ctaHref ? (
            <Link
              href={item.ctaHref}
              onClick={onClose}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-rose-500 px-6 text-[13px] font-semibold text-white transition-colors hover:bg-rose-600"
            >
              {item.ctaLabel}
              <ArrowRight size={14} />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={
              item.ctaLabel && item.ctaHref
                ? "h-10 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[13px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white"
                : "h-10 rounded-lg bg-rose-500 px-6 text-[13px] font-semibold text-white transition-colors hover:bg-rose-600"
            }
          >
            {item.type === "GIFT" ? "Nhận quà" : "Đóng"}
          </button>
        </footer>
      </div>
    </div>
  );
}

