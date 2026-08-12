import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crosshair, MessageCircle } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { TradeForm } from "@/components/sites/menzu-lol-f7ae197a/shared/TradeForm";
import { getTradeRequests } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Thu Cũ Đổi Mới",
  description:
    "Thanh lý hoặc đổi tài khoản Valorant cũ lấy tài khoản khác tại Menzu — định giá nhanh, thanh toán qua Zalo.",
  alternates: { canonical: "/trade" },
};

export const dynamic = "force-dynamic";

const MODE_LABEL: Record<string, string> = {
  SELL: "Thanh lý thu tiền",
  EXCHANGE: "Thu cũ đổi mới",
};

const MAIL_LABEL: Record<string, string> = {
  DROP: "Drop Mail",
  DEAD: "Dead Mail",
};

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  PENDING: { text: "Chờ báo giá", className: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  QUOTED: { text: "Đã báo giá", className: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
  ACCEPTED: { text: "Đã nhận", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  REJECTED: { text: "Từ chối", className: "text-red-400 bg-red-500/10 border-red-500/30" },
  DONE: { text: "Hoàn tất", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
};

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function TradePage() {
  // Auth-gated on the live site too — signed-out visitors are bounced to
  // /login with the destination preserved.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Ftrade");

  const requests = await getTradeRequests(user.id);

  return (
    <SimplePage title="Thu Cũ Đổi Mới" crumb="Thu cũ đổi mới">
      <div className="max-w-3xl space-y-10">
        <section className="rounded-2xl border border-white/10 bg-[#121216] p-5 sm:p-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-white mb-2">
            Tài khoản Riot cần thu cũ / thanh lý
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Hệ thống chưa quét tài khoản nào của bạn. Gửi ảnh chụp kho đồ qua
            Zalo cho admin để được báo giá, hoặc điền biểu mẫu bên dưới.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {/* Check Skin was excluded from this clone, so the button explains
                itself rather than linking to a page that does not exist. */}
            <span className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-widest text-neutral-500 cursor-not-allowed">
              <Crosshair size={13} />
              Check Skin — chưa mở
            </span>
            <Link
              href="/bio"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
            >
              <MessageCircle size={13} />
              Nhắn Zalo cho admin
            </Link>
          </div>
        </section>

        <TradeForm />

        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Lịch sử giao dịch
          </h2>

          {requests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-neutral-400">
              Bạn chưa gửi đơn thu cũ hoặc thanh lý tài khoản nào.
            </p>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => {
                const status = STATUS_LABEL[request.status] ?? STATUS_LABEL.PENDING!;
                return (
                  <div
                    key={request.code}
                    className="rounded-2xl border border-white/10 bg-[#121216] px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
                  >
                    <span className="font-mono text-xs font-bold text-white">{request.code}</span>
                    <span className="text-[11px] text-neutral-400">
                      {MODE_LABEL[request.mode] ?? request.mode} ·{" "}
                      {MAIL_LABEL[request.mailType] ?? request.mailType}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${status.className}`}
                    >
                      {status.text}
                    </span>
                    <span className="text-[11px] text-neutral-500 ml-auto">
                      {dateFormat.format(request.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Nhắn Zalo kèm mã đơn để admin duyệt nhanh. Giá thu phụ thuộc rank,
            số skin và tình trạng mail — admin báo giá cho từng đơn.
          </p>
        </section>
      </div>
    </SimplePage>
  );
}
