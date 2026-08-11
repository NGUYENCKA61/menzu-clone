import type { Metadata } from "next";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AccountEmpty } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountShell";

export const metadata: Metadata = { title: "Menzu Valorant | Profile" };

export default function ServiceOrdersPage() {
  return (
    <AccountPageFrame
      title="Đơn dịch vụ"
      subtitle="Theo dõi tiến độ các dịch vụ số bạn đã đặt"
      crumb="Đơn dịch vụ"
    >
      <AccountEmpty
        title="Không tìm thấy đơn dịch vụ nào phù hợp"
        body=""
        ctaLabel="Khám phá các dịch vụ ngay"
        ctaHref="/services"
      />
    </AccountPageFrame>
  );
}
