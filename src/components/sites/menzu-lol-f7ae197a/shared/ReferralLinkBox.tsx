"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";

/**
 * The referral link with its copy button. The link arrives fully built from
 * the server (origin included), so what is shown is exactly what lands on
 * the clipboard — no client-side origin games, no hydration mismatch.
 */
export function ReferralLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  async function copy() {
    // Clipboard can be denied even with the textarea behind it; selecting
    // the text still works by hand.
    if (!(await copyText(link))) return;
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        readOnly
        value={link}
        onFocus={(event) => event.target.select()}
        aria-label="Liên kết giới thiệu của bạn"
        className="w-full flex-1 rounded-xl border-[1.5px] border-red-500/20 bg-transparent px-4 py-3 font-mono text-sm text-white outline-none transition-colors focus:border-red-500/60"
      />
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 min-w-[130px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-dark)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--brand)]"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Đã chép" : "Chép link"}
      </button>
    </div>
  );
}
