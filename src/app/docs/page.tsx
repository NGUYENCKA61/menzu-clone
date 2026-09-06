import type { Metadata } from "next";

import { DEFAULT_FAQ } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FaqSection";
import {
  DocsHelpCenter,
  type DocCard,
} from "@/components/sites/menzu-lol-f7ae197a/shared/DocsHelpCenter";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { listDocArticles } from "@/lib/queries";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = {
  title: "Wiki & Hướng Dẫn",
  description:
    "Tổng hợp hướng dẫn mua acc, chính sách bảo hành đổi trả và các câu hỏi thường gặp khi giao dịch tại THICHTHIHACK.",
  alternates: { canonical: "/docs" },
};

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

export default async function DocsPage() {
  const [rows, settings] = await Promise.all([listDocArticles(), getShopSettings()]);

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
    <SimplePage title="Wiki & Hướng Dẫn" crumb="Wiki & Hướng dẫn">
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
      />
    </SimplePage>
  );
}
