import type { Metadata } from "next";

import { NotCapturedYet, SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = { title: "Menzu Valorant | Check Thư Welcome" };

export default function Page() {
  return (
    <SimplePage title="Check Thư Welcome" crumb="Check thư welcome">
      <NotCapturedYet note="Công cụ kiểm tra thư welcome chưa được sao chép từ bản gốc." />
    </SimplePage>
  );
}
