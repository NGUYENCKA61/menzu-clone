"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useTransition } from "react";

/**
 * The boundary above the root layout, for the one failure error.tsx cannot
 * catch: the root layout itself throwing. There was none, so that failure
 * showed Next's bare default. This must draw its own <html> and <body>,
 * since the layout that normally does is the thing that failed; no
 * header or footer for the same reason, and the site's own black so it
 * does not flash white.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#050508] text-white">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <p className="text-6xl sm:text-7xl font-black tracking-tighter text-[#ff3158] mb-3">500</p>
          <p className="text-xl font-bold text-white mb-2">ĐÃ CÓ LỖI XẢY RA</p>
          <p className="text-neutral-400 max-w-[520px]">
            Hệ thống gặp sự cố khi tải trang này. Bạn có thể thử lại — nếu vẫn lỗi,
            vui lòng quay lại sau ít phút.
          </p>
          {error.digest ? (
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
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ff3158] px-5 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[#e0234a] disabled:opacity-60"
            >
              {retrying ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
              {retrying ? "Đang thử lại…" : "Thử lại"}
            </button>
            {/* A plain anchor on purpose: the router may be what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/5 px-5 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-white/10"
            >
              Về trang chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
