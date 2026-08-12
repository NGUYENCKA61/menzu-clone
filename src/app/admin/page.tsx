import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { startOfDayVn } from "@/lib/time";

export const metadata: Metadata = { title: "Menzu Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = await getAdmin();
  // 404 rather than 403: a non-admin should not learn this area exists.
  if (!admin) notFound();

  const since = startOfDayVn();
  const today = { createdAt: { gte: since } };

  const [
    available,
    users,
    cardToday,
    bankToday,
    incomeToday,
    revenueAllTime,
    cardAllTime,
    bankAllTime,
  ] =
    await Promise.all([
      db.product.count({ where: { status: "AVAILABLE" } }),
      db.user.count(),
      db.topUp.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { ...today, method: "CARD", status: "COMPLETED" },
      }),
      db.topUp.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { ...today, method: "BANK", status: "COMPLETED" },
      }),
      // Income is what customers actually paid for accounts today. Top-ups are
      // not income — money moving into a wallet is still the customer's until
      // they spend it.
      db.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: { ...today, status: "PAID" },
      }),
      db.order.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
      db.topUp.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { method: "CARD", status: "COMPLETED" },
      }),
      db.topUp.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { method: "BANK", status: "COMPLETED" },
      }),
    ]);

  const todayStats = [
    {
      label: "Thẻ đã nạp hôm nay",
      value: `${formatVnd(Number(cardToday._sum.amount ?? 0))}đ`,
      sub: `${cardToday._count} lượt nạp thẻ cào`,
    },
    {
      label: "Nạp bank hôm nay",
      value: `${formatVnd(Number(bankToday._sum.amount ?? 0))}đ`,
      sub: `${bankToday._count} lượt chuyển khoản`,
    },
    {
      label: "Thu nhập hôm nay",
      value: `${formatVnd(Number(incomeToday._sum.total ?? 0))}đ`,
      sub: `${incomeToday._count} đơn đã bán`,
    },
    {
      label: "Sản phẩm còn bán",
      value: String(available),
      sub: "đang mở bán trên web",
    },
  ];

  const totals = [
    { label: "Tổng thành viên", value: String(users), sub: "tài khoản đã đăng ký" },
    {
      label: "Tổng doanh thu",
      value: `${formatVnd(Number(revenueAllTime._sum.total ?? 0))}đ`,
      sub: "toàn bộ đơn đã thanh toán từ trước tới nay",
    },
    {
      label: "Tổng thẻ nạp",
      value: `${formatVnd(Number(cardAllTime._sum.amount ?? 0))}đ`,
      sub: `${cardAllTime._count} lượt nạp thẻ cào`,
    },
    {
      label: "Tổng nạp bank",
      value: `${formatVnd(Number(bankAllTime._sum.amount ?? 0))}đ`,
      sub: `${bankAllTime._count} lượt chuyển khoản`,
    },
  ];

  return (
    <AdminShell
      title="Tổng quan"
      subtitle="Số liệu hệ thống, đọc trực tiếp từ cơ sở dữ liệu"
      username={admin.username}
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Hôm nay</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/30 to-transparent" />
            <span className="text-[11px] text-neutral-500">
              từ 00:00 giờ Việt Nam
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {todayStats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Thống kê</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/30 to-transparent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {totals.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      <span className="text-2xl font-black text-white tabular-nums">{value}</span>
      <span className="text-[11px] text-neutral-500">{sub}</span>
    </div>
  );
}
