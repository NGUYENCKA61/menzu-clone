import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { DEFAULT_FAQ } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FaqSection";
import {
  DocsHelpCenter,
  DocsSearchBox,
  DocsSearchProvider,
  type DocCard,
} from "@/components/sites/menzu-lol-f7ae197a/shared/DocsHelpCenter";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { listDocArticles } from "@/lib/queries";
import { getShopSettings } from "@/lib/settingsStore";
import { shareCard } from "@/lib/shareCard";

// The card spread in for og:url beside the canonical (the owner's SEO
// review, 13/10/2026).
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Wiki & hướng dẫn",
    description:
      "Tổng hợp hướng dẫn mua acc, chính sách bảo hành đổi trả và các câu hỏi thường gặp khi giao dịch tại THICHTHIHACK.",
    alternates: { canonical: "/docs" },
    ...(await shareCard({ url: "/docs" })),
  };
}

/**
 * The featured card wants a sentence. Articles written before the excerpt
 * field existed have none, so the body's first words stand in for it.
 */
function excerptOf(excerpt: string | null, body: string | null): string {
  const own = excerpt?.trim() ?? "";
  if (own) return own;
  if (!body) return "";
  const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 150 ? `${text.slice(0, 147).trimEnd()}…` : text;
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ ban?: string }>;
}) {
  const [rows, settings, query] = await Promise.all([listDocArticles(), getShopSettings(), searchParams]);
  // LAB: /docs?ban=cu shows the featured card and the list's pictures as they
  // were before the 18/10/2026 review, to set beside the new ones (the owner:
  // "làm url trang wiki bản cũ để tui so sánh thêm đi"). A production build
  // always shows the new.
  const old = process.env.NODE_ENV !== "production" && query.ban === "cu";

  const articles: DocCard[] = rows.map((article) => ({
    slug: article.slug,
    title: article.title,
    category: article.category,
    excerpt: excerptOf(article.excerpt, article.body),
    thumbnailUrl: article.thumbnailUrl,
    views: article.views,
    publishedAt: article.publishedAt.toISOString(),
    featured: article.featured,
  }));

  return (
    // The search box sits in the title row and filters the list below it, so
    // one provider holds the query for both.
    <DocsSearchProvider>
      <SimplePage
        title="Wiki & hướng dẫn"
        crumb="Wiki & Hướng dẫn"
        icon={BookOpen}
        action={<DocsSearchBox />}
        ground="home"
      >
        <DocsHelpCenter
          articles={articles}
          // The same questions the home page answers, from the same setting;
          // the stock five until the shop writes its own.
          faq={settings.seoFaq.length > 0 ? settings.seoFaq : DEFAULT_FAQ}
          contact={{
            facebook: settings.contactFacebook,
            zalo: settings.contactZalo,
            telegram: settings.contactTelegram,
          }}
          old={old}
        />
      </SimplePage>
    </DocsSearchProvider>
  );
}
