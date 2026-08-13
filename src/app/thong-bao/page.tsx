import type { Metadata } from "next";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { currentAnnouncements } from "@/lib/announcementStore";
import { TYPE_LABELS } from "@/lib/announcements";
import { TYPE_ICONS, TYPE_TILE } from "@/components/sites/menzu-lol-f7ae197a/shared/announcementIcons";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Thông báo" };
export const dynamic = "force-dynamic";

function formatWhen(date: Date): string {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Where "Xem tất cả thông báo" lands.
 *
 * The same list the bell shows, in full rather than truncated to a line each.
 * Addressed notices are resolved against the reader here exactly as they are
 * for the dropdown, so a private notice is not readable by opening this page
 * signed out.
 */
export default async function AnnouncementsPage() {
  const user = await getCurrentUser();
  const announcements = await currentAnnouncements(user?.id ?? null);

  return (
    <SimplePage title="Thông báo" crumb="Thông báo">
      {announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-sm font-bold text-white">Chưa có thông báo nào</p>
          <p className="mt-1.5 text-[13px] text-neutral-400">
            Thông báo từ shop sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  // Same glyph as the bell list and the notice itself.
                  const Icon = TYPE_ICONS[item.type];
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${TYPE_TILE}`}
                    >
                      <Icon size={12} />
                      {TYPE_LABELS[item.type]}
                    </span>
                  );
                })()}
                <span className="text-[11px] text-neutral-500">
                  {formatWhen(item.startAt)}
                </span>
              </div>

              <h2 className="mt-3 text-[17px] font-bold leading-snug text-white">
                {item.title}
              </h2>

              {/* Plain text, rendered as text — the same rule the modal keeps.
                  whitespace-pre-line preserves the shop's own line breaks. */}
              <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-neutral-300">
                {item.body}
              </p>

              {item.bullets.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {item.bullets.map((line, index) => (
                    <li key={index} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--menzu-accent)]"
                      />
                      <span className="text-[13.5px] leading-relaxed text-neutral-300">
                        {line}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {item.noticeTitle && item.noticeBody ? (
                <div className="mt-4 rounded-r-lg border-l-2 border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/[0.06] px-4 py-3">
                  <p className="text-[13px] font-semibold text-[var(--menzu-accent)]">
                    {item.noticeTitle}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
                    {item.noticeBody}
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </SimplePage>
  );
}
