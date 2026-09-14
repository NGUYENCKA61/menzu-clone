import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { LoginForm } from "@/components/sites/menzu-lol-f7ae197a/shared/LoginForm";
import { safeNext } from "@/lib/safeNext";

const REASONS: [string, string][] = [
  ["/feedback/submit", "Đăng nhập để viết đánh giá"],
  ["/wallet", "Đăng nhập để nạp tiền vào ví"],
  ["/vong-quay", "Đăng nhập để quay thưởng"],
  ["/orders", "Đăng nhập để xem lịch sử mua"],
  ["/transactions", "Đăng nhập để xem lịch sử giao dịch"],
  ["/profile", "Đăng nhập để mở hồ sơ"],
  ["/security", "Đăng nhập để vào mục bảo mật"],
  ["/affiliate", "Đăng nhập để xem hoa hồng giới thiệu"],
  ["/cart", "Đăng nhập để thanh toán giỏ hàng"],
  ["/thong-bao", "Đăng nhập để nhận thông báo trạng thái"],
];

/** The interrupted errand, when the return address names one. */
function reasonFor(next: string): string | undefined {
  // A product page carries ?pkg= or ?sl= only when the buy dialog sent the
  // visitor here, so that query is the one reliable sign of a purchase.
  if (/[?&](pkg|sl)=/.test(next)) return "Đăng nhập để hoàn tất đơn hàng";
  const hit = REASONS.find(([prefix]) => next === prefix || next.startsWith(`${prefix}/`) || next.startsWith(`${prefix}?`));
  return hit?.[1];
}
import { getCurrentUser } from "@/lib/session";
import { discordOauthEnabled, googleOauthEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { turnstileEnabled } from "@/lib/turnstile";

export const metadata: Metadata = {
  // Bare, because the root layout appends the shop's name to it.
  title: "Đăng nhập",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};

/**
 * The live site keeps its header on /login — the top strip and the main bar,
 * then the "Quay lại" link and the card, then the footer. Checked against
 * https://menzu.lol/login (logged out, 2026-09-06) and the August capture in
 * docs/research; an earlier note here said the opposite and was wrong. Only
 * the floating tools rail is absent.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Asked of the database, not of the cookie: a customer whose session was
  // revoked — password changed, other devices signed out, thirty days gone —
  // still carries the cookie, and bouncing them on that alone locked them out
  // of the very page that would fix it.
  if (await getCurrentUser()) redirect("/");

  const [settings, { next: rawNext }] = await Promise.all([
    getShopSettings(),
    searchParams,
  ]);
  // Sanitised on the server so the browser never sees an unsafe target, and so
  // the "Tạo mới ngay" link can carry it on to /signup unchanged.
  const next = safeNext(rawNext);
  // One line under the heading that names what the visitor was doing when
  // the gate closed; six different doors used to lead to the same card with
  // nothing but the marketing subtitle. Keyed on the prefix of a known page
  // and left alone otherwise — a two-segment path could be a shelf as easily
  // as a product.
  const reason = reasonFor(next);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      {/* spacer reserving the fixed header's 104px */}
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <LoginForm
          // Only the public half crosses to the browser. The secret stays on
          // the server, where the token is checked; sending it here would put
          // the shop's ability to forge a pass into every page source.
          turnstileSiteKey={
            turnstileEnabled(settings) ? settings.turnstileSiteKey : null
          }
          googleEnabled={googleOauthEnabled(settings)}
          brandName={settings.brandName}
          discordEnabled={discordOauthEnabled(settings)}
          panelImages={settings.authPanelImages}
          slideEnabled={settings.authSlideEnabled}
          slideSeconds={settings.authSlideSeconds}
          panelSubtitle={settings.authPanelSubtitle}
          panelTitle={settings.authLoginTitle}
          next={next}
          reason={reason}
        />
        <SiteFooter />
      </main>
    </div>
  );
}
