"use client";

import { Bell, Megaphone, X } from "lucide-react";

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
  relativeTime,
  TYPE_LABELS,
  type AnnouncementPriority,
  type AnnouncementType,
} from "@/lib/announcements";

import { useClientNow } from "./useClientClock";

export interface AnnouncementItem {
  id: string;
  title: string;
  /** Plain text. Rendered as text — see the note on the model. */
  body: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  revision: number;
  /** ISO; turned into "5 phút trước" in the browser, where the clock is. */
  startAt: string;
}

/** Restrained tints — a notice is read, and colour here is a label, not decor. */
const TYPE_TINT: Record<AnnouncementType, string> = {
  UPDATE: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  MAINTENANCE: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  PROMO: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  INFO: "border-white/10 bg-white/5 text-neutral-300",
};

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

  // Derived rather than stored: the first unread notice is showing precisely
  // because it is unread, so closing it — which marks it read — closes it. No
  // effect has to notice and no second copy of the truth can drift from it.
  const reading = picked ?? (autoDone || seen === null ? null : unread[0] ?? null);

  const dismiss = useCallback((item: AnnouncementItem) => {
    const next = new Set(seen ?? []);
    next.add(dismissalKey(item.id, item.revision));
    writeSeen(next);
    setPicked(null);
    setAutoDone(true);
  }, [seen]);

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
          now={now}
          onClose={() => dismiss(reading)}
        />
      ) : null}
    </>
  );
}

/**
 * The notice itself, built to the same rules as the payment confirmation:
 * three bands separated by hairlines, one action, nothing decorative
 * competing with the words the shop is trying to get read.
 */
function AnnouncementModal({
  item,
  now,
  onClose,
}: {
  item: AnnouncementItem;
  now: number | null;
  onClose: () => void;
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
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        tabIndex={-1}
        className="relative w-full max-w-[440px] rounded-xl border border-white/10 bg-[#12141c] shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 text-neutral-600 hover:text-neutral-300 transition-colors"
        >
          <X size={15} />
        </button>

        <header className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-neutral-300">
            <Megaphone size={16} />
          </span>
          <h2
            id="announcement-title"
            className="text-[14px] font-semibold text-white leading-tight"
          >
            Thông báo hệ thống
          </h2>
        </header>

        <div className="px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${TYPE_TINT[item.type]}`}
            >
              {TYPE_LABELS[item.type]}
            </span>
            <span className="text-[11px] text-neutral-500">
              {now === null ? "" : relativeTime(new Date(item.startAt), new Date(now))}
            </span>
          </div>

          <h3 className="mt-3 text-[15px] font-semibold leading-snug text-white">
            {item.title}
          </h3>
          {/* whitespace-pre-line keeps the shop's line breaks. It is still
              text: React escapes it, and nothing here renders HTML. */}
          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
            {item.body}
          </p>
        </div>

        <footer className="border-t border-white/[0.07] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-[13px] font-semibold text-white transition-colors"
          >
            Đã hiểu
          </button>
        </footer>
      </div>
    </div>
  );
}
