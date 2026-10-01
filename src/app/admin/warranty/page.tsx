import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminWarranty } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminWarranty";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { promisedRefund, refundWindowClosed } from "@/lib/refundRequests";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = { title: "Bảo hành | Quản trị" };
export const dynamic = "force-dynamic";

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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The warranty desk: every report, the open ones first — and, since
 * 01/10/2026, where refunds are decided: a report the shop cannot fix is
 * refunded from its card, to the buyer's account on the site or over a bank.
 */
export default async function AdminWarrantyPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const [settings, rows] = await Promise.all([
    getShopSettings(),
    db.warrantyRequest.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        status: true,
        issue: true,
        description: true,
        imageUrl: true,
        adminNote: true,
        createdAt: true,
        resolvedAt: true,
        refundAmount: true,
        refundMethod: true,
        bankName: true,
        bankAccount: true,
        accountHolder: true,
        bankSubmittedAt: true,
        user: { select: { username: true, uid: true } },
        order: {
          select: {
            code: true,
            total: true,
            status: true,
            createdAt: true,
            product: { select: { name: true, code: true, refundRate: true } },
            package: { select: { label: true } },
          },
        },
      },
    }),
  ]);

  return (
    <AdminShell
      title="Bảo hành"
      subtitle="Khách báo lỗi theo từng đơn — nhận, xử lý, trả lời, hoặc hoàn tiền"
      username={admin.username}
    >
      <AdminWarranty
        rows={rows.map((r) => {
          const total = Number(r.order.total);
          const afterDays = Math.floor((r.createdAt.getTime() - r.order.createdAt.getTime()) / DAY_MS);
          return {
            id: r.id,
            status: r.status,
            issue: r.issue,
            description: r.description,
            imageUrl: r.imageUrl,
            adminNote: r.adminNote,
            createdAt: stamp(r.createdAt),
            resolvedAt: r.resolvedAt ? stamp(r.resolvedAt) : null,
            username: r.user.username,
            uid: r.user.uid,
            orderCode: r.order.code,
            orderPaid: r.order.status === "PAID",
            productName: r.order.product.name ?? r.order.product.code,
            packageLabel: r.order.package?.label ?? null,
            orderTotal: total,
            // The published rate is a starting figure; the desk can type any
            // amount up to the order total.
            suggestedRefund: promisedRefund(total, r.order.product.refundRate) ?? total,
            purchasedAt: stamp(r.order.createdAt),
            reportedAfter: afterDays <= 0 ? "trong ngày mua" : `sau ${afterDays} ngày`,
            reportedInWindow: !refundWindowClosed(r.order.createdAt, r.createdAt),
            refundAmount: r.refundAmount === null ? null : Number(r.refundAmount),
            refundMethod: r.refundMethod,
            bankName: r.bankName,
            bankAccount: r.bankAccount,
            accountHolder: r.accountHolder,
            bankSubmittedAt: r.bankSubmittedAt ? stamp(r.bankSubmittedAt) : null,
          };
        })}
        mailOn={mailEnabled(settings)}
      />
    </AdminShell>
  );
}
