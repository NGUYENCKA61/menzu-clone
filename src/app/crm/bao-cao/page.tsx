import type { Metadata } from "next";

import { CrmReport } from "@/components/sites/menzu-lol-f7ae197a/crm/CrmReport";
import { crmReport } from "@/lib/crmReport";

export const metadata: Metadata = { title: "Báo cáo" };
export const dynamic = "force-dynamic";

export default async function CrmReportPage() {
  const data = await crmReport();
  return <CrmReport data={data} />;
}
