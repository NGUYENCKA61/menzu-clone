import type { Metadata } from "next";

import { NotCapturedYet, SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = { title: "Menzu Valorant | Tải Ứng Dụng" };

export default function Page() {
  return (
    <SimplePage title="Tải Ứng Dụng" crumb="Tải ứng dụng">
      <NotCapturedYet note="Trang tải ứng dụng chưa được sao chép từ bản gốc." />
    </SimplePage>
  );
}
