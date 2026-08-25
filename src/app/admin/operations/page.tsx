import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminOperations } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminOperations";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminSpinWins } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSpinWins";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { listFeedback, listTopUps } from "@/lib/queries";
import { expireStaleTopUps } from "@/lib/topupStore";

export const metadata: Metadata = { title: "Vận hành | Quản trị" };
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

export default async function AdminOperationsPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  // Retire stale requests before reading the list, so opening this screen is
  // itself enough to keep the queue current on a shop with no scheduler.
  await expireStaleTopUps();

  const [feedback, topUps, spinWins] = await Promise.all([
    listFeedback(),
    listTopUps(),
    // Only the prizes somebody has to post: money and points carry NONE and
    // are nobody's errand.
    db.spinWin.findMany({
      where: { status: { in: ["PENDING", "SENT"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        label: true,
        status: true,
        createdAt: true,
        user: { select: { username: true, uid: true } },
      },
    }),
  ]);

  return (
    <AdminShell
      title="Vận hành"
      subtitle="Đánh giá khách hàng, quà vòng quay và lịch sử nạp tiền"
      username={admin.username}
    >
      <AdminSpinWins
        wins={spinWins.map((win) => ({
          id: win.id,
          label: win.label,
          username: win.user.username,
          uid: win.user.uid,
          createdAt: formatWhen(win.createdAt),
          sent: win.status === "SENT",
        }))}
      />

      <AdminOperations
        // Both lists format their dates here, where the timezone is fixed —
        // doing it inside the client component would render one value on the
        // server and another in the browser.
        feedback={feedback.map((f) => ({ ...f, createdAt: formatWhen(f.createdAt) }))}
        topUps={topUps.map((t) => ({ ...t, createdAt: formatWhen(t.createdAt) }))}
      />
    </AdminShell>
  );
}
