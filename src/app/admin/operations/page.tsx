import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminOperations } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminOperations";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { listFeedback, listTopUps } from "@/lib/queries";
import { listSpinPrizesForAdmin } from "@/lib/spinPrizes";
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

const TABS = ["feedback", "topups", "refunds", "spin", "parcels"] as const;

export default async function AdminOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  // Retire stale requests before reading the list, so opening this screen is
  // itself enough to keep the queue current on a shop with no scheduler.
  await expireStaleTopUps();

  const [feedback, topUps, spinWins, refunds, spinPrizes] = await Promise.all([
    listFeedback(),
    listTopUps(),
    // Only the prizes somebody has to post: money and points carry NONE and
    // are nobody's errand.
    db.spinWin.findMany({
      where: { status: { in: ["PENDING", "SENT"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        label: true,
        status: true,
        createdAt: true,
        // Where it goes, so the parcel can be addressed without a second
        // screen. Null while the winner has not answered yet.
        recipient: true,
        phone: true,
        address: true,
        note: true,
        // What the shop has already answered, so the reply boxes open with it
        // rather than blank — an admin correcting a typo should not have to
        // retype the number.
        tracking: true,
        shopNote: true,
        user: { select: { username: true, uid: true } },
      },
    }),
    // Waiting ones first whatever their age, then newest within each state: a
    // request from last week that nobody answered must not sink under the
    // ones decided this morning.
    db.refundRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        status: true,
        method: true,
        amount: true,
        reason: true,
        imageUrl: true,
        createdAt: true,
        user: { select: { username: true, uid: true } },
        order: {
          select: {
            code: true,
            total: true,
            product: { select: { name: true, code: true } },
          },
        },
      },
    }),
    // Switched-off slices included: the editor edits the table, not the wheel.
    listSpinPrizesForAdmin(),
  ]);

  return (
    <AdminShell
      title="Vận hành"
      subtitle="Đánh giá khách hàng, quà vòng quay và lịch sử nạp tiền"
      username={admin.username}
    >
      <AdminOperations
        // Both lists format their dates here, where the timezone is fixed —
        // doing it inside the client component would render one value on the
        // server and another in the browser.
        feedback={feedback.map((f) => ({ ...f, createdAt: formatWhen(f.createdAt) }))}
        topUps={topUps.map((t) => ({ ...t, createdAt: formatWhen(t.createdAt) }))}
        refunds={refunds.map((r) => ({
          id: r.id,
          status: r.status,
          method: r.method,
          amount: r.amount === null ? null : `${formatVnd(Number(r.amount))}đ`,
          reason: r.reason,
          // The picture itself belongs on the detail page; the list only has
          // to say there is one.
          hasImage: r.imageUrl !== null,
          createdAt: formatWhen(r.createdAt),
          orderCode: r.order.code,
          productName: r.order.product.name ?? r.order.product.code,
          total: `${formatVnd(Number(r.order.total))}đ`,
          username: r.user.username,
          uid: r.user.uid,
        }))}
        spinWins={spinWins.map((win) => ({
          id: win.id,
          label: win.label,
          username: win.user.username,
          uid: win.user.uid,
          createdAt: formatWhen(win.createdAt),
          sent: win.status === "SENT",
          recipient: win.recipient,
          phone: win.phone,
          address: win.address,
          note: win.note,
          tracking: win.tracking,
          shopNote: win.shopNote,
        }))}
        spinPrizes={spinPrizes}
        // Whether the shop has a wheel of its own. False means it is still on
        // the table in code, which the editor says out loud rather than
        // pretending the defaults were chosen.
        spinStored={spinPrizes.some((p) => p.stored)}
        initialTab={
          TABS.includes(tab as (typeof TABS)[number])
            ? (tab as (typeof TABS)[number])
            : undefined
        }
      />
    </AdminShell>
  );
}
