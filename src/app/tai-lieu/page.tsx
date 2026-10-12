import type { Metadata } from "next";
import { BookOpen, CheckSquare, LifeBuoy, Wrench } from "lucide-react";
import Link from "next/link";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import {
  ToolDocsHome,
  type DocsHomeCategory,
} from "@/components/sites/menzu-lol-f7ae197a/shared/ToolDocsHome";
import { ToolDocsShell } from "@/components/sites/menzu-lol-f7ae197a/shared/ToolDocsShell";
import { DOCS_RULE_SENTENCE, type DocsAccess } from "@/lib/docsAccess";
import { PC_SETUP_PAGES, pcSetupHref } from "@/lib/pcSetup";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { listToolDocsIndex, toolDocsAccessMap } from "@/lib/toolDocs";

export const metadata: Metadata = {
  title: "Tài liệu hướng dẫn",
  description:
    "Hướng dẫn cài đặt, thiết lập và xử lý lỗi cho từng tool, mở theo thời hạn key đã thuê.",
  alternates: { canonical: "/tai-lieu" },
};
export const dynamic = "force-dynamic";

const H2 =
  "flex items-center gap-3 text-[15px] font-black uppercase tracking-wider text-white";
const CARD = "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6";

const GUEST: DocsAccess = { state: "guest", until: null };
const NEVER: DocsAccess = { state: "never", until: null };
const OPEN: DocsAccess = { state: "open", until: null };

/** A support address as the shop typed it in Cấu hình, made into a link. */
function contactHref(value: string, base: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  return `${base}${text.replace(/^@/, "").replace(/\s+/g, "")}`;
}

/**
 * The documentation landing, as docs.lmarket.net opens: a word on what is
 * here, a search over the games, every game with its tools, the checklist
 * to run through before any install, and where to ask when stuck. Each
 * tool shows this reader's own standing with its docs.
 */
export default async function ToolDocsHomePage() {
  const [index, user, settings] = await Promise.all([
    listToolDocsIndex(),
    getCurrentUser(),
    getShopSettings(),
  ]);
  const viewer = user ? { id: user.id, role: user.role } : null;
  const access = await toolDocsAccessMap(viewer);
  const categories: DocsHomeCategory[] = index.map((category) => ({
    slug: category.slug,
    name: category.name,
    logoUrl: category.logoUrl,
    tools: category.tools.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      access: !viewer
        ? GUEST
        : viewer.role === "ADMIN"
          ? OPEN
          : (access.get(tool.id) ?? NEVER),
    })),
  }));
  const telegram = contactHref(settings.contactTelegram, "https://t.me/");
  const zalo = contactHref(settings.contactZalo, "https://zalo.me/");

  return (
    <SimplePage
      title="Tài liệu hướng dẫn"
      crumb="Tài liệu"
      icon={BookOpen}
      ground="home"
    >
      <ToolDocsShell index={index} place={{ kind: "home" }}>
        <div className="flex flex-col gap-8">
          <section className={CARD}>
            <p className="text-sm leading-relaxed text-neutral-300">
              Hướng dẫn cài đặt, thiết lập và xử lý lỗi cho từng tool bạn thuê
              tại shop, viết riêng cho từng bản. Chọn game bên dưới rồi chọn
              tool; phần chuẩn bị máy dùng chung cho mọi tool.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">
              {DOCS_RULE_SENTENCE}
              {!user ? " Đăng nhập để thấy tool nào đang mở với bạn." : ""}
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className={H2}>
              <BookOpen
                size={18}
                className="text-[var(--menzu-accent)]"
                aria-hidden
              />
              Chọn game
            </h2>
            {categories.length === 0 ? (
              <p className="text-sm text-neutral-400">Shop chưa có tool nào.</p>
            ) : (
              <ToolDocsHome categories={categories} />
            )}
          </section>

          <section id="chuan-bi" className="flex flex-col gap-4">
            <h2 className={H2}>
              <Wrench
                size={18}
                className="text-[var(--menzu-accent)]"
                aria-hidden
              />
              Trước khi cài bất cứ tool nào
            </h2>
            <ol className={`${CARD} flex flex-col gap-2`}>
              {PC_SETUP_PAGES.map((page, index) => (
                <li key={page.slug}>
                  <Link
                    href={pcSetupHref(page.slug)}
                    className="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
                  >
                    <CheckSquare
                      size={16}
                      className="mt-0.5 shrink-0 text-neutral-600 group-hover:text-[var(--menzu-accent)]"
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-white">
                        {index + 1}. {page.title}
                      </span>
                      <span className="block text-[12px] text-neutral-400">
                        {page.short}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className={H2}>
              <LifeBuoy
                size={18}
                className="text-[var(--menzu-accent)]"
                aria-hidden
              />
              Kẹt ở đâu đó?
            </h2>
            <div
              className={`${CARD} flex flex-col gap-3 text-sm text-neutral-300`}
            >
              <p>
                Tool lỗi sau khi đã làm đúng hướng dẫn: gửi yêu cầu bảo hành
                ngay trong đơn hàng, shop trả lời trên trang đó.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/orders"
                  className="inline-flex h-10 items-center rounded-xl bg-[var(--menzu-accent)] px-4 text-[11px] font-black uppercase tracking-widest text-white hover:bg-[var(--menzu-accent-dark)]"
                >
                  Lịch sử mua & bảo hành
                </Link>
                {telegram ? (
                  <a
                    href={telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 hover:border-white/25 hover:text-white"
                  >
                    Telegram
                  </a>
                ) : null}
                {zalo ? (
                  <a
                    href={zalo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 hover:border-white/25 hover:text-white"
                  >
                    Zalo
                  </a>
                ) : null}
                <Link
                  href="/lien-he"
                  className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 hover:border-white/25 hover:text-white"
                >
                  Mọi kênh liên hệ
                </Link>
              </div>
            </div>
          </section>
        </div>
      </ToolDocsShell>
    </SimplePage>
  );
}
