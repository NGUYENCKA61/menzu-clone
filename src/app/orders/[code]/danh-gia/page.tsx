import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Clock, Info } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { StarRow } from "@/components/sites/menzu-lol-f7ae197a/shared/FeedbackBoard";
import { OrderReviewForm } from "@/components/sites/menzu-lol-f7ae197a/shared/OrderReview";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { db } from "@/lib/db";
import { dayTime } from "@/lib/dayGroups";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Đánh giá đơn hàng",
  robots: { index: false, follow: false },
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
 * A buyer's review of one purchase, on a page of its own — the same shape as
 * the refund request, and reached the same way, from the order's row. The
 * order supplies what was bought and for how much; the buyer supplies the
 * stars and the words. Once sent, the page shows the review and where it is
 * in the queue rather than the form again.
 */
export default async function OrderReviewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${code}/danh-gia`)}`);
  }

  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    select: {
      id: true,
      code: true,
      status: true,
      total: true,
      quantity: true,
      createdAt: true,
      product: { select: { name: true, code: true, imageUrl: true } },
      package: { select: { label: true } },
      feedback: {
        select: { rating: true, body: true, approved: true, createdAt: true, imageUrl: true },
      },
    },
  });
  if (!order) notFound();
  const productName = order.product.name ?? order.product.code;

  return (
    <AccountPageFrame
      title="Đánh giá đơn hàng"
      subtitle={`Đơn ${order.code} — vài dòng về tool và về shop`}
      crumb="Đánh giá đơn hàng"
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
        <section className={CARD}>
          <span className={LABEL}>Đơn hàng</span>
          <div className="mt-3 flex flex-wrap items-center gap-4">
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
              <p className="text-sm font-black text-white">{productName}</p>
              <p className="mt-1 text-[11px] font-semibold text-neutral-500">
                Đơn {order.code} · {stamp(order.createdAt)}
                {order.package ? ` · ${order.package.label}` : ""}
                {order.quantity > 1 ? ` · ×${order.quantity}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black text-white">{formatVnd(Number(order.total))}đ</p>
              <p className={LABEL}>{order.status === "PAID" ? "Đã thanh toán" : order.status}</p>
            </div>
          </div>
        </section>

        <section className={CARD}>
          {order.feedback ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <StarRow rating={order.feedback.rating} size={16} />
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    order.feedback.approved
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {order.feedback.approved ? (
                    <>
                      <Check className="h-3 w-3" /> Đã duyệt · đang hiện ngoài shop
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" /> Đang chờ admin duyệt
                    </>
                  )}
                </span>
                <span className="text-[11px] font-semibold text-neutral-500">
                  {stamp(order.feedback.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
                {order.feedback.body}
              </p>
              {order.feedback.imageUrl ? (
                <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                  <Image
                    src={order.feedback.imageUrl}
                    alt=""
                    fill
                    sizes="384px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <p className="text-[11px] text-neutral-500">
                Mỗi đơn chỉ đánh giá một lần. Muốn sửa, nhắn shop qua trang Đánh giá.
              </p>
            </div>
          ) : order.status !== "PAID" ? (
            <div className="flex items-start gap-3 rounded-r-xl border-l-[3px] border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/5 px-4 py-3.5 text-[13px] leading-relaxed text-neutral-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--menzu-accent)]" />
              <span>Chỉ đánh giá được đơn đã thanh toán.</span>
            </div>
          ) : (
            <OrderReviewForm orderId={order.id} onDone="/orders" />
          )}
        </section>
      </div>
    </AccountPageFrame>
  );
}
