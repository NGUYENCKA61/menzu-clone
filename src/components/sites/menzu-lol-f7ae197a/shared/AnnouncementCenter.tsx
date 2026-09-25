"use client";

import { ArrowRight, X } from "lucide-react";
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
  SNOOZE_MS,
  TYPE_HEADINGS,
  type AnnouncementPriority,
  type AnnouncementType,
} from "@/lib/announcements";

import { useClientNow } from "./useClientClock";
import { lockScroll, unlockScroll } from "./modalChrome";
import { useLeave } from "./useOverlayPresence";

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
 * The notice sheet, and the memory of what this browser has already read.
 *
 * It had a bell and a dropdown list in the header too, until the shop asked
 * for the notification icons to come off the storefront. What a customer
 * wants now lives on /thong-bao, which the header strip and the phone tab
 * bar both reach; this only decides whether an unread notice opens by
 * itself, once per page load.
 */
export function AnnouncementCenter({ announcements }: { announcements: AnnouncementItem[] }) {
  const now = useClientNow();
  const seen = useSeen();
  const snoozes = useSnoozes();
  // Set the first time anything is closed, so the sheet opens by itself once
  // per page load rather than marching through every unread notice in turn.
  const [autoDone, setAutoDone] = useState(false);

  const unread = useMemo(
    () =>
      seen === null
        ? []
        : announcements.filter((a) => !seen.has(dismissalKey(a.id, a.revision))),
    [announcements, seen],
  );
  // A snoozed notice is still unread; all that is held back is the sheet
  // opening by itself.
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
  const reading = autoDone ? null : autoTarget;

  const dismiss = useCallback(
    (item: AnnouncementItem) => {
      const next = new Set(seen ?? []);
      next.add(dismissalKey(item.id, item.revision));
      writeSeen(next);
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
      setAutoDone(true);
    },
    [snoozes],
  );

  // Nothing of its own in the header any more — the bell and its dropdown
  // came out on the owner's word. What is left is the sheet that opens by
  // itself for an unread notice; everything else a customer wants is on
  // /thong-bao, which the header strip and the phone tab bar both reach.
  return reading ? (
    <AnnouncementModal
      item={reading}
      onClose={() => dismiss(reading)}
      onSnooze={() => snooze(reading)}
    />
  ) : null;
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

  /**
   * The exit, and a stable way out. The parent re-renders every second — a
   * shared clock drives the "5 phút trước" labels in the bell list — and
   * onClose is a fresh closure each time; naming it as a dependency below
   * tore the effect down and set it up again every second, and its first
   * act is to focus the panel. `leave` never changes, and reads the latest
   * onClose when the exit ends.
   */
  const { leaving, leave } = useLeave(onClose);

  // Keyed to the notice, not to the callback: a different notice deserves the
  // focus and the scroll lock afresh, a re-render of the same one does not.
  useEffect(() => {
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        leave();
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

    lockScroll();

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [item.id, item.revision, leave]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" inert={leaving}>
      <div className={`order-modal-backdrop absolute inset-0 bg-black/75${leaving ? " order-modal-backdrop-out" : ""}`} onClick={leave} />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        tabIndex={-1}
        // The same short rise the receipt and the buy dialog make. This sheet
        // opens itself over the hero for a first-time visitor; appearing in
        // one frame read as a pop-up, not as the shop speaking.
        className={`order-modal-card relative flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e0e11] shadow-2xl outline-none${leaving ? " order-modal-card-out" : ""}`}
      >
        {/* A single accent rule along the top edge — the one piece of colour
            the frame gets, so the eye lands on the sheet before the words. */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[var(--menzu-accent)]/70" />

        {/* No glyph beside the heading: the shop asked for the notice icons
            to come off the storefront. The accent rule above and the heading
            say what this is. */}
        <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-white">
            {TYPE_HEADINGS[item.type]}
          </h2>
          <button
            type="button"
            onClick={leave}
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
                // Without this the optimizer offered "w=3840 2x" and every
                // phone took the full 1600px original (92 KB, the largest
                // response on a shelf page) for a box about 306px wide.
                sizes="(max-width: 640px) calc(100vw - 84px), 480px"
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
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--menzu-accent)]"
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
            <div className="mt-5 rounded-r-lg border-l-2 border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/[0.06] px-4 py-3">
              <p className="text-[13px] font-semibold text-[var(--menzu-accent)]">{item.noticeTitle}</p>
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
              onClick={leave}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--menzu-accent)] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
            >
              {item.ctaLabel}
              <ArrowRight size={14} />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={leave}
            className={
              item.ctaLabel && item.ctaHref
                ? "h-10 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[13px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white"
                : "h-10 rounded-lg bg-[var(--menzu-accent)] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
            }
          >
            {item.type === "GIFT" ? "Nhận quà" : "Đóng"}
          </button>
        </footer>
      </div>
    </div>
  );
}

