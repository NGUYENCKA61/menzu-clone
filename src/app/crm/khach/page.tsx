import type { Metadata } from "next";

import { CrmCustomers } from "@/components/sites/menzu-lol-f7ae197a/crm/CrmCustomers";
import { crmCustomers } from "@/lib/chatStore";

export const metadata: Metadata = { title: "Khách hàng" };
export const dynamic = "force-dynamic";

/** The customer book's first page; searching and paging go through the API. */
export default async function CrmCustomersPage() {
  const customers = await crmCustomers({});
  return <CrmCustomers initial={customers} />;
}
