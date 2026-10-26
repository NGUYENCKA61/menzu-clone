import "server-only";

import { db } from "@/lib/db";
import { GLOSSARY_PATH } from "@/lib/glossary/terms";
import { SHOW_SETUP_GUIDES_ROW } from "@/lib/hiddenFeatures";
import { PC_SETUP_PAGES, pcSetupHref } from "@/lib/pcSetup";
import { listToolArticles } from "@/lib/queries";
import { docHref } from "@/lib/routes";

/**
 * "Hướng dẫn liên quan": the wiki articles and the setup pages a shelf, a
 * tool or an account listing points its reader at.
 *
 * The money pages never linked the guides, and the guides linked the money
 * pages only through an empty category (the SEO review, round 2, O12). The
 * links are decided here, on the server, from a written map and the wiki's
 * own titles, and drawn by RelatedGuides.tsx. A slug the map names that is
 * not in the database yet (the round-2 wiki backlog) simply does not render,
 * so the map may name it today.
 */

export interface GuideLink {
  title: string;
  href: string;
}

export interface RelatedGuides {
  /** What the game row is headed by ("Về Valorant"); "" for a shelf the map
   *  does not know, whose row is then headed generically. */
  gameName: string;
  /** This game's articles: the tool's own docs first, then the map, then
   *  the wiki's titles that name the game. */
  game: GuideLink[];
  /** Buying, warranty and the HWID policy: the same on every page. */
  general: GuideLink[];
  /** The seven "Chuẩn bị máy" pages, as chips. */
  setup: GuideLink[];
}

/** Every page's second row, in this order, and the glossary always last. */
export const GENERAL_GUIDES = [
  "setup-may-chuan-thich-thi-hack",
  "nap-tien-va-mua-tool-lan-dau",
  "quy-trinh-bao-hanh",
  "chinh-sach-ho-tro-doi-may",
  "hwid-la-gi-reset-hwid",
];

export const GLOSSARY_LINK: GuideLink = { title: "Từ điển thuật ngữ", href: GLOSSARY_PATH };

/** An account listing's first row: what an NFA account is and how it is
 *  bought, warranted and handed over. */
export const ACCOUNT_GUIDES = [
  "acc-nfa-acc-rac-la-gi",
  "mua-tai-khoan-nfa",
  "chinh-sach-bao-hanh-hoan-tien-acc-nfa",
  "acc-full-thong-tin-la-gi",
];

/**
 * The general row an account listing keeps. The setup article, the HWID
 * article and the reset-HWID policy are about keys and the machines they
 * are bound to; an account has neither.
 */
export const ACCOUNT_GENERAL_GUIDES = ["nap-tien-va-mua-tool-lan-dau", "quy-trinh-bao-hanh"];

/** Each shelf's articles, in the order they are offered. */
export const GAME_GUIDES: Record<string, string[]> = {
  "hack-cs2-counter-strike-2": [
    "config-la-gi",
    "legit-rage-hvh-la-gi",
    "hack-cs2-co-bi-vac-ban-khong",
    "chinh-sach-bao-hanh-hoan-tien-phan-mem",
  ],
  "hack-valorant-moi": [
    "tat-secure-boot-va-ao-hoa",
    "spoofer-la-gi",
    "cai-spoofer-tai-nha",
    "hack-valorant-vanguard-hwid-ban",
  ],
  "hack-delta-force-moi": [
    "spoofer-la-gi",
    "cai-spoofer-tai-nha",
    "delta-force-bi-khoa-hwid-phai-lam-sao",
    "may-net-dung-hack-duoc-khong",
  ],
  "hack-dot-kich-cfvn-cf4vn": [
    "dot-kich-con-hack-duoc-khong-2026",
    "may-net-dung-hack-duoc-khong",
    "acc-nfa-acc-rac-la-gi",
    "mua-tai-khoan-nfa",
  ],
  "hack-truy-kich-pc-truy-kich-2": [
    "may-net-dung-hack-duoc-khong",
    "chinh-sach-bao-hanh-hoan-tien-phan-mem",
  ],
  "hack-blood-strike-moi": [
    "may-net-dung-hack-duoc-khong",
    "chinh-sach-bao-hanh-hoan-tien-phan-mem",
  ],
  "tool-hack-acc-lien-minh-huyen-thoai-lol": [
    "acc-nfa-acc-rac-la-gi",
    "mua-tai-khoan-nfa",
    "chinh-sach-bao-hanh-hoan-tien-acc-nfa",
    "hack-valorant-vanguard-hwid-ban",
  ],
  "hack-call-of-duty-warzone-black-ops-6": ["spoofer-la-gi", "may-net-dung-hack-duoc-khong"],
};

