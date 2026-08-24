import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminAccountDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminAccountDetail";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminSoftwareDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSoftwareDetail";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { isHtmlBody, plainToDocHtml } from "@/lib/docHtml";

export const metadata: Metadata = { title: "Chi tiết sản phẩm | Quản trị" };
export const dynamic = "force-dynamic";

/** Route params arrive percent-encoded — Vietnamese account codes exist. */
function decodeCode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** One account's desk: price, pictures, inventory and the danger zone. */
export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const code = decodeCode((await params).code);
  const product = await db.product.findFirst({
    where: { code, deletedAt: null, productType: "ACCOUNT_GAME" },
    include: {
      category: { select: { name: true } },
      _count: { select: { orders: true } },
      tags: { select: { label: true } },
      images: { select: { id: true, url: true }, orderBy: { sortOrder: "asc" } },
      skins: {
        where: { kind: { in: ["WEAPON_SKIN", "AGENT", "BUDDY"] } },
        select: { kind: true, name: true },
        orderBy: { id: "asc" },
      },
    },
  });

  // Not an account? The same address serves software — one desk per product,
  // whatever its type.
  if (!product) {
    const software = await db.product.findFirst({
      where: { code, deletedAt: null, productType: "SOFTWARE_GAME" },
      include: {
        category: { select: { name: true } },
        packages: {
          orderBy: { price: "asc" },
          include: { _count: { select: { orders: true } } },
        },
      },
    });
    if (!software) notFound();

    return (
      <AdminShell
        title={software.name ?? software.code}
        subtitle="Chi tiết phần mềm — thông tin, giá, gói thời hạn"
        username={admin.username}
        aside={
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Danh sách sản phẩm
          </Link>
        }
      >
        <AdminSoftwareDetail
          software={{
            code: software.code,
            name: software.name ?? software.code,
            categoryName: software.category.name,
            softwareStatus: software.softwareStatus,
            status: software.status,
            price: Number(software.price),
            // Lifted to editor HTML here so the client bundle never needs the
            // converter — same treatment article bodies get.
            descriptionHtml: software.description
              ? isHtmlBody(software.description)
                ? software.description
                : plainToDocHtml(software.description)
              : "",
            downloadUrl: software.downloadUrl ?? "",
            imageUrl: software.imageUrl ?? "",
            videoUrl: software.videoUrl ?? "",
            version: software.version ?? "",
            platform: software.platform ?? "",
            packages: software.packages.map((p) => ({
              id: p.id,
              label: p.label,
              price: Number(p.price),
              durationHours: p.durationHours,
              orderCount: p._count.orders,
            })),
          }}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={`#${product.code}`}
      subtitle="Chi tiết tài khoản — giá, ảnh, vật phẩm và trạng thái"
      username={admin.username}
      aside={
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Danh sách sản phẩm
        </Link>
      }
    >
      <AdminAccountDetail
        account={{
          code: product.code,
          rank: product.rank,
          status: product.status,
          price: Number(product.price),
          oldPrice: Number(product.oldPrice),
          categoryName: product.category.name,
          orderCount: product._count.orders,
          imageUrl: product.imageUrl ?? "",
          gallery: product.images,
          tag: product.tags[0]?.label ?? "",
          vip: product.vp,
          vipIngame: product.rp,
          skinNames: product.skins
            .filter((s) => s.kind === "WEAPON_SKIN")
            .map((s) => s.name),
          characterNames: product.skins
            .filter((s) => s.kind === "AGENT")
            .map((s) => s.name),
          gearNames: product.skins.filter((s) => s.kind === "BUDDY").map((s) => s.name),
        }}
      />
    </AdminShell>
  );
}
