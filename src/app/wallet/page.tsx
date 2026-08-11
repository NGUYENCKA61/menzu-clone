import type { Metadata } from "next";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { WalletTopUp } from "@/components/sites/menzu-lol-f7ae197a/shared/WalletTopUp";

export const metadata: Metadata = { title: "Nạp tiền" };

export default function WalletPage() {
  return (
    <AccountPageFrame
      title="Nạp tiền"
      subtitle="Tiền sẽ được hệ thống tự động cộng"
      crumb="Nạp tiền"
    >
      <WalletTopUp />
    </AccountPageFrame>
  );
}
