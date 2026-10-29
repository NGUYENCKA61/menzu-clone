import type { Metadata } from "next";

import { CrmInbox } from "@/components/sites/menzu-lol-f7ae197a/crm/CrmInbox";
import { crmCounts, listThreadsForDesk, listWarrantyForDesk } from "@/lib/chatStore";
import { getQuickReplies } from "@/lib/crmSettings";

export const metadata: Metadata = { title: "Hộp thư" };
export const dynamic = "force-dynamic";

/**
 * The inbox screen. The layout above already stood guard; this only fetches
 * the first paint: hand-offs when any are waiting, the timeline otherwise.
 * `?thread=` (a link from the customer book) opens that conversation.
 */
export default async function CrmInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const openThreadId = typeof raw.thread === "string" ? raw.thread : null;

  const counts = await crmCounts();
  const filter = counts.needAdmin > 0 ? ("NEED_ADMIN" as const) : ("ALL" as const);
  const [chats, warranty, quickReplies] = await Promise.all([
    listThreadsForDesk(filter === "ALL" ? {} : { status: filter }),
    filter === "ALL" ? listWarrantyForDesk() : Promise.resolve([]),
    getQuickReplies(),
  ]);
  const threads = [...chats, ...warranty]
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1))
    .slice(0, 60);

  return <CrmInbox initial={{ threads, counts, filter, quickReplies, openThreadId }} />;
}
