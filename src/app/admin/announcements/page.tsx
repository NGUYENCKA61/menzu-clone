import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminAnnouncements } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminAnnouncements";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { announcementState } from "@/lib/announcements";
import { listAnnouncements } from "@/lib/announcementStore";

export const metadata: Metadata = { title: "Thông báo | Quản trị" };
export const dynamic = "force-dynamic";

/** For the <input type="datetime-local"> fields, which want local wall time. */
function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function formatWhen(date: Date): string {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAnnouncementsPage() {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const rows = await listAnnouncements();
  const now = new Date();

  return (
    <AdminShell
      title="Thông báo hệ thống"
      subtitle="Thông báo hiện trên trang cho khách, tự bật tắt theo lịch"
      username={admin.username}
    >
      <AdminAnnouncements
        announcements={rows.map((row) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          type: row.type,
          priority: row.priority,
          status: row.status,
          audience: row.audience,
          recipients: row.recipients,
          bullets: row.bullets,
          noticeTitle: row.noticeTitle,
          noticeBody: row.noticeBody,
          // Derived here rather than in the browser, so a stale tab cannot
          // report a notice as running after its window closed.
          state: announcementState(row, now),
          startAtInput: toLocalInput(row.startAt),
          endAtInput: toLocalInput(row.endAt),
          startAt: formatWhen(row.startAt),
          endAt: row.endAt ? formatWhen(row.endAt) : null,
        }))}
      />
    </AdminShell>
  );
}
