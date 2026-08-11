import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Menzu Admin | Đơn hàng" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Đã thanh toán",
  PENDING: "Chờ xử lý",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

const STATUS_CLASS: Record<string, string> = {
  PAID: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/30",
  REFUNDED: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
};

const METHOD_LABEL: Record<string, string> = {
  BUY_NOW: "Mua ngay",
  DEPOSIT: "Cọc / Góp",
  TRADE_IN: "Thu cũ đổi mới",
  PAY_LATER: "Trả sau",
};

export default async function AdminOrdersPage() {
  const admin = await getAdmin();
  if (!admin) notFound();

  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { username: true, uid: true } },
      product: { select: { code: true } },
      voucher: { select: { code: true } },
    },
  });

  return (
    <AdminShell
      title="Đơn hàng"
      subtitle="Toàn bộ đơn trên hệ thống, mới nhất trước"
      username={admin.username}
    >
      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-white/10">
              {[
                "Mã đơn & Thời gian",
                "Khách hàng",
                "Sản phẩm",
                "Hình thức",
                "Giá gốc & Giảm",
                "Thành tiền",
                "Trạng thái",
              ].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-neutral-400">
                  Chưa có đơn hàng nào
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.code} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white">{o.code}</span>
                      <span className="text-[11px] text-neutral-500">
                        {o.createdAt.toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-neutral-200">
                        {o.user.username}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        UID {o.user.uid}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-bold text-white">
                    #{o.product.code}
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral-400">
                    {METHOD_LABEL[o.method] ?? o.method}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-neutral-500 line-through">
                        {formatVnd(Number(o.listPrice))}đ
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        −{o.discountPct}%
                        {o.voucher ? ` · ${o.voucher.code}` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm font-black text-emerald-400">
                    {formatVnd(Number(o.total))}đ
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                        STATUS_CLASS[o.status] ??
                        "text-neutral-400 bg-white/5 border-white/10"
                      }`}
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
