import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { ToolDocsShell } from "@/components/sites/menzu-lol-f7ae197a/shared/ToolDocsShell";
import { PC_SETUP_PAGES, pcSetupHref, pcSetupPage } from "@/lib/pcSetup";
import { shareCard } from "@/lib/shareCard";
import { listToolDocsIndex } from "@/lib/toolDocs";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = pcSetupPage(slug);
  if (!page) return { title: "Không tìm thấy trang" };
  const canonical = pcSetupHref(page.slug);
  return {
    title: `${page.title} | Tài liệu`,
    description: page.short,
    alternates: { canonical },
    // og:url beside the canonical, with the full card (the owner's SEO
    // review, 13/10/2026).
    ...(await shareCard({ url: canonical })),
  };
}

const CARD = "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6";
const BODY = "text-sm leading-[1.65] text-neutral-300";

/** A line of the steps: an address in it becomes a link. */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s,)]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-semibold text-white underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * One "Chuẩn bị máy" page: what the setting is for, the steps, the notes,
 * and how to see it took, with the next page to go on to, as a checklist
 * reads.
 */
export default async function PcSetupPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = pcSetupPage(slug);
  if (!page) notFound();
  const index = await listToolDocsIndex();
  const at = PC_SETUP_PAGES.findIndex((p) => p.slug === page.slug);
  const prev = at > 0 ? PC_SETUP_PAGES[at - 1] : null;
  const next = at < PC_SETUP_PAGES.length - 1 ? PC_SETUP_PAGES[at + 1] : null;

  return (
    <SimplePage
      title={page.title}
      crumb="Tài liệu"
      crumbs={[
        { label: "Tài liệu", href: "/tai-lieu" },
        { label: "Chuẩn bị máy", href: "/tai-lieu#chuan-bi" },
        { label: page.title },
      ]}
      titleCase="normal"
      titleBar={false}
      ground="home"
      subtitle={
        <p className="flex items-center gap-2 text-[12px] font-medium text-neutral-400">
          <Wrench
            size={13}
            className="text-[var(--menzu-accent)]"
            aria-hidden
          />
          Chuẩn bị máy, bước {at + 1}/{PC_SETUP_PAGES.length}
        </p>
      }
    >
      <ToolDocsShell index={index} place={{ kind: "setup", slug: page.slug }}>
        <div className="flex flex-col gap-6">
          <p className={`${BODY} text-[15px]`}>{page.intro}</p>

          <ol className={`${CARD} flex flex-col gap-4`}>
            {page.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--menzu-accent)]/15 text-[12px] font-black text-[var(--menzu-accent)]">
                  {i + 1}
                </span>
                <p className={`${BODY} pt-0.5`}>
                  <Linked text={step} />
                </p>
              </li>
            ))}
          </ol>

          {page.notes && page.notes.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-amber-300">
                <Info size={13} aria-hidden />
                Lưu ý
              </p>
              <ul
                className={`${BODY} mt-2 flex list-disc flex-col gap-1.5 pl-5`}
              >
                {page.notes.map((note, i) => (
                  <li key={i}>
                    <Linked text={note} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* The shop pages a note points at, where the body cannot carry a
              link of its own. */}
          {page.links && page.links.length > 0 ? (
            <p className={`${BODY} flex flex-wrap items-center gap-x-4 gap-y-1`}>
              <span className="font-bold text-white">Trên shop:</span>
              {page.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-semibold text-white underline underline-offset-2 hover:text-[var(--menzu-accent)]"
                >
                  {link.label}
                </Link>
              ))}
            </p>
          ) : null}

          {page.check ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-emerald-400"
                aria-hidden
              />
              <p className={BODY}>
                <span className="font-bold text-white">Kiểm tra lại: </span>
                <Linked text={page.check} />
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {prev ? (
              <Link
                href={pcSetupHref(prev.slug)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[12px] font-bold text-neutral-300 hover:border-white/25 hover:text-white"
              >
                <ArrowLeft size={14} aria-hidden />
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={pcSetupHref(next.slug)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[var(--menzu-accent-dark)]"
              >
                {next.title}
                <ArrowRight size={14} aria-hidden />
              </Link>
            ) : (
              <Link
                href="/tai-lieu"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[var(--menzu-accent-dark)]"
              >
                Xong, chọn tool
                <ArrowRight size={14} aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </ToolDocsShell>
    </SimplePage>
  );
}
