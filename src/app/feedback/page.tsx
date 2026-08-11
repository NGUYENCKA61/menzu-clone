import type { Metadata } from "next";
import Image from "next/image";

import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { getFeedback } from "@/lib/queries";

export const metadata: Metadata = { title: "Menzu Valorant | Góp Ý & Đánh Giá" };
export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const reviews = await getFeedback(50);

  return (
    <SimplePage title="Đánh Giá Khách Hàng" crumb="Góp ý & Khiếu nại">
      <div className="flex items-center gap-4 mb-8">
        <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">
          5.0
        </span>
        <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest leading-none">
          {reviews.length} đánh giá thực
        </span>
      </div>

      {reviews.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <p className="text-xl font-bold text-white mb-2">CHƯA CÓ ĐÁNH GIÁ NÀO</p>
          <p className="text-neutral-400">Hãy là người đầu tiên để lại đánh giá.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              className="border border-[#25283b] p-5 rounded-2xl flex flex-col bg-[#0d0d12]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black/40">
                  {r.avatarUrl ? (
                    <Image src={r.avatarUrl} alt={r.name} fill className="object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">{r.name}</span>
                  <span className="text-[9px] text-neutral-500 font-semibold">
                    Tài khoản đã xác minh
                  </span>
                </div>
              </div>

              <p className="text-[13px] text-neutral-300 leading-relaxed mb-4 flex-1">
                {r.body}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                <span className="text-[10px] text-neutral-500 font-semibold">
                  {r.createdAt.toLocaleDateString("vi-VN")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-500 font-semibold">
                    Giao dịch:
                  </span>
                  <span className="text-[11px] font-black text-emerald-400">
                    {formatVnd(r.amount)}đ
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SimplePage>
  );
}
