import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, Library } from "lucide-react";

import { FacebookGlyph, ZaloGlyph } from "@/components/sites/menzu-lol-f7ae197a/shared/BrandGlyphs";
import { GlossaryBrowser } from "@/components/sites/menzu-lol-f7ae197a/shared/GlossaryBrowser";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { GLOSSARY_PATH, GLOSSARY_TERMS } from "@/lib/glossary/terms";
import { breadcrumbJsonLd, glossaryJsonLd, JsonLd } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";
import { shareCard } from "@/lib/shareCard";

interface PageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Thuật ngữ hack game: aimbot, ESP, spoofer, HWID",
    description:
      "Giải nghĩa hơn 80 thuật ngữ khi mua và dùng hack game: aimbot, FOV, silent aim, ESP, wallhack, spoofer, HWID, loader, Secure Boot, TPM.",
    alternates: { canonical: GLOSSARY_PATH },
    ...(await shareCard({ url: GLOSSARY_PATH, type: "website" })),
  };
}

/** A shared ?q= is a word or two; anything longer is not a search. */
const MAX_QUERY = 80;

const CONTACT_BUTTON =
  "inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 text-[13px] font-bold text-white transition-colors hover:border-white/25 hover:bg-white/10";

/**
 * The glossary, a page of its own (the owner, 13/10/2026: "trang thuật ngữ
 * học theo unnamed"). It used to be one long article of bullet lines with
 * nothing to search and nothing to link to; that article now redirects here.
 *
 * unnamedtech's wiki gave the shape: a search across the top, every word as
 * a card under its group, a "still have questions" card at the end. The
 * dress is the shop's: the wiki's page head, the /docs rail and red bar, the
 * tool status colours for how exposed a feature is. The words themselves
 * live in lib/glossary/terms.ts.
 */
export default async function GlossaryPage({ searchParams }: PageProps) {
  const [{ q }, settings] = await Promise.all([searchParams, getShopSettings()]);
  const initialQuery = (Array.isArray(q) ? (q[0] ?? "") : (q ?? "")).trim().slice(0, MAX_QUERY);

  const contacts = [
    { href: settings.contactZalo.trim(), label: "Nhắn Zalo", Glyph: ZaloGlyph },
    { href: settings.contactFacebook.trim(), label: "Nhắn Facebook", Glyph: FacebookGlyph },
  ].filter((contact) => contact.href.length > 0);

  return (
    <>
      <JsonLd data={glossaryJsonLd(GLOSSARY_TERMS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          { name: "Wiki & Hướng dẫn", path: "/docs" },
          { name: "Thuật ngữ", path: GLOSSARY_PATH },
        ])}
      />
      <SimplePage
        title="Thuật ngữ"
        crumb="Thuật ngữ"
        crumbs={[{ label: "Wiki & Hướng dẫn", href: "/docs" }, { label: "Thuật ngữ" }]}
        icon={Library}
        ground="home"
        subtitle={
          <p className="text-sm text-neutral-400">
            Gõ tên chức năng hoặc từ lạ để xem nó nghĩa là gì. Mỗi từ có link riêng để gửi cho bạn
            bè.
          </p>
        }
      >
        <GlossaryBrowser
          terms={GLOSSARY_TERMS}
          initialQuery={initialQuery}
          footer={
            // unnamedtech's "Still have questions?", pointing at the shop's
            // own Zalo and Facebook rather than a Discord.
            <aside className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-start gap-3">
                <CircleHelp size={18} aria-hidden className="mt-0.5 shrink-0 text-[var(--menzu-accent)]" />
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-white">Vẫn chưa rõ?</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">
                    Nhắn shop kèm từ bạn đang thắc mắc và tên tool, shop sẽ giải thích và bổ sung vào
                    trang này.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {contacts.length > 0 ? (
                      contacts.map(({ href, label, Glyph }) => (
                        <a key={label} href={href} target="_blank" rel="noreferrer" className={CONTACT_BUTTON}>
                          <Glyph className="h-4 w-4 shrink-0" />
                          {label}
                        </a>
                      ))
                    ) : (
                      <Link href="/lien-he" className={CONTACT_BUTTON}>
                        Kênh liên hệ của shop
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          }
        />
      </SimplePage>
    </>
  );
}
