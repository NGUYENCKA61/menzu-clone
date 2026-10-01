import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminWarrantyDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminWarrantyDetail";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import { promisedRefund, refundWindowClosed } from "@/lib/refundRequests";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { MESSAGE_SELECT, toChatMessage } from "@/lib/warrantyThread";

export const metadata: Metadata = { title: "Chi tiết bảo hành | Quản trị" };
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function stamp(date: Date): string {
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * One warranty ticket for the desk (the owner, 01/10/2026: "làm thêm trang
 * chi tiết bảo hành trong Dashboard admin để dễ thao tác"): the conversation
 * with its reply box and moves, beside the buyer, the order and the refund.
 */
export default async function AdminWarrantyTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();
  const { id } = await params;

  const [settings, ticket] = await Promise.all([
    getShopSettings(),
    db.warrantyRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        issue: true,
        description: true,
        imageUrl: true,
        createdAt: true,
        resolvedAt: true,
        refundAmount: true,
        refundMethod: true,
        bankName: true,
        bankAccount: true,
        accountHolder: true,
        bankSubmittedAt: true,
        user: { select: { username: true, uid: true, email: true } },
        order: {
          select: {
            code: true,
            total: true,
            status: true,
            createdAt: true,
            product: { select: { name: true, code: true, imageUrl: true, refundRate: true } },
            package: { select: { label: true } },
          },
        },
        messages: { orderBy: { createdAt: "asc" }, select: MESSAGE_SELECT },
      },
    }),
  ]);
  if (!ticket) notFound();

  const total = Number(ticket.order.total);
  const afterDays = Math.floor((ticket.createdAt.getTime() - ticket.order.createdAt.getTime()) / DAY_MS);

  return (
    <AdminShell
      title="Chi tiết bảo hành"
      subtitle={`Đơn ${ticket.order.code} · ${ticket.user.username}`}
      username={admin.username}
    >
      <AdminWarrantyDetail
        mailOn={mailEnabled(settings)}
        ticket={{
          id: ticket.id,
          status: ticket.status,
          issue: ticket.issue,
          description: ticket.description,
          imageUrl: ticket.imageUrl,
          createdAt: stamp(ticket.createdAt),
          createdAtIso: ticket.createdAt.toISOString(),
          resolvedAt: ticket.resolvedAt ? stamp(ticket.resolvedAt) : null,
          username: ticket.user.username,
          uid: ticket.user.uid,
          email: ticket.user.email,
          orderCode: ticket.order.code,
          orderPaid: ticket.order.status === "PAID",
          orderStatusLabel:
            ORDER_STATUS_LABELS[ticket.order.status as OrderStatus] ?? ticket.order.status,
          productName: ticket.order.product.name ?? ticket.order.product.code,
          productImage: ticket.order.product.imageUrl,
          packageLabel: ticket.order.package?.label ?? null,
          orderTotal: total,
          // The published rate is a starting figure; the desk can type any
          // amount up to the order total.
          suggestedRefund: promisedRefund(total, ticket.order.product.refundRate) ?? total,
          purchasedAt: stamp(ticket.order.createdAt),
          reportedAfter: afterDays <= 0 ? "trong ngày mua" : `sau ${afterDays} ngày`,
          reportedInWindow: !refundWindowClosed(ticket.order.createdAt, ticket.createdAt),
          refundAmount: ticket.refundAmount === null ? null : Number(ticket.refundAmount),
          refundMethod: ticket.refundMethod,
          bankName: ticket.bankName,
          bankAccount: ticket.bankAccount,
          accountHolder: ticket.accountHolder,
          bankSubmittedAt: ticket.bankSubmittedAt ? stamp(ticket.bankSubmittedAt) : null,
          bankSubmittedIso: ticket.bankSubmittedAt?.toISOString() ?? null,
          messages: ticket.messages.map(toChatMessage),
        }}
      />
    </AdminShell>
  );
}
