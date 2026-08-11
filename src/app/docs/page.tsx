import type { Metadata } from "next";

import { NotCapturedYet, SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = { title: "Menzu Valorant | Wiki & Hướng Dẫn" };

export default function Page() {
  return (
    <SimplePage title="Wiki & Hướng Dẫn" crumb="Wiki & Hướng dẫn">
      <NotCapturedYet note="Nội dung wiki chưa được sao chép từ bản gốc." />
    </SimplePage>
  );
}
