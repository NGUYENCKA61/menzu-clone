"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useTransition } from "react";

/**
 * Last-resort boundary for uncaught render and data errors.
 *
 * Must be a client component — React needs `reset` to re-run the failed
 * subtree on the client. The message shown is fixed rather than
 * `error.message`, because that string can carry query fragments or internal
 * paths; the real detail goes to the console and, in production, to whatever
 * Next is wired to report to.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // reset() re-renders the failed subtree; inside a transition the button
  // stays busy until that render has landed, instead of going silent the
  // way every other unanswered button on the site once did.
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white px-4 text-center">
      <p className="text-6xl sm:text-7xl font-black tracking-tighter text-[var(--brand)] mb-3">
        500
      </p>
      <p className="text-xl font-bold text-white mb-2">ĐÃ CÓ LỖI XẢY RA</p>
      <p className="text-neutral-400 max-w-[520px]">
        Hệ thống gặp sự cố khi tải trang này. Bạn có thể thử lại — nếu vẫn lỗi,
        vui lòng quay lại sau ít phút.
      </p>

      {error.digest ? (
        // Surfaced so a user can quote it in a support message; it is an opaque
        // hash, not internal detail.
        <p className="mt-3 text-[11px] font-mono uppercase tracking-widest text-neutral-600">
          Mã lỗi: {error.digest}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={retrying}
          aria-busy={retrying}
          onClick={() => startRetry(() => reset())}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white disabled:opacity-60"
        >
          {retrying ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {retrying ? "Đang thử lại…" : "Thử lại"}
        </button>
        <Link
          href="/"
          className="inline-flex items-center h-10 px-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
