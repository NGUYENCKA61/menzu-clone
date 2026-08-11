import type { Metadata } from "next";

import { NotCapturedYet, SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = { title: "Menzu Valorant | Trình Tạo Mã 2FA" };

export default function Page() {
  return (
    <SimplePage title="Trình Tạo Mã 2FA" crumb="Trình tạo mã 2FA">
      <NotCapturedYet note="Công cụ 2FA chưa được sao chép từ bản gốc." />
    </SimplePage>
  );
}
