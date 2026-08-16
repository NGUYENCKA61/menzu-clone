import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { SoftwareBuyPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareBuyPanel";
import { ScrollCta } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ScrollCta";
import {
  DESCRIPTION_SECTION_ID,
  SoftwareDescription,
} from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareDescription";
import { SoftwareGallery } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareGallery";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getSoftwareDetail } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pkg?: string }>;
}

export async function generateMetadata({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> {
  const { code } = await params;
  const software = await getSoftwareDetail(code);
  if (!software) return { title: "Không tìm thấy phần mềm" };

  // The cheapest tier is the honest headline: it is what the buyer can enter
  // at, and quoting the lifetime price in a search result would read as the
  // price of the thing itself.
  const from = software.packages.reduce(
    (min, p) => (min === null || p.price < min ? p.price : min),
    null as number | null,
  );

  return {
    title: from === null ? software.name : `${software.name} — Từ ${formatVnd(from)}đ`,
    description:
      software.description ||
      `${software.name} — phần mềm hỗ trợ gaming, giao key tự động, bảo hành trong suốt thời gian sử dụng.`,
    alternates: { canonical: `/software/${software.code}` },
    openGraph: {
      title: software.name,
      description: software.description,
      images: software.images.slice(0, 1),
    },
  };
}

export default async function SoftwarePage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { pkg } = await searchParams;
  const software = await getSoftwareDetail(code);
  if (!software) notFound();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          { name: software.categoryName, path: `/category/${software.categorySlug}` },
          { name: software.name },
        ])}
      />
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          {/* The breadcrumb otherwise starts on the exact pixel the fixed
              header ends, with nothing between them. The gap goes on the
              container rather than on Breadcrumb itself, which is shared with
              every other page and should not gain a margin because this one
              wanted air. */}
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-8">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                {
                  label: software.categoryName,
                  href: `/category/${software.categorySlug}`,
                },
                { label: software.name },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
              <SoftwareGallery
                name={software.name}
                images={software.images}
                videoUrl={software.videoUrl}
              />
              <SoftwareBuyPanel software={software} initialPackageId={pkg} />
            </div>

            {/* The same cue the home page's hero carries, in normal flow here
                rather than pinned to a corner. */}
            <div className="mt-12 flex justify-center">
              <ScrollCta targetId={DESCRIPTION_SECTION_ID} label="Xem chi tiết" placement="" />
            </div>

            <SoftwareDescription
              name={software.name}
              description={software.description}
              packageLabels={software.packages.map((p) => p.label)}
              version={software.version}
              platform={software.platform}
            />
          </div>
        </div>
        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}
