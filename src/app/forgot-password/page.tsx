import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle, MessageSquare } from "lucide-react";

import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ForgotPasswordForm } from "@/components/sites/menzu-lol-f7ae197a/shared/ForgotPasswordForm";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};

/**
 * LAB 2 ONLY: the form shows even with no mail server set, so its look can be
 * judged (the owner, 18/10/2026: "Quên mật khẩu bằng smtp ấy", "có k bật đi",
 * "k hoạt động cũng bật đi"). On while LAB_FORGOT_FORM=1 is in lab 2's
 * .env.local, never in a production build. Sending still fails without SMTP:
 * the endpoint answers 503 and the form toasts its sentence. ?ban=lienhe
 * shows the contact version the live site serves today instead.
 */
const LAB_FORGOT_FORM =
  process.env.LAB_FORGOT_FORM === "1" && process.env.NODE_ENV !== "production";

/** The sign-in button's bar (LoginForm), so the two cards' actions match. */
const ACTION =
  "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold transition-colors";

/**
 * A single small card, no brand panel: this page exists for one errand and the
 * person on it is mildly stressed already.
 *
 * When the shop has no SMTP configured the form is not drawn at all — a form
 * that always ends in "we could not send" is a treadmill. The card instead
 * points at whatever contact channels Cấu hình has filled in.
 *
 * LAB (the owner, 18/10/2026: "rà soát lại coi cần gì sửa cho đồng bộ
 * trang", "làm đi"): the card carries the sign-in pages' small red line over
 * its title and their 40px corners from sm; the contact doors are the FAQ's
 * (Facebook first and red, Zalo after it, each with its icon) on the
 * sign-in button's bar, the Zalo one opening zalo.me with the number's
 * digits where it used the bare number as its address, which went nowhere;
 * and "Về trang đăng nhập" is the form's grey arrow link in both versions.
 */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ ban?: string }>;
}) {
  const [settings, { ban }] = await Promise.all([getShopSettings(), searchParams]);
  const canMail = mailEnabled(settings) || (LAB_FORGOT_FORM && ban !== "lienhe");
  const zaloDigits = settings.contactZalo.replace(/\D/g, "");
  const doors = [
    settings.contactFacebook
      ? { key: "facebook", href: settings.contactFacebook, label: "Nhắn Facebook cho shop", Icon: MessageCircle }
      : null,
    zaloDigits
      ? { key: "zalo", href: `https://zalo.me/${zaloDigits}`, label: "Nhắn Zalo cho shop", Icon: MessageSquare }
      : null,
  ].filter((door) => door !== null);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      {/* LAB: no blurred cover here any more, so the site's artwork shows
          behind the card as on the main site (the owner, 18/10/2026: "giống
          3100 đi, thấy được ảnh nền phía sau"); it had been given the
          sign-in pages' near-black blur on 17/10. */}
      {/* spacer reserving the fixed header's 104px */}
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-[440px] rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 bg-neutral-900/80 p-8 sm:p-10 shadow-2xl animate-[slideUpFade_0.5s_ease-out]">
            <span className="text-[var(--menzu-accent)] font-black uppercase tracking-[0.5em] text-xs mb-2 drop-shadow-md block">
              {settings.authPanelSubtitle}
            </span>
            <h1 className="text-4xl font-black tracking-tight text-white">
              Quên mật khẩu
            </h1>
            <p className="mt-2 mb-8 text-sm font-medium text-neutral-400">
              {canMail
                ? "Nhập tài khoản, đường dẫn đặt lại sẽ được gửi vào email của bạn"
                : "Liên hệ shop để được cấp lại mật khẩu"}
            </p>

            {canMail ? (
              <ForgotPasswordForm />
            ) : (
              <div className="flex flex-col gap-3">
                {doors.map(({ key, href, label, Icon }, index) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`${ACTION} ${
                      index === 0
                        ? "bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]"
                        : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                  </a>
                ))}
                <p className="text-[12px] leading-relaxed text-neutral-500">
                  Gửi kèm tên đăng nhập của bạn, admin sẽ xác minh và cấp lại mật
                  khẩu.
                </p>
                <Link
                  href="/login"
                  className="mt-3 flex items-center justify-center gap-2 text-[14px] font-semibold text-neutral-400 transition-colors hover:text-white"
                >
                  <ArrowLeft size={14} />
                  Về trang đăng nhập
                </Link>
              </div>
            )}
          </div>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
