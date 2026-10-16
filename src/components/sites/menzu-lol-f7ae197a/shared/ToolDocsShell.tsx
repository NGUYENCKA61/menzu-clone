import {
  Ban,
  BookOpen,
  ChevronRight,
  Cpu,
  Gamepad2,
  ListTree,
  LockOpen,
  Microchip,
  Package,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  DOCS_RAIL_BAR,
  DOCS_RAIL_BOX,
  DOCS_RAIL_LABEL,
  DOCS_RAIL_ROW,
  DOCS_RAIL_ROW_OFF,
  DOCS_RAIL_ROW_ON,
  docsRailIcon,
} from "@/components/sites/menzu-lol-f7ae197a/shared/docsRail";
import { sentenceCase } from "@/lib/displayCase";
import { PC_SETUP_PAGES, pcSetupHref } from "@/lib/pcSetup";
import { docHref, toolDocsHref } from "@/lib/routes";
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

/** Each machine-preparation page's glyph; a page added later gets the wrench. */
const SETUP_ICON: Record<string, LucideIcon> = {
  "tat-windows-defender": ShieldOff,
  "tat-secure-boot": LockOpen,
  "tat-core-isolation": Cpu,
  "tat-tpm": Microchip,
  "tat-anti-cheat-khac": Ban,
  "cai-runtime": Package,
  "reset-hwid": RotateCcw,
};

/** The line down the left of a game's tools, and of the open tool's parts,
 *  starting under the glyph of the row above. */
const BRANCH = "ml-5 mt-1 flex flex-col border-l border-white/10 pl-2";
const SUB =
  "rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-neutral-400 transition-colors hover:bg-white/5 hover:text-white";

function Row({
  href,
  now,
  icon: Icon,
  children,
}: {
  href: string;
  now: boolean;
  /** Left out for a tool under its game: the game's glyph stands for it. */
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={now ? "page" : undefined}
      className={`${DOCS_RAIL_ROW} ${now ? DOCS_RAIL_ROW_ON : DOCS_RAIL_ROW_OFF}`}
    >
      {now ? <span aria-hidden className={DOCS_RAIL_BAR} /> : null}
      {Icon ? <Icon size={16} aria-hidden className={docsRailIcon(now)} /> : null}
      <span className="min-w-0 flex-1 leading-snug">{children}</span>
    </Link>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className={DOCS_RAIL_LABEL}>{label}</span>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

/**
 * The sidebar, as docs.lmarket.net keeps one: "Bắt đầu", then every game
 * with its tools, then the machine-preparation pages. The game being read
 * opens; the others fold. Drawn once for a desktop column and once inside a
 * fold for a phone, where it would otherwise push the page down.
 *
 * Drawn as the Wiki draws its menu (the owner, 13/10/2026, UI consistency
 * review: the two looked like two different sites): the same box, 14px bold
 * rows each with a glyph, the page being read in the red tint with its red
 * bar, and the games named in sentence case, not small capitals, with their
 * counts kept. The game holding the page being read keeps its glyph red, so
 * the way down to it shows.
 */
function Nav({
  index,
  place,
}: {
  index: ToolDocsIndexCategory[];
  place: ToolDocsPlace;
}) {
  return (
    <nav aria-label="Tài liệu" className="flex flex-col gap-5">
      <Group label="Bắt đầu">
        <Row href="/tai-lieu" now={place.kind === "home"} icon={BookOpen}>
          Tài liệu hướng dẫn
        </Row>
        <Row href="/lien-he" now={false} icon={Users}>
          Liên hệ hỗ trợ
        </Row>
        <Row href="/docs" now={false} icon={ShieldCheck}>
          Bảo hành & câu hỏi thường gặp
        </Row>
      </Group>

      <Group label="Sản phẩm">
        {index.map((category) => {
          const open =
            place.kind === "tool" && place.categorySlug === category.slug;
          return (
            <details key={category.slug} open={open} className="group/game">
              <summary
                className={`${DOCS_RAIL_ROW} cursor-pointer list-none [&::-webkit-details-marker]:hidden ${
                  open
                    ? "border-transparent text-white hover:bg-white/5"
                    : DOCS_RAIL_ROW_OFF
                }`}
              >
                <Gamepad2 size={16} aria-hidden className={docsRailIcon(open)} />
                <span className="min-w-0 flex-1 truncate">
                  {sentenceCase(category.name)}
                </span>
                <span className="text-[11px] font-black tabular-nums text-neutral-500">
                  {category.tools.length}
                </span>
                <ChevronRight
                  size={14}
                  className="shrink-0 text-neutral-500 transition-transform group-open/game:rotate-90"
                  aria-hidden
                />
              </summary>
              <div className={`${BRANCH} gap-1`}>
                {category.tools.map((tool) => {
                  const now = place.kind === "tool" && place.slug === tool.slug;
                  return (
                    <div key={tool.slug}>
                      <Row href={toolDocsHref(tool.slug)} now={now}>
                        <span className="line-clamp-2" title={tool.name}>{sentenceCase(tool.name)}</span>
                      </Row>
                      {now ? (
                        <div className={`${BRANCH} gap-0.5`}>
                          {TOOL_DOCS_SECTIONS.filter(
                            (section) =>
                              section.id !== "bai-viet" ||
                              (place.articles?.length ?? 0) > 0,
                          ).map((section) => (
                            <a
                              key={section.id}
                              href={`#${section.id}`}
                              className={SUB}
                            >
                              {section.label}
                            </a>
                          ))}
                          {place.articles?.map((article) => (
                            <Link
                              key={article.slug}
                              href={docHref(article.slug)}
                              className={`${SUB} pl-5`}
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
      </Group>

      <Group label="Chuẩn bị máy">
        {PC_SETUP_PAGES.map((page) => (
          <Row
            key={page.slug}
            href={pcSetupHref(page.slug)}
            now={place.kind === "setup" && place.slug === page.slug}
            icon={SETUP_ICON[page.slug] ?? Wrench}
          >
            {page.title}
          </Row>
        ))}
      </Group>
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
      {/* A phone folds the menu away behind one row in the menu's own look. */}
      <details className={`${DOCS_RAIL_BOX} group/fold lg:hidden`}>
        <summary
          className={`${DOCS_RAIL_ROW} cursor-pointer list-none border-transparent text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden`}
        >
          <ListTree size={16} aria-hidden className={docsRailIcon(true)} />
          <span className="min-w-0 flex-1">Mục lục tài liệu</span>
          <ChevronRight
            size={14}
            className="shrink-0 text-neutral-500 transition-transform group-open/fold:rotate-90"
            aria-hidden
          />
        </summary>
        <div className="mt-3 border-t border-white/5 pt-3">
          <Nav index={index} place={place} />
        </div>
      </details>
      <aside className="hidden lg:block">
        <div
          className={`${DOCS_RAIL_BOX} sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2`}
        >
          <Nav index={index} place={place} />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
