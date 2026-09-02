import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminSpinPrizeEditor } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSpinPrizeEditor";
import { getAdmin } from "@/lib/admin";
import { totalWeight, type Prize } from "@/lib/spin";
import { listSpinPrizes } from "@/lib/spinPrizes";

export const metadata: Metadata = { title: "Phần quà vòng quay | Quản trị" };
export const dynamic = "force-dynamic";

const CARD = "rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5";

/** The id the list uses to mean "a slice that does not exist yet". */
const NEW = "moi";

/** A blank slice, safe to save as-is: nothing here would be refused. */
function blankPrize(
  count: number,
): Prize & { exchangePoints: number | null; voucherDays: number | null } {
  return {
    id: `qua-${count + 1}`,
    label: "Phần quà mới",
    short: "Quà mới",
    kind: "NOTHING",
    amount: 0,
    weight: 5,
    exchangePoints: null,
    voucherDays: null,
  };
}

/**
 * One slice of the reward wheel, on a page with room for it.
 *
 * The tab lists them; this is where one is actually set. Each field carries
 * the sentence explaining what it does to the customer's screen — the label
 * budget shrinks with the slice count, "giá trị" means nothing on a losing
 * slice, a weight is only meaningful against the others — and none of that
 * fits beside an input in a grid of nine.
 */
export default async function AdminSpinPrizePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const { id } = await params;
  const prizes = await listSpinPrizes();
  const isNew = id === NEW;
  const prize = isNew
    ? blankPrize(prizes.length)
    : prizes.find((p) => p.id === id);
  if (!prize) notFound();

  // The odds this slice works out to are a function of every other slice, so
  // the page hands the editor the rest of the wheel's weight rather than a
  // percentage that would go stale the moment the number is typed.
  const others = isNew
    ? totalWeight(prizes)
    : totalWeight(prizes.filter((p) => p.id !== id));
  const sliceCount = isNew ? prizes.length + 1 : prizes.length;

  return (
    <AdminShell
      title={isNew ? "Thêm phần quà" : prize.label}
      subtitle={
        isNew
          ? "Một ô mới trên vòng quay đổi thưởng"
          : `Ô ${prizes.findIndex((p) => p.id === id) + 1}/${prizes.length} của vòng quay đổi thưởng`
      }
      username={admin.username}
      aside={
        <Link
          href="/admin/operations?tab=spin"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} />
          Vòng quay
        </Link>
      }
    >
      <section className={CARD}>
        <AdminSpinPrizeEditor
          prize={prize}
          was={isNew ? prize.id : id}
          otherWeight={others}
          sliceCount={sliceCount}
          isNew={isNew}
          // A new slice goes on the end, which is where the preview draws it
          // and where the save puts it.
          siblings={isNew ? [...prizes, prize] : prizes}
          editingIndex={isNew ? prizes.length : prizes.findIndex((p) => p.id === id)}
        />
      </section>
    </AdminShell>
  );
}
