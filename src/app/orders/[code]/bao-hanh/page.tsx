import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, Info } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { WarrantyRequestForm } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyRequestForm";
import { db } from "@/lib/db";
import { dayTime } from "@/lib/dayGroups";
import { getCurrentUser } from "@/lib/session";
import { SUPPORT_WINDOW } from "@/lib/supportHours";
import {
  WARRANTY_ISSUE,
  WARRANTY_STATUS,
  warrantyBlockedReason,
  warrantyOpen,
} from "@/lib/warrantyRequests";

export const metadata: Metadata = {
  title: "Hỗ trợ bảo hành",
  // One buyer's own order. Followed, not indexed, like the rest of the
  // account area.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-white/10 bg-neutral-900/50 p-5 sm:p-6";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";

function stamp(date: Date): string {
  return `${date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${dayTime(date)}`;
}

/**
 * The warranty screen for one order: the order restated, every report made on
 * it with the shop's answer, and the form for a new one — or the reason there
 * is none. Its own page, like the refund request, because a description and a
 * screenshot want more room than a receipt's footer.
 */
export default async function WarrantyRequestPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${code}/bao-hanh`)}`);
  }

  // Scoped to this buyer: somebody else's order code answers 404 rather than
  // confirming it exists.
  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    select: {
      code: true,
      status: true,
      total: true,
      quantity: true,
      createdAt: true,
      product: { select: { name: true, code: true, imageUrl: true } },
      package: { select: { label: true } },
      warrantyRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          issue: true,
          description: true,
          imageUrl: true,
          adminNote: true,
          createdAt: true,
        },
      },
    },
  });
  if (!order) notFound();

  const blocked = warrantyBlockedReason({
    orderStatus: order.status,
    openRequest: order.warrantyRequests.some((r) => warrantyOpen(r.status)),
  });
  const productName = order.product.name ?? order.product.code;

  return (
    <AccountPageFrame
      title="Hỗ trợ bảo hành"
      subtitle={`Đơn ${order.code} — báo lỗi để shop kiểm tra và xử lý`}
      crumb="Hỗ trợ bảo hành"
      action={
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Lịch sử mua
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        {/* THE ORDER BEING REPORTED */}
        <section className={CARD}>
          <span className={LABEL}>Đơn hàng</span>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
              {order.product.imageUrl ? (
                <Image
                  src={order.product.imageUrl}
                  alt=""
                  fill
                  sizes="192px"
                  className="object-cover object-[85%_center]"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">{productName}</p>
              <p className="mt-1 text-[11px] font-semibold text-neutral-500">
                Đơn {order.code} · {stamp(order.createdAt)}
                {order.package ? ` · ${order.package.label}` : ""}
                {order.quantity > 1 ? ` · ×${order.quantity}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black text-white">{formatVnd(Number(order.total))}đ</p>
              <p className={LABEL}>Đã thanh toán</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] pt-4">
            <span className="inline-flex items-center gap-2 text-[12px] text-neutral-400">
              <Clock className="h-4 w-4 text-[var(--menzu-accent)]" />
              Shop xử lý bảo hành {SUPPORT_WINDOW} mỗi ngày; ngoài giờ cứ gửi, sáng shop
              làm ngay.
            </span>
          </div>
        </section>

        {/* PAST REPORTS, IF ANY */}
        {order.warrantyRequests.length > 0 ? (
          <section className={CARD}>
            <span className={LABEL}>Yêu cầu đã gửi</span>
            <ul className="mt-3 flex flex-col gap-3">
              {order.warrantyRequests.map((r) => {
                const state = WARRANTY_STATUS[r.status];
                return (
                  <li key={r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
                      >
                        {state.label}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-300">
                        {WARRANTY_ISSUE[r.issue].label}
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500">
                        {stamp(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
                      {r.description}
                    </p>
                    {r.imageUrl ? (
                      <a
                        href={r.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 block w-full max-w-xs overflow-hidden rounded-lg border border-white/10"
                      >
                        <Image
                          src={r.imageUrl}
                          alt="Ảnh lỗi đã gửi"
                          width={640}
                          height={360}
                          unoptimized
                          className="max-h-[200px] w-full object-cover"
                        />
                      </a>
                    ) : null}
                    {r.adminNote ? (
                      <p className="mt-3 rounded-r-lg border-l-2 border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-neutral-300">
                        <span className="font-bold text-white">Shop trả lời:</span> {r.adminNote}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* THE FORM, OR WHY THERE IS NONE */}
        <section className={CARD}>
          {blocked ? (
            <div className="flex items-start gap-3 rounded-r-xl border-l-[3px] border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/5 px-4 py-3.5 text-[13px] leading-relaxed text-neutral-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--menzu-accent)]" />
              <span>{blocked}</span>
            </div>
          ) : (
            <WarrantyRequestForm code={order.code} onDone="/orders" />
          )}
        </section>
      </div>
    </AccountPageFrame>
  );
}
