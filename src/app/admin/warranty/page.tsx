import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminWarranty } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminWarranty";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

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

/** The warranty desk: every report, the open ones first. */
export default async function AdminWarrantyPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const rows = await db.warrantyRequest.findMany({
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
      user: { select: { username: true, uid: true } },
      order: {
        select: {
          code: true,
          product: { select: { name: true, code: true } },
          package: { select: { label: true } },
        },
      },
    },
  });

  return (
    <AdminShell
      title="Bảo hành"
      subtitle="Khách báo lỗi theo từng đơn — nhận, xử lý, trả lời"
      username={admin.username}
    >
      <AdminWarranty
        rows={rows.map((r) => ({
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
          productName: r.order.product.name ?? r.order.product.code,
          packageLabel: r.order.package?.label ?? null,
        }))}
      />
    </AdminShell>
  );
}
