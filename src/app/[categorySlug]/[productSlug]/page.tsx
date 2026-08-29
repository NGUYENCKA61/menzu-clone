import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { AccountDetailView } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountDetailView";
import { SoftwareDetailView } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareDetailView";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { docHtmlToPlainText, isHtmlBody } from "@/lib/docHtml";
import { getAccountDetail, getSoftwareDetail, resolveProduct } from "@/lib/queries";
import { productHref } from "@/lib/routes";

interface PageProps {
  params: Promise<{ categorySlug: string; productSlug: string }>;
  searchParams: Promise<{ pkg?: string }>;
}

/** Route params arrive percent-encoded; a malformed one is used as typed. */
function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Only the product half is read here. The category in the address is not
  // consulted at all: whether it is the right one is the page's business, and
  // the canonical below answers with the product's own either way.
  const { productSlug } = await params;
  const slug = decodeSegment(productSlug);
  const found = await resolveProduct({ slug });
  if (!found) return { title: "Không tìm thấy sản phẩm" };

  // The canonical is always the product's own category, never the one in the
  // address bar: a category may stand on several home-page groups, and a
  // product must not gain an address per shelf it is displayed on.
  const canonical = productHref(found.categorySlug, found.slug);

  if (found.isSoftware) {
    const software = await getSoftwareDetail(slug);
    if (!software) return { title: "Không tìm thấy sản phẩm" };

    // The cheapest tier is the honest headline: it is what the buyer can
    // enter at, and quoting the lifetime price in a search result would read
    // as the price of the thing itself.
    const from = software.packages.reduce(
      (min, p) => (min === null || p.price < min ? p.price : min),
      null as number | null,
    );
    // A rich-editor description is HTML — search results get its prose, not
    // its tags, and never more than a sentence or two of it.
    const description = isHtmlBody(software.description)
      ? docHtmlToPlainText(software.description, 160)
      : software.description;

    return {
      title: from === null ? software.name : `${software.name} — Từ ${formatVnd(from)}đ`,
      description:
        description ||
        `${software.name} — phần mềm hỗ trợ gaming, giao key tự động, bảo hành trong suốt thời gian sử dụng.`,
      alternates: { canonical },
      openGraph: {
        title: software.name,
        description,
        url: canonical,
        images: software.images.slice(0, 1),
      },
    };
  }

  const account = await getAccountDetail(slug);
  if (!account) return { title: "Không tìm thấy sản phẩm" };

  // The live site puts the price in the <title>; kept as-is because it is the
  // single strongest click signal on a shop listing in search results.
  const title = `Mã ${account.code} - ${account.code.replace(/^([A-Z]+)/, "$1#")} | Giá bán: ${formatVnd(
    account.price,
  )}đ`;
  const description =
    `Account ${account.categoryName} mã ${account.code} — rank ${account.rank}, ` +
    `${account.weaponSkins} skin súng, ${account.agents} agent, level ${account.level}. ` +
    `Giá ${formatVnd(account.price)}đ. Bàn giao ngay sau khi thanh toán.`;
  const image =
    account.imageUrl ??
    `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/${account.code}.webp`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: [{ url: image, alt: `Kho đồ tài khoản ${account.code}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
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
  if (!found) notFound();
  if (found.categorySlug !== category) {
    permanentRedirect(productHref(found.categorySlug, found.slug));
  }

  if (found.isSoftware) {
    const software = await getSoftwareDetail(slug);
    if (!software) notFound();
    const { pkg } = await searchParams;
    return <SoftwareDetailView software={software} initialPackageId={pkg} />;
  }

  const account = await getAccountDetail(slug);
  if (!account) notFound();
  return <AccountDetailView account={account} />;
}
