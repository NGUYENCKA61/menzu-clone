import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { AccountDetailView } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountDetailView";
import { isFreeTool } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { SoftwareDetailView } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareDetailView";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { accountMetaDescription, accountMetaTitle, clampText } from "@/lib/accountSeo";
import { docHtmlToPlainText, isHtmlBody } from "@/lib/docHtml";
import { type DocsAccess } from "@/lib/docsAccess";
import { freeToolPanel } from "@/lib/freeKey";
import {
  getAccountDetail,
  getSoftwareDetail,
  listSimilarSoftware,
  resolveProduct,
} from "@/lib/queries";
import { relatedGuidesForAccount, relatedGuidesForTool } from "@/lib/relatedGuides";
import { productHref } from "@/lib/routes";
import { JsonLd, softwareJsonLd } from "@/lib/seo";
import { toolSeoCopy } from "@/lib/seoCopy";
import { getCurrentUser } from "@/lib/session";
import { isStatusSubscribed } from "@/lib/statusEvents";
import { shareCard } from "@/lib/shareCard";
import { productBehindOldSlug } from "@/lib/slugHistory";
import { softwareBuyable } from "@/lib/softwareStock";
import { toolDocsAccess } from "@/lib/toolDocs";
import { toolPageTitle } from "@/lib/toolTitle";

/**
 * The quantity a guest had set before the login gate, carried back through
 * ?sl= so they return to the same order and not an empty panel. Anything odd
 * falls back to one.
 */
function readQuantity(raw: string | undefined): number | undefined {
  const value = Number(raw);
  return Number.isInteger(value) && value > 1 && value <= 99 ? value : undefined;
}

/** What a guest gets of a tool's docs: the open parts and a sign-in cue. */
const GUEST_DOCS: DocsAccess = { state: "guest", until: null };

interface PageProps {
  params: Promise<{ categorySlug: string; productSlug: string }>;
  searchParams: Promise<{ pkg?: string; sl?: string; ban?: string }>;
}