/** How an article's title names each game, for the articles the map does
 *  not list yet. */
export const GAME_WORDS: Record<string, RegExp> = {
  "hack-cs2-counter-strike-2": /\bcs2\b|counter.?strike/i,
  "hack-valorant-moi": /valorant|vanguard/i,
  "hack-delta-force-moi": /delta force/i,
  "hack-dot-kich-cfvn-cf4vn": /đột kích|cfvn|cf4vn/i,
  "hack-truy-kich-pc-truy-kich-2": /truy kích/i,
  "hack-blood-strike-moi": /blood strike/i,
  "tool-hack-acc-lien-minh-huyen-thoai-lol": /\blol\b|liên minh|lmht/i,
  "hack-call-of-duty-warzone-black-ops-6": /warzone|black ops|\bbo6\b/i,
};

/** The game as the row's heading says it, after "Về". */
export const GAME_NAMES: Record<string, string> = {
  "hack-cs2-counter-strike-2": "CS2",
  "hack-valorant-moi": "Valorant",
  "hack-delta-force-moi": "Delta Force",
  "hack-dot-kich-cfvn-cf4vn": "Đột Kích CFVN",
  "hack-truy-kich-pc-truy-kich-2": "Truy Kích",
  "hack-blood-strike-moi": "Blood Strike",
  "tool-hack-acc-lien-minh-huyen-thoai-lol": "Liên Minh Huyền Thoại",
  "hack-call-of-duty-warzone-black-ops-6": "Warzone, Black Ops 6",
};

/** The heading over an account listing's first row. */
export const ACCOUNT_GAME_NAME = "tài khoản NFA";

/** Test rows and the paging fixtures still in the local wiki. */
export const JUNK_SLUG = /^(thu-|dsad|\d+$)/;
/** The cloned shop's mail articles, which are not this shop's. */
export const JUNK_TITLE = /menzu|drop mail|welcome/i;

/** The most articles the game row offers. */
export const GAME_ROW_MAX = 6;

/** A wiki row as the picker reads it: `body` says whether the article has
 *  anything to show (an empty one is noindex and draws a blank page). */
export interface ArticleRow {
  slug: string;
  title: string;
  body: boolean;
}

export interface PickInput {
  categorySlug: string;
  /** The tool's own docs (DocArticle.productId), in the shop's order. */
  productArticles: { slug: string; title: string }[];
  articles: ArticleRow[];
  /** The map the game row reads; GAME_GUIDES unless told otherwise. */
  gameGuides?: Record<string, string[]>;
  /** The second row's list; GENERAL_GUIDES unless told otherwise. */
  generalGuides?: string[];
}

/**
 * Which articles a page offers, as slugs, in order. Pure, so it is tested
 * without a database:
 *
 *   game    the tool's own docs, then the shelf's map entries, then the
 *           wiki articles whose title names the game, skipping test rows
 *           and the cloned shop's mail articles; without repeats, at most
 *           GAME_ROW_MAX
 *   general GENERAL_GUIDES, those that exist, in order
 *
 * A slug that is not among `articles` with a body is left out, which is
 * how a map entry for an article not written yet costs nothing.
 */
