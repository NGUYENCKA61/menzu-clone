import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { listDocArticles } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Wiki & Hướng Dẫn",
  description:
    "Tổng hợp hướng dẫn mua acc, chính sách bảo hành đổi trả và các câu hỏi thường gặp khi giao dịch tại THICHTHIHACK.",
  alternates: { canonical: "/docs" },
};

/** Section headings, in the order the live index lists them. */
const SECTIONS = [
  { key: "FAQ", label: "FAQ" },
  { key: "WARRANTY", label: "Chính sách bảo hành" },
  { key: "GUIDE", label: "Hướng dẫn" },
] as const;

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export default async function DocsPage() {
  const articles = await listDocArticles();

  return (
    <SimplePage title="Wiki & Hướng Dẫn" crumb="Wiki & Hướng dẫn">
      <p className="text-sm text-neutral-400 max-w-2xl -mt-4 mb-10 leading-relaxed">
        Tổng hợp hướng dẫn mua acc, chính sách bảo hành đổi trả, cùng những câu
        hỏi thường gặp khi giao dịch tại cửa hàng.
      </p>

      <div className="space-y-12">
        {SECTIONS.map((section) => {
          const items = articles.filter((article) => article.category === section.key);
          if (items.length === 0) return null;

          return (
            // The id is what the footer's "Câu hỏi thường gặp" and "Chính sách
            // bảo hành" links aim at; scroll-mt keeps the heading clear of the
            // fixed header when one of them lands here.
            <section
              key={section.key}
              id={section.key}
              className="space-y-5 scroll-mt-[120px]"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                  {section.label}
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--menzu-accent)]/30 to-transparent" />
                <span className="text-[10px] font-bold text-neutral-500">{items.length} bài</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/docs/${article.slug}`}
                    className="group rounded-2xl border border-zinc-800/80 bg-[#121216] overflow-hidden hover:border-[var(--menzu-accent)]/50 transition-colors flex flex-col"
                  >
                    <div className="relative aspect-[16/9] bg-black/40">
                      <Image
                        src={article.thumbnailUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <h3 className="text-[13px] font-bold text-white leading-snug group-hover:text-[var(--menzu-accent)] transition-colors">
                        {article.title}
                      </h3>

                      <div className="mt-auto flex items-center justify-between pt-2 text-[10px] font-bold text-neutral-500">
                        <span>{dateFormat.format(article.publishedAt)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye size={11} />
                          {article.views.toLocaleString("vi-VN")}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--menzu-accent)]">
                        Chi tiết
                        <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </SimplePage>
  );
}
