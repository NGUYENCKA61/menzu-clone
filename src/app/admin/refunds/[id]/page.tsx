import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AdminRefundDecide } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminRefundDecide";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  promisedRefund,
  REFUND_METHOD,
  REFUND_STATUS,
} from "@/lib/refundRequests";
import { productHref } from "@/lib/routes";

export const metadata: Metadata = { title: "Chi tiết hoàn trả | Quản trị" };
export const dynamic = "force-dynamic";

const CARD = "rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";

function formatWhen(date: Date): string {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One labelled figure in the strip across the top. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <span className={LABEL}>{label}</span>
      <div className="mt-1 truncate text-[13px] font-bold text-white">
        {children}
      </div>
    </div>
  );
}

/**
 * One refund request, in full, on a page with room for it.
 *
 * The queue tab lists them; this is where one is actually read. The buyer's
 * words run at full width instead of inside a card in a tab, the screenshot is
 * shown at a size somebody can judge, and the order it argues about — what was
 * paid, when, which tier, whether the keys ever arrived — sits above the
 * decision rather than in another window.
 */
export default async function AdminRefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const { id } = await params;
  const row = await db.refundRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      method: true,
      amount: true,
      reason: true,
      imageUrl: true,
      adminNote: true,
      createdAt: true,
      decidedAt: true,
      user: {
        select: { username: true, uid: true, email: true, balance: true },
      },
      order: {
        select: {
          code: true,
          total: true,
          quantity: true,
          createdAt: true,
          keysOwed: true,
          _count: { select: { licenseKeys: true } },
          package: { select: { label: true } },
          product: {
            select: {
              name: true,
              code: true,
              slug: true,
              imageUrl: true,
              refundRate: true,
              category: { select: { slug: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!row) notFound();

  const order = row.order;
  const total = Number(order.total);
  const productName = order.product.name ?? order.product.code;
  const state = REFUND_STATUS[row.status];
  const owed = Math.max(0, order.keysOwed - order._count.licenseKeys);

  return (
    <AdminShell
      title="Chi tiết hoàn trả"
      subtitle={`Đơn ${order.code} · ${row.user.username}`}
      username={admin.username}
      aside={
        <Link
          href="/admin/operations"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} />
          Vận hành
        </Link>
      }
    >
      {/* THE FACTS, ACROSS THE TOP */}
      <section className={`${CARD} !p-0`}>
        <div className="grid grid-cols-2 divide-x divide-white/[0.06] sm:grid-cols-4">
          <Fact label="Trạng thái">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
            >
              {state.label}
            </span>
          </Fact>
          <Fact label="Đơn hàng">{order.code}</Fact>
          <Fact label="Đã thanh toán">{formatVnd(total)}đ</Fact>
          <Fact label="Gửi lúc">{formatWhen(row.createdAt)}</Fact>
        </div>
      </section>

      {/* WHO, AND WHAT THEY BOUGHT */}
      <section className={CARD}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
            {order.product.imageUrl ? (
              <Image
                src={order.product.imageUrl}
                alt=""
                fill
                sizes="96px"
                className="object-cover object-[85%_center]"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={productHref(order.product.category.slug, order.product.slug)}
              className="inline-flex items-center gap-1.5 text-sm font-black text-white transition-colors hover:text-[var(--brand)]"
            >
              {productName}
              <ExternalLink size={12} className="text-neutral-500" />
            </Link>
            <p className="mt-1 text-[11px] font-semibold text-neutral-500">
              {order.product.category.name}
              {order.package ? ` · ${order.package.label}` : ""}
              {order.quantity > 1 ? ` · ×${order.quantity}` : ""} · mua{" "}
              {formatWhen(order.createdAt)}
            </p>
            {/* The one fact about the order that can decide this by itself: a
                shop that never delivered the key has little to argue. */}
            {owed > 0 ? (
              <p className="mt-1.5 inline-flex rounded-md border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--brand)]">
                Còn nợ {owed} key
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className={LABEL}>Khách</p>
            <p className="mt-1 text-[13px] font-bold text-white">
              {row.user.username}
            </p>
            <p className="text-[11px] text-neutral-500">
              UID {row.user.uid} · ví {formatVnd(Number(row.user.balance))}đ
            </p>
          </div>
        </div>
      </section>

      {/* WHAT THEY SAID */}
      <section className={CARD}>
        <span className={LABEL}>Lý do khách gửi</span>
        <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed text-neutral-200">
          {row.reason}
        </p>
        {row.imageUrl ? (
          <a
            href={row.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full max-w-[560px] overflow-hidden rounded-xl border border-white/10 bg-neutral-950 transition-colors hover:border-white/25"
          >
            <Image
              src={row.imageUrl}
              alt={`Ảnh kèm yêu cầu ${order.code}`}
              width={1120}
              height={630}
              className="max-h-[420px] w-full object-contain"
            />
          </a>
        ) : (
          <p className="mt-3 text-[12px] text-neutral-600">
            Khách không đính ảnh nào.
          </p>
        )}
      </section>

      {/* THE DECISION, OR WHAT IT WAS */}
      <section className={CARD}>
        {row.status === "PENDING" ? (
          <>
            <span className={LABEL}>Xử lý</span>
            <div className="mt-3">
              <AdminRefundDecide
                id={row.id}
                orderTotal={total}
                suggested={promisedRefund(total, order.product.refundRate)}
                refundRate={order.product.refundRate}
              />
            </div>
          </>
        ) : (
          <>
            <span className={LABEL}>Đã xử lý</span>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-neutral-300">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
              >
                {state.label}
              </span>
              {row.decidedAt ? (
                <span className="text-[12px] text-neutral-500">
                  {formatWhen(row.decidedAt)}
                </span>
              ) : null}
              {row.method ? (
                <span>
                  <b className="text-white">{REFUND_METHOD[row.method].label}</b>
                  {row.amount !== null ? (
                    <>
                      {" · "}
                      <b className="text-[var(--brand)]">
                        {formatVnd(Number(row.amount))}đ
                      </b>
                    </>
                  ) : null}
                </span>
              ) : null}
            </div>
            {row.adminNote ? (
              <p className="mt-3 rounded-r-lg border-l-2 border-[var(--brand)] bg-[var(--brand)]/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-neutral-300">
                {row.adminNote}
              </p>
            ) : null}
          </>
        )}
      </section>
    </AdminShell>
  );
}
