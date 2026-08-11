import type { Metadata } from "next";

import { NotCapturedYet, SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = { title: "Menzu Valorant | Bio" };

export default function Page() {
  return (
    <SimplePage title="Bio" crumb="Bio">
      <NotCapturedYet note="Trang bio chưa được sao chép từ bản gốc." />
    </SimplePage>
  );
}
