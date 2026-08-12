import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { SecurityPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/SecurityPanel";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Menzu Valorant | Profile" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fsecurity");

  return (
    <AccountPageFrame
      title="Bảo mật tài khoản"
      subtitle="Cập nhật thông tin đăng nhập và quản lý thiết bị"
      crumb="Bảo mật"
    >
      <SecurityPanel email={user.email} />
    </AccountPageFrame>
  );
}
