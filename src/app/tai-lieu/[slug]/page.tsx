import type { Metadata } from "next";
import {
  BookOpen,
  Clock,
  Download,
  ExternalLink,
  LifeBuoy,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocsLockPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/DocsLockPanel";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import {
  TOOL_DOCS_SECTIONS,
  ToolDocsShell,
} from "@/components/sites/menzu-lol-f7ae197a/shared/ToolDocsShell";
import {
  DOCS_RULE_SENTENCE,
  docsUntilLabel,
  docsWindowEnd,
} from "@/lib/docsAccess";
import { DocHtml } from "@/lib/docFormat";
import { isHtmlBody } from "@/lib/docHtml";
import { DEFAULT_DOWNLOAD_NAME } from "@/lib/downloadName";
import { pcSetupHref, PC_SETUP_PAGES } from "@/lib/pcSetup";
import { DEFAULT_GUIDE, DEFAULT_SETUP_GUIDE } from "@/lib/productGuide";
import { requirementsOrDefault } from "@/lib/productRequirements";
import { productHref, toolDocsHref } from "@/lib/routes";
import { getCurrentUser } from "@/lib/session";
import { getToolDocs, listToolDocsIndex, toolDocsAccess } from "@/lib/toolDocs";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getToolDocs(slug);
  if (!tool) return { title: "Không tìm thấy tài liệu" };
  return {
    title: `${tool.name} | Tài liệu`,
    description: `Hướng dẫn cài đặt, thiết lập và sử dụng ${tool.name}.`,
    alternates: { canonical: toolDocsHref(tool.slug) },
  };
}

const CARD = "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6";
const H2 =
  "scroll-mt-28 text-[15px] font-black uppercase tracking-wider text-white";
const BODY = "text-sm leading-[1.65] text-neutral-300";
const BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[11px] font-black uppercase tracking-widest transition-colors";

/** How long a tier opens the docs for, in the words of the tier table. */
function windowLabel(durationHours: number | null): string {
  const end = docsWindowEnd(new Date(0), durationHours);
  if (end === null) return "không giới hạn";
  const days = Math.round(end.getTime() / (24 * 60 * 60 * 1000));
  if (days % 30 === 0) return `${days / 30} tháng`;
  if (days % 7 === 0 && days >= 7) return `${days / 7} tuần`;
  return `${days} ngày`;
}

/** A guide as stored: editor HTML, a legacy sentence, or the default. */
function Prose({ body, fallback }: { body: string; fallback: string }) {
  if (!body) return <p className={BODY}>{fallback}</p>;
  if (isHtmlBody(body)) return <DocHtml body={body} />;
  return <p className={BODY}>{body}</p>;
}

/**
 * One tool's documentation (the owner, 12/10/2026: "tài liệu hướng dẫn cài
 * đặt cũng như thiết lập … với key ngày nếu k thuê mới sau 2 ngày k coi đc
 * tài liệu và phần thiết lập"). The overview, the requirements and the
 * install guide are open to everyone, as they are on the tool's page; the
 * download and the setup guide open for as long as the reader's key says.
 */
