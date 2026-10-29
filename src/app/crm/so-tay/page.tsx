import type { Metadata } from "next";

import { CrmKnowledge } from "@/components/sites/menzu-lol-f7ae197a/crm/CrmKnowledge";
import { listKnowledge } from "@/lib/knowledge";

export const metadata: Metadata = { title: "Sổ tay bot" };
export const dynamic = "force-dynamic";

export default async function CrmKnowledgePage() {
  const entries = await listKnowledge();
  return <CrmKnowledge initial={entries} />;
}
