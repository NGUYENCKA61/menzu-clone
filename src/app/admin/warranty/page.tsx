import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminWarranty } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminWarranty";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { awaitingShop, messagePreview } from "@/lib/warrantyChat";

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

/**
 * The warranty queue: one line per ticket, the ones that need the shop on
 * top, each opening its own page (/admin/warranty/[id]) where the
 * conversation, the moves and the refund live (the owner, 01/10/2026: "sửa
 * lại trong Dashboard admin bảo hành sao cho đỡ rối dễ thao tác với khách
 * hàng").
 */
export default async function AdminWarrantyPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  // Taken before the read, so anything landing while it runs still counts as
  // news for the queue's "có cập nhật mới".
  const loadedAt = new Date().toISOString();
  const rows = await db.warrantyRequest.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 300,
    select: {
      id: true,
      status: true,
      issue: true,
      description: true,
      createdAt: true,
      bankAccount: true,
      refundMethod: true,
      user: { select: { username: true } },
      order: {
        select: {
          code: true,
          product: { select: { name: true, code: true } },
          package: { select: { label: true } },
        },
      },
      // The last word only — the queue shows who had it and what it said.
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { fromShop: true, body: true, createdAt: true } },
    },
  });

  return (
    <AdminShell
      title="Bảo hành"
      subtitle="Khách báo lỗi theo từng đơn — bấm vào một yêu cầu để trao đổi, xử lý hoặc hoàn tiền"
      username={admin.username}
    >
      <AdminWarranty
        loadedAt={loadedAt}
        rows={rows.map((r) => {
          const last = r.messages[0] ?? null;
          const bankRefund = r.status === "REFUNDING" && r.refundMethod === "MANUAL";
          return {
            id: r.id,
            status: r.status,
            issue: r.issue,
            productName: r.order.product.name ?? r.order.product.code,
            packageLabel: r.order.package?.label ?? null,
            username: r.user.username,
            orderCode: r.order.code,
            awaitingShop: awaitingShop(r.status, last?.fromShop ?? null),
            transferDue: bankRefund && r.bankAccount !== null,
            bankAwaited: bankRefund && r.bankAccount === null,
            lastAt: stamp(last?.createdAt ?? r.createdAt),
            lastTs: (last?.createdAt ?? r.createdAt).getTime(),
            lastFromShop: last ? last.fromShop : null,
            preview: messagePreview(last ? last.body : r.description, 160),
          };
        })}
      />
    </AdminShell>
  );
}
