import type { Metadata } from "next";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";

export const metadata: Metadata = { title: "Menzu Valorant | Profile" };

/**
 * Values below are the live shape of the account overview. They are static for
 * now and will be served by the API once the backend exists — the layout is
 * what is being cloned here, not the numbers.
 */
const STATS = [
  { label: "Số dư khả dụng", value: "0", unit: "đ", tone: "text-emerald-400" },
  { label: "Điểm thưởng", value: "0", unit: "Pts", tone: "text-amber-400" },
  { label: "Cấp bậc thành viên", value: "Bronze", unit: "", tone: "text-orange-300" },
] as const;

const LINKED = [
  { provider: "Discord", bonus: "Thưởng 1.000 Pts" },
  { provider: "Google", bonus: "" },
] as const;

export default function ProfilePage() {
  return (
    <AccountPageFrame
      title="Tổng quan tài khoản"
      subtitle="Xem thông tin và hoạt động gần đây"
      crumb="Tổng quan tài khoản"
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-black/50 border border-white/10 overflow-hidden" />
            <button
              type="button"
              className="mt-2 w-full text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
            >
              Sửa ảnh
            </button>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xl font-black text-white">abcxyz123</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-black uppercase tracking-widest text-neutral-300">
                MEMBER
              </span>
            </div>
            <span className="text-xs text-neutral-500 font-semibold">UID: 10049</span>
            <span className="text-xs text-neutral-500 font-semibold">
              Đã tham gia: 11/08/2026
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-2"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                {s.label}
              </span>
              <span className={`text-2xl font-black ${s.tone}`}>
                {s.value}
                {s.unit ? (
                  <span className="text-sm font-bold text-neutral-400 ml-1">{s.unit}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Liên kết nền tảng
          </span>
          {LINKED.map((l) => (
            <div
              key={l.provider}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{l.provider}</span>
                <span className="text-[11px] text-neutral-500">Chưa liên kết</span>
              </div>
              <div className="flex items-center gap-3">
                {l.bonus ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    {l.bonus}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="h-9 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap"
                >
                  Liên kết ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AccountPageFrame>
  );
}
