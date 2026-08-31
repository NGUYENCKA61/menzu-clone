import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { BioCard } from "@/components/sites/menzu-lol-f7ae197a/shared/BioCard";
import { getBioProfile } from "@/lib/queries";

const BACKDROP =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/behance/e4307d166239615.6418bdb0084a4.webp";

export const metadata: Metadata = {
  title: "Thông tin liên hệ",
  description: "Các kênh liên hệ và cộng đồng chính thức của THICHTHIHACK.",
  alternates: { canonical: "/bio" },
};

/**
 * Standalone contact card — no site header, footer or rails, matching the
 * live page. It is meant to be the destination of a link in a social bio,
 * where the surrounding shop chrome would only get in the way.
 */
export default async function BioPage() {
  const profile = await getBioProfile();
  if (!profile) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.06] scale-105">
          <Image src={BACKDROP} alt="" fill sizes="100vw" className="object-cover object-center" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] rounded-full bg-[var(--menzu-accent)]/5 blur-[140px]" />
      </div>

      <BioCard
        name={profile.name}
        tagline={profile.tagline}
        avatarUrl={profile.avatarUrl}
        links={profile.links.map((link) => ({
          id: link.id,
          label: link.label,
          sublabel: link.sublabel,
          url: link.url,
          iconUrl: link.iconUrl,
          page: link.page,
        }))}
      />
    </div>
  );
}
