"use client";

import { Check, Copy, Eye, EyeOff, KeyRound, Lock, User } from "lucide-react";
import { useEffect, useId, useState } from "react";

/** What the row is holding, which decides the glyph in front of it. */
const ICONS = { key: KeyRound, user: User, lock: Lock } as const;

/**
 * One licence key the buyer holds, with the one action anybody ever wants
 * from it.
 *
 * A key is a string nobody types by hand, so the row is a copy button rather
 * than a line of text with a button beside it. The confirmation replaces the
 * icon in place instead of announcing itself elsewhere on the page — the
 * press and the answer are then the same object.
 *
 * The same row hands over an account's sign-in, which is why it can wear a
 * user or lock glyph and, for the password, start masked: an order page is
 * read in public places, and the one value on it that lets a stranger in
 * should not be legible from across a café.
 */
export function CopyKey({
  value,
  note,
  expired = false,
  icon = "key",
  secret = false,
}: {
  value: string;
  note: string;
  expired?: boolean;
  icon?: keyof typeof ICONS;
  /** Masked until the eye is pressed. Copying works either way. */
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);
  // The span the fallback selects. Not derived from the value: two rows can
  // hold the same string — an account whose password is its username — and
  // the second would then select the first.
  const valueId = useId();
  const Icon = ICONS[icon];
  // What the button is for, said in words, because a masked value gives it
  // no name of its own: "Sao chép mật khẩu", "Sao chép key".
  const copyLabel = icon === "key" ? "key" : note.toLowerCase();

  // Cleared on a timer, and the timer is cleared with the component: a row
  // unmounted mid-countdown would otherwise set state on nothing.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be refused outright — an insecure origin, a
      // browser setting. Selecting the text is then the honest fallback, and
      // saying nothing is better than a success message that was not one.
      // A masked value is unmasked first: selecting a row of dots would copy
      // the dots.
      setRevealed(true);
      const selection = window.getSelection();
      const node = document.getElementById(valueId);
      if (selection && node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  return (
    <div
      className={`group flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
        expired
          ? "border-white/[0.06] bg-black/20"
          : "border-white/10 bg-black/30 hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/[0.06]"
      }`}
    >
      <button
        type="button"
        onClick={copy}
        aria-label={`Sao chép ${copyLabel}`}
        title="Bấm để sao chép"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <Icon
          size={12}
          aria-hidden
          className={`shrink-0 ${expired ? "text-neutral-600" : "text-[var(--brand)]"}`}
        />
        <span
          id={valueId}
          className={`flex-1 truncate font-mono text-[12px] ${
            expired ? "text-neutral-500 line-through" : "text-white"
          }`}
        >
          {revealed ? value : "•".repeat(Math.min(Math.max(value.length, 8), 24))}
        </span>
        <span
          className={`shrink-0 text-[10px] font-bold tabular-nums ${
            expired ? "text-red-400" : "text-neutral-500"
          }`}
        >
          {note}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-neutral-500 transition-colors group-hover:text-white"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </span>
      </button>
      {/* The in-place tick is for eyes; this is the same answer for ears. */}
      <span role="status" className="sr-only">
        {copied ? "Đã sao chép" : ""}
      </span>
      {secret ? (
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      ) : null}
    </div>
  );
}
