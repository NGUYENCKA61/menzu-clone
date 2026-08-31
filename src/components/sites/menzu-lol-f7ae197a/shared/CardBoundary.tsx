"use client";

import { RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";

/**
 * A boundary around one listing card.
 *
 * The app's error page is the only boundary above the shelf, so a render
 * fault inside a single card — most often a browser extension that has
 * rewritten the card's DOM under React, which then fails to insert or
 * remove a node — used to take the whole page down to "500". Caught here
 * it costs one tile, which says so and offers a reload; the rest of the
 * shelf keeps working.
 */
export class CardBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-[15px] border border-dashed border-white/10 bg-[#101114] p-6 text-center">
        <p className="text-sm font-bold text-white">Thẻ này gặp lỗi hiển thị</p>
        <p className="text-[12px] leading-relaxed text-neutral-400">
          Thường do tiện ích trình duyệt (dịch trang, tải video…) can thiệp vào
          trang. Tải lại là được.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={12} />
          Tải lại trang
        </button>
      </div>
    );
  }
}