/** Route params arrive percent-encoded; a malformed one is used as typed. */
function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * The tab and the robots tag for an address with no product behind it.
 *
 * The body answers 404, but the segment's loading.tsx has already sent a 200
 * by the time it does, so Next can only add a "noindex" of its own (see
 * streaming.md, "HTTP contract"). With a bare title the page then carried
 * that noindex beside the layout's "index, follow"; saying noindex here
 * leaves one instruction (the owner's SEO review, 13/10/2026).
 */
const NOT_FOUND_METADATA: Metadata = {
  title: "Không tìm thấy sản phẩm",
  robots: { index: false, follow: true },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Only the product half is read here. The category in the address is not
  // consulted at all: whether it is the right one is the page's business, and
  // the canonical below answers with the product's own either way.
  const { productSlug } = await params;
  const slug = decodeSegment(productSlug);
  const found = await resolveProduct({ slug });
  if (found) return productMetadata(slug, found);

  // A renamed product's old address: the page redirects to the new one, and
  // until the redirect lands (a meta refresh, for the same streaming reason)
  // the document carries the product's real title and its canonical, not
  // "Không tìm thấy".
  const moved = await productBehindOldSlug(slug);
  const target = moved ? await resolveProduct({ slug: moved.slug }) : null;
  return target ? productMetadata(target.slug, target) : NOT_FOUND_METADATA;
}

async function productMetadata(
  slug: string,
  found: NonNullable<Awaited<ReturnType<typeof resolveProduct>>>,
): Promise<Metadata> {
  // The canonical is always the product's own category, never the one in the
  // address bar: a category may stand on several home-page groups, and a
  // product must not gain an address per shelf it is displayed on.
  const canonical = productHref(found.categorySlug, found.slug);

  if (found.isSoftware) {
    const software = await getSoftwareDetail(slug);
    if (!software) return NOT_FOUND_METADATA;

    // The cheapest tier is the honest headline: it is what the buyer can
    // enter at, and quoting the lifetime price in a search result would read
    // as the price of the thing itself.
    const from = software.packages.reduce(
      (min, p) => (min === null || p.price < min ? p.price : min),
      null as number | null,
    );
    // The shop's "Mô tả ngắn" first, or the written one from content/seo
    // while the shop has not typed any (lib/seoCopy.ts): a sentence written
    // to stand alone is what a search result wants. Failing both, the long
    // description — which is HTML from the rich editor, so search results
    // get its prose, not its tags — and never more than a snippet of it.
    const summary = software.summary || toolSeoCopy(software.slug)?.summary || "";
    const plainDescription = isHtmlBody(software.description)
      ? docHtmlToPlainText(software.description)
      : software.description;
    const description = clampText(
      summary ||
        plainDescription ||
        `${software.name}: phần mềm hỗ trợ gaming, giao key tự động, bảo hành trong suốt thời gian sử dụng.`,
      155,
    );

    return {
      // The name as typed runs to 158 characters on one tool, so the tab and
      // the search result get it tidied and cut at a word (lib/toolTitle.ts;
      // the SEO review, round 2, T1); the h1 keeps the typed name. A free
      // tool's tiers carry a 1đ placeholder, and "Từ 1đ" over a page that
      // says "Miễn phí" twice read as a typo (the owner's SEO review,
      // 13/10/2026).
      title: toolPageTitle(
        software.name,
        isFreeTool(software.packages)
          ? "Miễn phí"
          : from === null
            ? null
            : `Từ ${formatVnd(from)}đ`,
      ),
      description,
      alternates: { canonical },
      // The card carries the bare name: the price-from suffix belongs in a
      // search result, not on a picture shared into a chat.
      ...(await shareCard({ url: canonical, title: software.name, image: software.images[0] })),
    };
  }

  const account = await getAccountDetail(slug);
  if (!account) return NOT_FOUND_METADATA;

  // The listing's own name leads, then its code once and the price, which
  // stays because it is the strongest click signal on a shop listing. The
  // description is the shop's write-up, or else only the figures that have a
  // value for this game: it printed "Mã ACC77 - ACC#77" and "rank , 0 skin
  // súng, 0 agent, level 0" on LoL and CFVN accounts (the owner's SEO review,
  // 13/10/2026; lib/accountSeo.ts).
  const title = accountMetaTitle(account);
  const description = accountMetaDescription(account);
  const image =
    account.imageUrl ??
    `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/${account.code}.webp`;

  return {
    title,
    description,
    alternates: { canonical },
    ...(await shareCard({
      url: canonical,
      image: { url: image, alt: `Kho đồ tài khoản ${account.code}` },
    })),
  };
}

/**
 * One product, at its one address.
 *
 * The three tiers of the shop are group → category → product, but only the
 * last two are addresses: a category can be shown under several groups, so a
 * group in the URL would multiply a product's addresses by the number of
 * shelves it happens to stand on. What the segments mean here is therefore
 * category and product, and nothing else.
 *
 * The category segment is checked rather than trusted. It is real information
 * — it is what makes the URL readable — but the product's own category is the
 * authority, so a link written before the product moved is answered with a
 * permanent redirect to where it lives now instead of a 404 or, worse, the
 * same page served under two addresses.
 */
export default async function ProductPage({ params, searchParams }: PageProps) {
  const { categorySlug, productSlug } = await params;
  const slug = decodeSegment(productSlug);
  const category = decodeSegment(categorySlug);

  const found = await resolveProduct({ slug });
  if (!found) {
    // No product answers on this slug now; one may have before it was
    // renamed. Its old address redirects, permanently, to its current one,
    // so a link posted before the rename keeps working.
    const moved = await productBehindOldSlug(slug);
    if (moved) permanentRedirect(productHref(moved.categorySlug, moved.slug));
    notFound();
  }
  if (found.categorySlug !== category) {
    permanentRedirect(productHref(found.categorySlug, found.slug));
  }

  if (found.isSoftware) {
    const software = await getSoftwareDetail(slug);
    if (!software) notFound();
    const { pkg, sl, ban } = await searchParams;
    // LAB: ?ban=cu shows the pill, "Hướng dẫn liên quan" and the similar row
    // as they were before 19/10/2026 ("chi tiết sản phẩm luôn"). A production
    // build always shows the new.
    const old = process.env.NODE_ENV !== "production" && ban === "cu";

    // The setup guide is for a buyer with the tool in hand, so the page
    // decides here, on the server, who is one: the text is dropped from what
    // the view receives rather than hidden by it, and the HTML a browser gets
    // never carries a guide its reader has not paid for.
    const user = await getCurrentUser();
    const [[docsAccess, statusSubscribed], similar, guides] = await Promise.all([
      user
        ? Promise.all([
            toolDocsAccess({ id: user.id, role: user.role }, software.code),
            isStatusSubscribed(user.id, software.code),
          ])
        : Promise.resolve([GUEST_DOCS, null] as const),
      // Twelve, so that nine remain once free tools are set aside below:
      // three show at once on a desktop, the arrows bring in the rest.
      listSimilarSoftware(software.code, software.categorySlug, 12),
      // "Hướng dẫn liên quan" inside the description: the tool's own docs,
      // the shelf's articles and the setup pages (lib/relatedGuides.ts).
      relatedGuidesForTool({ id: found.id, categorySlug: software.categorySlug }),
    ]);
    // A free tool is not offered beside a paid one: its page is its own
    // thing (FreeKeyPanel). Beside another free tool it stays.
    const similarShown = (
      isFreeTool(software.packages) ? similar : similar.filter((s) => !isFreeTool(s.packages))
    ).slice(0, 9);
    // The shop's own admins read it too: they wrote it, and checking a guide —
    // the video in it above all — should not take buying a key from their own
    // shop. The role comes from the database row, not the cookie.
    // Open for as long as the key says (lib/docsAccess.ts): a day key two
    // days, a week key a week, a month key a month, a new key a new window.
    const setupGuideAccess = !user
      ? "guest"
      : docsAccess.state === "open"
        ? "unlocked"
        : docsAccess.state === "expired"
          ? "expired"
          : "locked";
    // The line under the title and the card's two lines: the shop's "Mô tả
    // ngắn", or the written one from content/seo while the shop has not
    // typed any (lib/seoCopy.ts; the SEO review, round 2, O8).
    const summaryShown = software.summary || toolSeoCopy(software.slug)?.summary || "";
    const shown = {
      ...(setupGuideAccess === "unlocked" ? software : { ...software, setupGuideHtml: "" }),
      summary: summaryShown,
    };

    // A free tool's page hands out a key instead of selling tiers (the owner,
    // 12/10/2026). Whether a shortlink stands in the way, where the tool
    // downloads from and whether this reader took today's key already are
    // the server's to know; the panel only draws what it is told.
    const href = productHref(software.categorySlug, software.slug);
    const freeTool = isFreeTool(software.packages);
    const free = freeTool
      ? await freeToolPanel(software.code, href, user?.id ?? null)
      : null;
    // What a crawler reads instead of the prose: the tool, its shelf and the
    // price it starts at. It says what the page says (the owner's SEO review,
    // 13/10/2026): out of stock while sales are locked or no tier is set up,
    // the same rule as the buy panel's stock line; price 0 for a free tool;
    // and no block at all for a tool with no priced tier, which is not on
    // sale and would otherwise read as free.
    const productLd = softwareJsonLd({
      code: software.code,
      name: software.name,
      // Plain text either way: an empty editor body is "<p></p>", which
      // is truthy and would otherwise reach the crawler as markup.
      description:
        summaryShown ||
        (isHtmlBody(software.description)
          ? docHtmlToPlainText(software.description, 300)
          : software.description) ||
        `${software.name} - ${software.categoryName}`,
      imageUrl: software.images[0] ?? "",
      categoryName: software.categoryName,
      href,
      available: softwareBuyable(software),
      prices: software.packages.map((p) => p.price),
      free: freeTool,
    });
    return (
      <>
        {productLd ? <JsonLd data={productLd} /> : null}
        {/* The breadcrumb list is the view's own — emitting a second one here
            would tell a crawler the page has two different trails. */}
        <SoftwareDetailView
          software={shown}
          initialPackageId={pkg}
          initialQuantity={readQuantity(sl)}
          setupGuideAccess={setupGuideAccess}
          statusSubscribed={statusSubscribed}
          similar={similarShown}
          guides={guides}
          free={free}
          viewer={
            !user ? "guest" : user.verifiedAt || user.role === "ADMIN" ? "verified" : "member"
          }
          old={old}
        />
      </>
    );
  }

  // The account view emits its own Product and BreadcrumbList — accounts had
  // structured data from the start; it was only the tools that had none.
  const account = await getAccountDetail(slug);
  if (!account) notFound();
  const { sl } = await searchParams;
  // Who is looking, for an account sold to level 2 only; and the NFA guides
  // under the panel (lib/relatedGuides.ts).
  const [user, guides] = await Promise.all([
    getCurrentUser(),
    relatedGuidesForAccount(account.categorySlug),
  ]);
  return (
    <AccountDetailView
      account={account}
      initialQuantity={readQuantity(sl)}
      guides={guides}
      viewer={
        !user ? "guest" : user.verifiedAt || user.role === "ADMIN" ? "verified" : "member"
      }
    />
  );
}
