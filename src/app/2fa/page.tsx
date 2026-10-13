import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { TotpTool } from "@/components/sites/menzu-lol-f7ae197a/shared/TotpTool";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = {
  title: "Trình Tạo Mã 2FA",
  description:
    "Tạo mã xác thực 2 lớp (TOTP) cho tài khoản Valorant từ secret key. Xử lý hoàn toàn trên trình duyệt, không gửi secret lên máy chủ.",
  alternates: { canonical: "/2fa" },
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};

export default async function TwoFactorPage() {
  const { brandName } = await getShopSettings();
  return (
    <SimplePage
      title="Trình Tạo Mã 2FA"
      crumb={`${brandName} 2FA`}
      // A glyph of its own where the red bar stood, as every standalone page
      // wears one (the owner, 13/10/2026, UI consistency review).
      icon={ShieldCheck}
    >
      <TotpTool />
    </SimplePage>
  );
}
