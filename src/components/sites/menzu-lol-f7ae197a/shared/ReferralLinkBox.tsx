"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";

/**
 * The referral link with its copy button. The link arrives fully built from
 * the server (origin included), so what is shown is exactly what lands on
 * the clipboard — no client-side origin games, no hydration mismatch.
 */
export function ReferralLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard can be denied; selecting the text still works by hand.
      return;
    }
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
        className="w-full flex-1 rounded-xl border-[1.5px] border-red-500/20 bg-[#111] px-4 py-3 font-mono text-sm text-white outline-none transition-colors focus:border-red-500/60"
      />
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--brand-dark)]"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Đã chép" : "Chép link"}
      </button>
    </div>
  );
}
