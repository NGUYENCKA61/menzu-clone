import type { Metadata } from "next";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AccountEmpty } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountShell";

export const metadata: Metadata = { title: "Lịch sử mua hàng" };

export default function OrdersPage() {
  return (
    <AccountPageFrame
      title="Lịch sử mua hàng"
      subtitle="Danh sách các tài khoản bạn đã thanh toán"
      crumb="Lịch sử mua"
    >
      <AccountEmpty
        title="Chưa có đơn hàng nào"
        body="Bạn chưa mua tài khoản nào trên hệ thống"
        ctaLabel="Mua Ngay"
        ctaHref="/category/account-valorant-tu-chon"
      />
    </AccountPageFrame>
  );
}
