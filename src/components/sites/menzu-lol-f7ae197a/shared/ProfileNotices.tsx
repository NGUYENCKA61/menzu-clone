"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, ChevronRight } from "lucide-react";

import { AnnouncementModal, type AnnouncementItem } from "./AnnouncementCenter";
import { NoticeTypeChip } from "./NoticeTypeChip";

/**
 * The account overview's "Thông báo hệ thống": the shop-wide notices (a
 * reader's own are "Thông báo của bạn" in the notice sheet and stay there),
 * where the four figures stood (the owner, 19/10/2026: "thử bỏ phần Số dư khả
 * dụng ... thay bằng phần thông báo hệ thống thử thiết kế tui xem").
 *
 * Each notice a raised card that lifts on hover and opens the notice in the
 * site's own sheet, read in full where the reader is ("card nổi bấm được để
 * xem thông báo đi"); the list scrolls in its own box with the thin vertical
 * bar the site's scroll areas wear ("có thanh line dọc cuộn"). "Xem tất cả"
 * still leads to /thong-bao.
 */
export function ProfileNotices({ items }: { items: AnnouncementItem[] }) {
  const [open, setOpen] = useState<AnnouncementItem | null>(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] sm:mt-2">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
        <h2 className="inline-flex items-center gap-2 text-[15px] font-bold text-frost">
          <Bell size={15} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
          Thông báo hệ thống
        </h2>
        <Link
          href="/thong-bao"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-mist transition-colors hover:text-frost"
        >
          Xem tất cả
          <ChevronRight size={14} aria-hidden />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 pb-5 pt-3 text-[14px] text-mist sm:px-6">
          Chưa có thông báo nào. Thông báo từ shop sẽ hiện ở đây.
        </p>
      ) : (
        <ul className="mt-3 flex max-h-[380px] flex-col gap-3 overflow-y-auto px-5 pb-5 pt-1 sm:max-h-[440px] sm:px-6">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpen(item)}
                className="group block w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left shadow-[0_1px_0_rgba(255,255,255,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <NoticeTypeChip type={item.type} />
                    <span className="lab-figure text-[13px] text-dim">{item.updatedLabel}</span>
                  </div>
                  <ChevronRight
                    size={16}
                    aria-hidden
                    className="shrink-0 text-dim transition group-hover:translate-x-0.5 group-hover:text-frost"
                  />
                </div>
                <p className="mt-2 line-clamp-1 text-[15px] font-semibold text-frost">
                  {item.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-mist">
                  {item.body}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open ? <AnnouncementModal item={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}
