import { BookOpen, ChevronRight, ListTree, Wrench } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PC_SETUP_PAGES, pcSetupHref } from "@/lib/pcSetup";
import { toolDocsHref } from "@/lib/routes";
import type { ToolDocsIndexCategory } from "@/lib/toolDocs";

/** Where the reader is, so the sidebar can say so and open the right game. */
export type ToolDocsPlace =
  | { kind: "home" }
  | {
      kind: "tool";
      slug: string;
      categorySlug: string;
      /** The tool's attached articles, listed under its sections. */
      articles?: { slug: string; title: string }[];
    }
  | { kind: "setup"; slug: string };

/** The sections a tool's page is cut into, in order, by their anchors. */
export const TOOL_DOCS_SECTIONS: { id: string; label: string }[] = [
  { id: "tong-quan", label: "Tổng quan" },
  { id: "yeu-cau", label: "Yêu cầu máy" },
  { id: "cai-dat", label: "Cài đặt" },
  { id: "tai-ve", label: "Tải về" },
  { id: "thiet-lap", label: "Thiết lập & sử dụng" },
  { id: "bai-viet", label: "Bài viết thêm" },
  { id: "loi-thuong-gap", label: "Lỗi thường gặp & hỗ trợ" },
];

const GROUP =
  "text-[10px] font-black uppercase tracking-widest text-neutral-500";
const ROW =
  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors";
const ROW_IDLE = `${ROW} text-neutral-300 hover:bg-white/5 hover:text-white`;
const ROW_NOW = `${ROW} bg-[var(--menzu-accent)]/10 text-white`;

function Row({
  href,
  now,
  children,
}: {
  href: string;
  now: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={now ? "page" : undefined}
      className={now ? ROW_NOW : ROW_IDLE}
    >
      {children}
    </Link>
  );
}

/**
 * The sidebar, as docs.lmarket.net keeps one: "Bắt đầu", then every game
 * with its tools, then the machine-preparation pages. The game being read
 * opens; the others fold. Drawn once for a desktop column and once inside a
 * fold for a phone, where it would otherwise push the page down.
 */
function Nav({
  index,
  place,
}: {
  index: ToolDocsIndexCategory[];
  place: ToolDocsPlace;
}) {
  return (
    <nav aria-label="Tài liệu" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className={`${GROUP} mb-1 px-2.5`}>Bắt đầu</span>
        <Row href="/tai-lieu" now={place.kind === "home"}>
          <BookOpen size={14} aria-hidden />
          Tài liệu hướng dẫn
        </Row>
        <Row href="/lien-he" now={false}>
          Liên hệ hỗ trợ
        </Row>
        <Row href="/docs" now={false}>
          Bảo hành & câu hỏi thường gặp
        </Row>
      </div>

      <div className="flex flex-col gap-1">
        <span className={`${GROUP} mb-1 px-2.5`}>Sản phẩm</span>
        {index.map((category) => {
          const open =
            place.kind === "tool" && place.categorySlug === category.slug;
          return (
            <details key={category.slug} open={open} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-neutral-200 hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  size={14}
                  className="shrink-0 text-neutral-500 transition-transform group-open:rotate-90"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
                <span className="text-[10px] font-black text-neutral-500">
                  {category.tools.length}
                </span>
              </summary>
              <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                {category.tools.map((tool) => {
                  const now = place.kind === "tool" && place.slug === tool.slug;
                  return (
                    <div key={tool.slug}>
                      <Row href={toolDocsHref(tool.slug)} now={now}>
                        <span className="line-clamp-2 leading-snug">
                          {tool.name}
                        </span>
                      </Row>
                      {now ? (
                        <div className="ml-2.5 mt-0.5 flex flex-col border-l border-white/10 pl-2">
                          {TOOL_DOCS_SECTIONS.filter(
                            (section) =>
                              section.id !== "bai-viet" ||
                              (place.articles?.length ?? 0) > 0,
                          ).map((section) => (
                            <a
                              key={section.id}
                              href={`#${section.id}`}
                              className="rounded-md px-2 py-1 text-[11px] text-neutral-400 hover:text-white"
                            >
                              {section.label}
                            </a>
                          ))}
                          {place.articles?.map((article) => (
                            <Link
                              key={article.slug}
                              href={`/docs/${article.slug}`}
                              className="rounded-md px-2 py-1 pl-4 text-[11px] text-neutral-400 hover:text-white"
                            >
                              {article.title}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <span className={`${GROUP} mb-1 px-2.5`}>Chuẩn bị máy</span>
        {PC_SETUP_PAGES.map((page) => (
          <Row
            key={page.slug}
            href={pcSetupHref(page.slug)}
            now={place.kind === "setup" && place.slug === page.slug}
          >
            <Wrench size={13} className="shrink-0" aria-hidden />
            <span className="leading-snug">{page.title}</span>
          </Row>
        ))}
      </div>
    </nav>
  );
}

/** The two columns of every documentation page: the sidebar and the page. */
export function ToolDocsShell({
  index,
  place,
  children,
}: {
  index: ToolDocsIndexCategory[];
  place: ToolDocsPlace;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-1 text-[11px] font-black uppercase tracking-widest text-white [&::-webkit-details-marker]:hidden">
          <ListTree
            size={15}
            className="text-[var(--menzu-accent)]"
            aria-hidden
          />
          Mục lục tài liệu
        </summary>
        <div className="mt-3 border-t border-white/5 pt-3">
          <Nav index={index} place={place} />
        </div>
      </details>
      <aside className="hidden lg:block">
        <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3 pr-2">
          <Nav index={index} place={place} />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
