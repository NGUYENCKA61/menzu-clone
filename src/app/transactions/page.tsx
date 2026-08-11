import type { Metadata } from "next";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";

export const metadata: Metadata = { title: "Lịch sử giao dịch" };

const COLUMNS = [
  "Mã GD & Thời gian",
  "Chi tiết & Phương thức",
  "Biến động & Số dư",
  "Trạng thái",
];

export default function TransactionsPage() {
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
            <tr>
              <td colSpan={COLUMNS.length} className="px-5 py-14 text-center text-neutral-400">
                Không tìm thấy giao dịch nào phù hợp
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AccountPageFrame>
  );
}
