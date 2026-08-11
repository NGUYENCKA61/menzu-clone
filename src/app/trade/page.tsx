import type { Metadata } from "next";

import { NotCapturedYet, SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = { title: "Menzu Valorant | Thu Cũ Đổi Mới" };

export default function Page() {
  return (
    <SimplePage title="Thu Cũ Đổi Mới" crumb="Thu cũ đổi mới">
      <NotCapturedYet note="Luồng thu cũ đổi mới chưa được sao chép từ bản gốc." />
    </SimplePage>
  );
}