export function pickRelatedGuides(input: PickInput): { game: string[]; general: string[] } {
  const written = new Set(input.articles.filter((a) => a.body).map((a) => a.slug));
  const mapped = (input.gameGuides ?? GAME_GUIDES)[input.categorySlug] ?? [];
  const words = GAME_WORDS[input.categorySlug];
  const byTitle = words
    ? input.articles
        .filter(
          (a) =>
            a.body && !JUNK_SLUG.test(a.slug) && !JUNK_TITLE.test(a.title) && words.test(a.title),
        )
        .map((a) => a.slug)
    : [];

  const game: string[] = [];
  for (const slug of [
    ...input.productArticles.map((a) => a.slug),
    ...mapped.filter((slug) => written.has(slug)),
    ...byTitle,
  ]) {
    if (game.length >= GAME_ROW_MAX) break;
    if (!game.includes(slug)) game.push(slug);
  }

  const general = (input.generalGuides ?? GENERAL_GUIDES).filter((slug) => written.has(slug));
  return { game, general };
}

/**
 * Every wiki article with something to show: the public set the sitemap and
 * the article page agree on (a body, not attached to a tool). Slugs and
 * titles only; the bodies stay in the database.
 */
async function wikiRows(): Promise<ArticleRow[]> {
  const rows = await db.docArticle.findMany({
    where: { productId: null, body: { not: null } },
    select: { slug: true, title: true },
  });
  return rows.map((row) => ({ ...row, body: true }));
}

/** The setup chips: the seven "Chuẩn bị máy" pages, in their order. */
function setupLinks(): GuideLink[] {
  return PC_SETUP_PAGES.map((page) => ({ title: page.title, href: pcSetupHref(page.slug) }));
}

/** Slugs back to links, titled as the wiki titles them. */
function toLinks(slugs: string[], titles: Map<string, string>): GuideLink[] {
  return slugs.flatMap((slug) => {
    const title = titles.get(slug);
    return title ? [{ title, href: docHref(slug) }] : [];
  });
}

/** The picked slugs as the page draws them, with the glossary closing the
 *  general row and the setup chips when the page wants them. */
function assemble(pick: PickInput, gameName: string, setup: boolean): RelatedGuides {
  const picked = pickRelatedGuides(pick);
  const titles = new Map(
    [...pick.articles, ...pick.productArticles].map((a) => [a.slug, a.title]),
  );
  return {
    gameName,
    game: toLinks(picked.game, titles),
    general: [...toLinks(picked.general, titles), GLOSSARY_LINK],
    // The "Chuẩn bị máy" row is hidden for now (lib/hiddenFeatures).
    setup: setup && SHOW_SETUP_GUIDES_ROW ? setupLinks() : [],
  };
}

/** A shelf's guides: the map and the titles, no tool docs. */
export async function relatedGuidesForCategory(categorySlug: string): Promise<RelatedGuides> {
  const articles = await wikiRows();
  return assemble(
    { categorySlug, productArticles: [], articles },
    GAME_NAMES[categorySlug] ?? "",
    true,
  );
}

/** A tool's guides: its own docs lead the game row. */
export async function relatedGuidesForTool(product: {
  id: string;
  categorySlug: string;
}): Promise<RelatedGuides> {
  const [productArticles, articles] = await Promise.all([
    listToolArticles(product.id),
    wikiRows(),
  ]);
  return assemble(
    {
      categorySlug: product.categorySlug,
      productArticles: productArticles.map((a) => ({ slug: a.slug, title: a.title })),
      articles,
    },
    GAME_NAMES[product.categorySlug] ?? "",
    true,
  );
}

/**
 * An account listing's guides: the NFA articles first, then the general row
 * without the key-only entries, and no setup chips, since nothing about a
 * bought account depends on the reader's BIOS.
 */
export async function relatedGuidesForAccount(categorySlug: string): Promise<RelatedGuides> {
  const articles = await wikiRows();
  return assemble(
    {
      categorySlug,
      productArticles: [],
      articles,
      gameGuides: { [categorySlug]: ACCOUNT_GUIDES },
      generalGuides: ACCOUNT_GENERAL_GUIDES,
    },
    ACCOUNT_GAME_NAME,
    false,
  );
}