export default async function ToolDocsPage({ params }: PageProps) {
  const { slug } = await params;
  const [tool, index, user] = await Promise.all([
    getToolDocs(slug),
    listToolDocsIndex(),
    getCurrentUser(),
  ]);
  if (!tool) notFound();
  const access = await toolDocsAccess(
    user ? { id: user.id, role: user.role } : null,
    tool.code,
  );
  const open = access.state === "open";
  const shop = productHref(tool.categorySlug, tool.slug);
  const here = toolDocsHref(tool.slug);
  const loginHref = `/login?next=${encodeURIComponent(here)}`;
  const requirements = requirementsOrDefault(tool.requirements);
  const label = (id: string) =>
    TOOL_DOCS_SECTIONS.find((s) => s.id === id)?.label ?? id;

  return (
    <SimplePage
      title={tool.name}
      crumb="Tài liệu"
      crumbs={[{ label: "Tài liệu", href: "/tai-lieu" }, { label: tool.name }]}
      titleCase="normal"
      titleBar={false}
      ground="home"
      subtitle={
        <p className="text-[12px] font-medium text-neutral-400">
          {tool.categoryName} ·{" "}
          <Link
            href={shop}
            className="font-bold text-neutral-300 underline underline-offset-2 hover:text-white"
          >
            Trang tool
          </Link>
        </p>
      }
    >
      <ToolDocsShell
        index={index}
        place={{
          kind: "tool",
          slug: tool.slug,
          categorySlug: tool.categorySlug,
        }}
      >
        <div className="flex flex-col gap-8">
          {/* Tổng quan */}
          <section id="tong-quan" className="flex flex-col gap-4">
            <h2 className={H2}>{label("tong-quan")}</h2>
            {tool.summary ? <p className={BODY}>{tool.summary}</p> : null}
            <div
              className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
                open
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : access.state === "expired"
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {open ? (
                <Unlock
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-400"
                  aria-hidden
                />
              ) : (
                <Clock
                  size={16}
                  className="mt-0.5 shrink-0 text-neutral-400"
                  aria-hidden
                />
              )}
              <p className="text-[13px] leading-relaxed text-neutral-200">
                {open ? (
                  access.until ? (
                    <>
                      Tài liệu đang mở với bạn đến{" "}
                      <span className="font-bold text-white">
                        {docsUntilLabel(access.until)}
                      </span>
                      . Thuê key mới là gia hạn.
                    </>
                  ) : (
                    <>Tài liệu mở với bạn không giới hạn thời gian.</>
                  )
                ) : access.state === "expired" ? (
                  <>
                    Hạn xem của bạn đã hết lúc{" "}
                    <span className="font-bold text-white">
                      {access.until ? docsUntilLabel(access.until) : ""}
                    </span>
                    . Thuê key mới để xem lại phần tải về và thiết lập.
                  </>
                ) : access.state === "guest" ? (
                  <>
                    Phần tải về và thiết lập dành cho khách đã thuê key. Đã thuê
                    rồi thì{" "}
                    <Link
                      href={loginHref}
                      className="font-bold text-white underline underline-offset-2"
                    >
                      đăng nhập
                    </Link>{" "}
                    để xem.
                  </>
                ) : (
                  <>
                    Bạn chưa thuê key của tool này. Thuê xong, phần tải về và
                    thiết lập mở ngay tại đây.
                  </>
                )}{" "}
                <span className="text-neutral-400">{DOCS_RULE_SENTENCE}</span>
              </p>
            </div>
            {tool.packages.length > 0 ? (
              <div className={CARD}>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Thuê gói nào, xem tài liệu được bao lâu
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {tool.packages.map((tier) => (
                    <li
                      key={tier.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-[13px]"
                    >
                      <span className="font-bold text-white">{tier.label}</span>
                      <span className="text-neutral-400">
                        {windowLabel(tier.durationHours)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {/* Yêu cầu máy */}
          <section id="yeu-cau" className="flex flex-col gap-4">
            <h2 className={H2}>{label("yeu-cau")}</h2>
            <dl className={`${CARD} divide-y divide-white/5 !p-0`}>
              {requirements.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr] sm:gap-4"
                >
                  <dt className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                    {row.label}
                  </dt>
                  <dd className="text-[13px] text-neutral-200">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className={BODY}>
              Trước khi cài, làm hết phần chuẩn bị máy:{" "}
              {PC_SETUP_PAGES.map((page, i) => (
                <span key={page.slug}>
                  {i > 0 ? ", " : ""}
                  <Link
                    href={pcSetupHref(page.slug)}
                    className="font-semibold text-neutral-200 underline underline-offset-2 hover:text-white"
                  >
                    {page.title}
                  </Link>
                </span>
              ))}
              .
            </p>
          </section>

          {/* Cài đặt */}
          <section id="cai-dat" className="flex flex-col gap-4">
            <h2 className={H2}>{label("cai-dat")}</h2>
            <div className={CARD}>
              <Prose body={tool.guide} fallback={DEFAULT_GUIDE} />
            </div>
          </section>

          {/* Tải về */}
          <section id="tai-ve" className="flex flex-col gap-4">
            <h2 className={H2}>{label("tai-ve")}</h2>
            {open ? (
              <div className={`${CARD} flex flex-col gap-4`}>
                {tool.downloadUrl ? (
                  <a
                    href={tool.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BUTTON} w-full bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)] sm:w-auto`}
                  >
                    <Download size={15} aria-hidden />
                    {tool.downloadName ?? DEFAULT_DOWNLOAD_NAME}
                  </a>
                ) : (
                  <p className={BODY}>
                    Link tải nằm trong đơn hàng của bạn: mở{" "}
                    <Link
                      href="/orders"
                      className="font-bold text-white underline underline-offset-2"
                    >
                      Lịch sử mua
                    </Link>
                    , bấm vào đơn để lấy link và key.
                  </p>
                )}
                {tool.docsUrl ? (
                  <a
                    href={tool.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-neutral-300 underline underline-offset-2 hover:text-white"
                  >
                    <ExternalLink size={13} aria-hidden />
                    Tài liệu riêng của tool (link ngoài)
                  </a>
                ) : null}
                <p className="text-[12px] text-neutral-500">
                  Key của bạn nằm trong đơn hàng ở Lịch sử mua, cùng link tải
                  này.
                </p>
              </div>
            ) : (
              <DocsLockPanel
                access={access}
                productHref={shop}
                loginHref={loginHref}
                what="Link tải"
              />
            )}
          </section>

          {/* Thiết lập & sử dụng */}
          <section id="thiet-lap" className="flex flex-col gap-4">
            <h2 className={H2}>{label("thiet-lap")}</h2>
            {open ? (
              <div className={CARD}>
                <Prose body={tool.setupGuide} fallback={DEFAULT_SETUP_GUIDE} />
              </div>
            ) : (
              <DocsLockPanel
                access={access}
                productHref={shop}
                loginHref={loginHref}
                what="Hướng dẫn thiết lập"
              />
            )}
          </section>

          {/* Lỗi thường gặp & hỗ trợ */}
          <section id="loi-thuong-gap" className="flex flex-col gap-4">
            <h2 className={H2}>{label("loi-thuong-gap")}</h2>
            <div className={`${CARD} flex flex-col gap-4`}>
              <ul className={`${BODY} flex list-disc flex-col gap-2 pl-5`}>
                <li>
                  Tool không mở, bị xoá ngay khi giải nén, hoặc báo lỗi driver:
                  làm lại{" "}
                  <Link
                    href={pcSetupHref("tat-windows-defender")}
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    Tắt Windows Defender
                  </Link>
                  ,{" "}
                  <Link
                    href={pcSetupHref("tat-core-isolation")}
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    Tắt Core Isolation
                  </Link>{" "}
                  và{" "}
                  <Link
                    href={pcSetupHref("tat-secure-boot")}
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    Tắt Secure Boot
                  </Link>
                  .
                </li>
                <li>
                  Báo thiếu file .dll hoặc runtime:{" "}
                  <Link
                    href={pcSetupHref("cai-runtime")}
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    Cài runtime cần thiết
                  </Link>
                  .
                </li>
                <li>
                  Key báo sai hoặc đã dùng: chép đúng key trong đơn hàng, không
                  thừa dấu cách; key đã gắn với máy khác thì gửi yêu cầu bảo
                  hành trong đơn để shop reset.
                </li>
                <li>
                  Game văng khi bật tool: tắt overlay (Discord, GeForce
                  Experience, Steam overlay) và phần mềm ghi hình, rồi{" "}
                  <Link
                    href={pcSetupHref("tat-anti-cheat-khac")}
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    tắt anti-cheat của game khác
                  </Link>
                  .
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/orders"
                  className={`${BUTTON} bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]`}
                >
                  <LifeBuoy size={15} aria-hidden />
                  Gửi yêu cầu bảo hành
                </Link>
                <Link
                  href="/lien-he"
                  className={`${BUTTON} border border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/25 hover:text-white`}
                >
                  Nhắn shop
                </Link>
                <Link
                  href="/tai-lieu"
                  className={`${BUTTON} border border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/25 hover:text-white`}
                >
                  <BookOpen size={15} aria-hidden />
                  Tài liệu khác
                </Link>
              </div>
            </div>
          </section>
        </div>
      </ToolDocsShell>
    </SimplePage>
  );
}
