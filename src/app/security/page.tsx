import type { Metadata } from "next";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { SecurityPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/SecurityPanel";

export const metadata: Metadata = { title: "Menzu Valorant | Profile" };

export default function SecurityPage() {
  return (
    <AccountPageFrame
      title="Bảo mật"
      subtitle="Cập nhật thông tin đăng nhập và quản lý thiết bị"
      crumb="Bảo mật"
    >
      <SecurityPanel />
    </AccountPageFrame>
  );
}
