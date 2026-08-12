import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminDocs } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminDocs";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { listDocArticles } from "@/lib/queries";

export const metadata: Metadata = { title: "Bài viết | Quản trị" };
export const dynamic = "force-dynamic";

export default async function AdminDocsPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/login?next=%2Fadmin%2Fdocs");

  const docs = await listDocArticles();

  return (
    <AdminShell
      title="Bài viết Wiki"
      subtitle="Soạn nội dung cho FAQ, chính sách bảo hành và hướng dẫn"
      username={admin.username}
    >
      <AdminDocs
        docs={docs.map((doc) => ({
          slug: doc.slug,
          title: doc.title,
          category: doc.category,
          excerpt: doc.excerpt,
          body: doc.body,
          views: doc.views,
          publishedAt: doc.publishedAt.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        }))}
      />
    </AdminShell>
  );
}
