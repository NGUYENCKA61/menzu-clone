import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AccountEmpty } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountShell";
import { ListSearch } from "@/components/sites/menzu-lol-f7ae197a/shared/ListSearch";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getOrders } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Lịch sử mua hàng" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Đã thanh toán",
  PENDING: "Chờ xử lý",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

// Every status used to wear the PAID green, which read as "fine" on a
// cancelled order. Colour now follows meaning, same palette as the ledgers.
const STATUS_CLASS: Record<string, string> = {
  PAID: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  CANCELLED: "border-white/10 bg-white/5 text-neutral-500",
  REFUNDED: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Forders");

  const orders = await getOrders(user.id);

  return (
    <AccountPageFrame
      title="Lịch sử mua hàng"
      subtitle="Danh sách các đơn hàng mà bạn đã thanh toán"
      crumb="Lịch sử mua"
    >
      {(
        <ListSearch
          emptyState={
            <AccountEmpty
              title="Chưa có đơn hàng nào"
              body="Bạn chưa mua tài khoản nào trên hệ thống"
              ctaLabel="Mua Ngay"
              ctaHref="/category/account-valorant-tu-chon"
            />
          }
          placeholder="Tìm theo mã đơn hoặc tên account..."
          unit="đơn hàng"
          frameTitle="Đơn hàng của bạn"
          frameHint="Bấm vào đơn để mở lại tài khoản"
          rows={orders.map((o) => ({
            key: o.code,
            // Searched by order code, product code and rank — the three things
            // a buyer actually has to hand when hunting for a past purchase.
            haystack: [o.code, o.productCode, o.productRank],
            node: (
              <a
                href={`/account/${o.productCode}`}
              className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-red-500/40 hover:bg-white/[0.05]"
            >
              <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-white/10">
                {o.imageUrl ? (
                  <Image
                    src={o.imageUrl}
                    alt={o.productCode}
                    fill
                    sizes="96px"
                    className="object-cover object-[85%_center]"
                  />
                ) : null}
              </div>

              <div className="flex flex-col min-w-0 flex-1 gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-white group-hover:text-red-400 transition-colors">
                    #{o.productCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[9px] font-black uppercase tracking-widest text-neutral-300">
                    {o.productRank}
                  </span>
                </div>
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
                  {formatVnd(o.total)}đ
                </span>
                <span
                  className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                    STATUS_CLASS[o.status] ?? "border-white/10 bg-white/5 text-neutral-400"
                  }`}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              </a>
            ),
          }))}
          emptyLabel="Không tìm thấy đơn hàng nào khớp."
        />
      )}
    </AccountPageFrame>
  );
}
