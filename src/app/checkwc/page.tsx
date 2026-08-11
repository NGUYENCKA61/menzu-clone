import type { Metadata } from "next";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { WelcomeMailChecker } from "@/components/sites/menzu-lol-f7ae197a/shared/WelcomeMailChecker";

export const metadata: Metadata = {
  title: "Check Thư Welcome",
  description:
    "Kiểm tra thư welcome gốc của Riot Games từ mã nguồn email — xác minh chữ ký DKIM, SPF và DMARC. Xử lý hoàn toàn trên trình duyệt.",
  alternates: { canonical: "/checkwc" },
};

export default function CheckWelcomePage() {
  return (
    <SimplePage title="Check Thư Welcome" crumb="Menzu Mail Checker">
      <WelcomeMailChecker />
    </SimplePage>
  );
}
