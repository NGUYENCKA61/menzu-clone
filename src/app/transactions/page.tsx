import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getTransactions } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Lịch sử giao dịch" };
export const dynamic = "force-dynamic";

const COLUMNS = [
  "Mã GD & Thời gian",
  "Chi tiết & Phương thức",
  "Biến động & Số dư",
  "Trạng thái",
];

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Thành công",
  PENDING: "Đang xử lý",
  FAILED: "Thất bại",
};

const STATUS_CLASS: Record<string, string> = {
  SUCCESS: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  FAILED: "text-red-400 bg-red-500/10 border-red-500/30",
};

function formatWhen(date: Date): string {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Ftransactions");

  const rows = await getTransactions(user.id);

  return (
    <AccountPageFrame
      title="Lịch sử giao dịch"
      subtitle="Tra cứu dòng tiền chi tiêu và nạp"
      crumb="Lịch sử giao dịch"
    >
      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-white/10">
              {COLUMNS.map((c) => (
                <th
                  key={c}
                  className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-5 py-14 text-center text-neutral-400"
                >
                  Không tìm thấy giao dịch nào phù hợp
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.code} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white">{t.code}</span>
                      <span className="text-[11px] text-neutral-500">
                        {formatWhen(t.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-neutral-200">
                        {t.description}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {t.method ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span
                        className={
                          t.delta >= 0
                            ? "text-xs font-black text-emerald-400"
                            : "text-xs font-black text-red-400"
                        }
                      >
                        {t.delta >= 0 ? "+" : "−"}
                        {formatVnd(Math.abs(t.delta))}đ
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Số dư: {formatVnd(t.balanceAfter)}đ
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                        STATUS_CLASS[t.status] ??
                        "text-neutral-400 bg-white/5 border-white/10"
                      }`}
                    >
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AccountPageFrame>
  );
}
