import Link from "next/link";
import type { Metadata } from "next";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  // A 404 carries no content worth indexing, and letting crawlers keep it
  // costs real crawl budget on a catalogue where stock turns over.
  robots: { index: false, follow: true },
};

/**
 * Sold accounts keep their pages, so this is reached mainly by mistyped codes
 * and stale external links. Both are better served by a route back into the
 * catalogue than by a bare message.
 */
export default function NotFound() {
  return (
    <SimplePage title="Không tìm thấy trang" crumb="404">
      <div className="w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
        <p className="text-6xl sm:text-7xl font-black tracking-tighter text-[#7C3AED] mb-3">
          404
        </p>
        <p className="text-xl font-bold text-white mb-2">TRANG KHÔNG TỒN TẠI</p>
        <p className="text-neutral-400 max-w-[520px]">
          Đường dẫn bạn truy cập không đúng, hoặc tài khoản này đã được gỡ khỏi
          cửa hàng.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
          >
            Về trang chủ
          </Link>
          <Link
            href="/categories"
            className="inline-flex items-center h-10 px-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
          >
            Xem danh mục acc
          </Link>
        </div>
      </div>
    </SimplePage>
  );
}
