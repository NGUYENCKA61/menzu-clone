import type { Metadata } from "next";

import { NotCapturedYet, SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = { title: "Menzu Valorant | Tin Tức & Sự Kiện" };

export default function Page() {
  return (
    <SimplePage title="Tin Tức & Sự Kiện" crumb="Tin tức">
      <NotCapturedYet note="Chuyên mục tin tức chưa được sao chép từ bản gốc." />
    </SimplePage>
  );
}
