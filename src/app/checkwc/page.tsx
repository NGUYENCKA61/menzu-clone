import type { Metadata } from "next";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { WelcomeMailChecker } from "@/components/sites/menzu-lol-f7ae197a/shared/WelcomeMailChecker";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = {
  title: "Check Thư Welcome",
  description:
    "Kiểm tra thư welcome gốc của Riot Games từ mã nguồn email — xác minh chữ ký DKIM, SPF và DMARC. Xử lý hoàn toàn trên trình duyệt.",
  alternates: { canonical: "/checkwc" },
};

export default async function CheckWelcomePage() {
  const { brandName } = await getShopSettings();
  return (
    <SimplePage title="Check Thư Welcome" crumb={`${brandName} Mail Checker`}>
      <WelcomeMailChecker />
    </SimplePage>
  );
}
