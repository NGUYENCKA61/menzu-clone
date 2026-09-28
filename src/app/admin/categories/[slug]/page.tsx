import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminCategoryDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminCategoryDetail";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Chi tiết danh mục | Quản trị" };
export const dynamic = "force-dynamic";

/** Route params arrive percent-encoded, and slugs are typed by the shop. */
function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * One category's desk — name, address, blurb, cover and the two tile counters.
 *
 * Addressed by slug rather than id for the same reason the storefront is: the
 * slug is the name the shop actually knows a category by, and it is what the
 * list screen has in hand when it links here.
 */
export default async function AdminCategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const slug = decodeSlug((await params).slug);
  const category = await db.category.findUnique({
    where: { slug },
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
  });
  if (!category) notFound();

  return (
    <AdminShell
      title={category.name}
      subtitle="Chi tiết danh mục — tên, đường dẫn, ảnh bìa và số liệu thẻ"
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
      <AdminCategoryDetail
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          platform: category.platform ?? "",
          imageUrl: category.imageUrl ?? "",
          // As text: the editor treats them as digits-in-a-box, not numbers.
          soldCount: String(category.soldCount),
          stockCount: String(category.stockCount),
          productCount: category._count.products,
        }}
      />
    </AdminShell>
  );
}
