import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Menzu Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = await getAdmin();
  // 404 rather than 403: a non-admin should not learn this area exists.
  if (!admin) notFound();

  const [products, available, sold, users, orders, revenue] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "AVAILABLE" } }),
    db.product.count({ where: { status: "SOLD" } }),
    db.user.count(),
    db.order.count({ where: { status: "PAID" } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
  ]);

  const stats = [
    { label: "Sản phẩm", value: String(products), sub: `${available} còn bán · ${sold} đã bán` },
    { label: "Người dùng", value: String(users), sub: "tài khoản đã đăng ký" },
    { label: "Đơn đã thanh toán", value: String(orders), sub: "trạng thái PAID" },
    {
      label: "Doanh thu",
      value: `${formatVnd(Number(revenue._sum.total ?? 0))}đ`,
      sub: "tổng đơn đã thanh toán",
    },
  ];

  return (
    <AdminShell
      title="Tổng quan"
      subtitle="Số liệu hệ thống, đọc trực tiếp từ cơ sở dữ liệu"
      username={admin.username}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-2"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              {s.label}
            </span>
            <span className="text-2xl font-black text-white">{s.value}</span>
            <span className="text-[11px] text-neutral-500">{s.sub}</span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
