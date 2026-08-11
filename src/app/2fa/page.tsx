import type { Metadata } from "next";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { TotpTool } from "@/components/sites/menzu-lol-f7ae197a/shared/TotpTool";

export const metadata: Metadata = {
  title: "Trình Tạo Mã 2FA",
  description:
    "Tạo mã xác thực 2 lớp (TOTP) cho tài khoản Valorant từ secret key. Xử lý hoàn toàn trên trình duyệt, không gửi secret lên máy chủ.",
  alternates: { canonical: "/2fa" },
};

export default function TwoFactorPage() {
  return (
    <SimplePage title="Trình Tạo Mã 2FA" crumb="Menzu 2FA">
      <TotpTool />
    </SimplePage>
  );
}
