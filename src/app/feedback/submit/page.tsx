import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { FeedbackComposer } from "@/components/sites/menzu-lol-f7ae197a/shared/FeedbackComposer";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Viết đánh giá" };
export const dynamic = "force-dynamic";

/**
 * The write-review screen. Signed-in customers only: identity and avatar come
 * from the account, which is what lets the review carry the verified badge
 * without the original's paste-a-Facebook-link dance.
 */
export default async function FeedbackSubmitPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Ffeedback%2Fsubmit");

  // Built here so the preview card's date can never disagree between the
  // server render and the browser. d/M/yyyy, as the original prints it.
  const now = new Date();
  const today = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 bg-[#050508]">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                { label: "Đánh giá khách hàng", href: "/feedback" },
                { label: "Gửi đánh giá" },
              ]}
            />

            <div className="flex items-start gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0 mt-0.5">
                <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                  Viết Đánh Giá
                </h1>
                <p className="text-neutral-500 text-xs mt-1">
                  Chia sẻ trải nghiệm của bạn để giúp chất lượng dịch vụ ngày càng hoàn thiện
                  hơn
                </p>
              </div>
            </div>

            <FeedbackComposer
              user={{ username: user.username, avatarUrl: user.avatarUrl }}
              today={today}
            />
          </div>
        </div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
