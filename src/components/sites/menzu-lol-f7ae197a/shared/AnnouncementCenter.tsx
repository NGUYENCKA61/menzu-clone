"use client";

import { Bell, X } from "lucide-react";

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
  type AnnouncementPriority,
  type AnnouncementType,
} from "@/lib/announcements";

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
  type: AnnouncementType;
  priority: AnnouncementPriority;
  revision: number;
  /** ISO; turned into "5 phút trước" in the browser, where the clock is. */
  startAt: string;
  /** Formatted on the server, where the timezone is fixed. */
  updatedLabel: string;
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
}: {
  announcements: AnnouncementItem[];
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

  if (announcements.length === 0) return null;

  return (
    <>
      <div ref={listRef} className="relative">
        <button
          type="button"
          onClick={() => setOpenList((open) => !open)}
          aria-label={
            unread.length > 0 ? `Thông báo, ${unread.length} chưa đọc` : "Thông báo"
          }
          aria-expanded={openList}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Bell size={16} />
          {unread.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
              {unread.length}
            </span>
          ) : null}
        </button>

        {openList ? (
          <div className="absolute right-0 top-11 z-50 w-[300px] overflow-hidden rounded-xl border border-white/10 bg-[#12141c] shadow-2xl">
            <div className="border-b border-white/[0.07] px-4 py-3">
              <span className="text-[13px] font-semibold text-white">Thông báo</span>
            </div>

            <div className="max-h-[320px] overflow-y-auto">
              {announcements.map((item) => {
                const isUnread = unread.some((a) => a.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPicked(item);
                      setOpenList(false);
                    }}
                    className="flex w-full flex-col items-start gap-1 border-b border-white/[0.07] px-4 py-3 text-left last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="flex w-full items-center gap-2">
                      {isUnread ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      ) : null}
                      <span
                        className={`truncate text-[13px] ${
                          isUnread ? "font-semibold text-white" : "text-neutral-300"
                        }`}
                      >
                        {item.title}
                      </span>
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {now === null ? "" : relativeTime(new Date(item.startAt), new Date(now))}
                    </span>
                  </button>
                );
              })}
            </div>
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

  useEffect(() => {
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
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
  }, [onClose]);

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
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-[15px] font-bold leading-none text-rose-400">
            !
          </span>
          <h2 className="text-[15px] font-semibold text-white">Thông báo hệ thống</h2>
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
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-rose-500 px-6 text-[13px] font-semibold text-white transition-colors hover:bg-rose-600"
          >
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}

