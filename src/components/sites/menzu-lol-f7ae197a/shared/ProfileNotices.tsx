import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";

import type { AnnouncementRow } from "@/lib/announcementStore";
import { SHOP_TZ } from "@/lib/dayGroups";

import { NoticeTypeChip } from "./NoticeTypeChip";

function day(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: SHOP_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * The account overview's "Thông báo hệ thống": the newest notices the shop
 * has out for everyone (a reader's own are "Thông báo của bạn" in the
 * notice sheet and stay there), where the four figures
 * stood (the owner, 19/10/2026: "thử bỏ phần Số dư khả dụng ... thay bằng
 * phần thông báo hệ thống thử thiết kế tui xem"). Each row the notices
 * page's chip and date, the title on one line and two lines of the body;
 * the whole list opens on /thong-bao, where every notice reads in full.
 */
export function ProfileNotices({ notices }: { notices: AnnouncementRow[] }) {
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
      {notices.length === 0 ? (
        <p className="px-5 pb-5 pt-3 text-[14px] text-mist sm:px-6">
          Chưa có thông báo nào. Thông báo từ shop sẽ hiện ở đây.
        </p>
      ) : (
        <ul className="mt-2">
          {notices.map((notice, index) => (
            <li key={notice.id} className={index > 0 ? "border-t border-white/[0.06]" : ""}>
              <Link
                href="/thong-bao"
                className="block px-5 py-4 transition-colors hover:bg-white/[0.03] sm:px-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <NoticeTypeChip type={notice.type} />
                  <span className="lab-figure text-[13px] text-dim">{day(notice.startAt)}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-[15px] font-semibold text-frost">
                  {notice.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-mist">
                  {notice.body}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
