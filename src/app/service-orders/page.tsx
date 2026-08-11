import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AccountEmpty } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountShell";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getServiceOrders } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Menzu Valorant | Profile" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xử lý",
  IN_PROGRESS: "Đang thực hiện",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  IN_PROGRESS: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  DONE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default async function ServiceOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fservice-orders");

  const orders = await getServiceOrders(user.id);

  return (
    <AccountPageFrame
      title="Đơn dịch vụ"
      subtitle="Theo dõi tiến độ các dịch vụ số bạn đã đặt"
      crumb="Đơn dịch vụ"
    >
      {orders.length === 0 ? (
        <AccountEmpty
          title="Không tìm thấy đơn dịch vụ nào phù hợp"
          body="Bạn chưa đặt dịch vụ nào trên hệ thống"
          ctaLabel="Khám phá các dịch vụ ngay"
          ctaHref="/services"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <div
              key={o.code}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-4"
            >
              <div className="flex flex-col min-w-0 gap-1">
                <span className="text-sm font-black text-white truncate">
                  {o.serviceName}
                </span>
                <span className="text-[11px] text-neutral-500 font-semibold">
                  Đơn {o.code} ·{" "}
                  {o.createdAt.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-sm font-black text-white">
                  {o.amount > 0 ? `${formatVnd(o.amount)}đ` : "Liên hệ"}
                </span>
                <span
                  className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                    STATUS_CLASS[o.status] ??
                    "text-neutral-400 bg-white/5 border-white/10"
                  }`}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountPageFrame>
  );
}
