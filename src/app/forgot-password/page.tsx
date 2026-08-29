import type { Metadata } from "next";

import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { ForgotPasswordForm } from "@/components/sites/menzu-lol-f7ae197a/shared/ForgotPasswordForm";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = { title: "Quên mật khẩu" };

/**
 * A single small card, no brand panel: this page exists for one errand and the
 * person on it is mildly stressed already.
 *
 * When the shop has no SMTP configured the form is not drawn at all — a form
 * that always ends in "we could not send" is a treadmill. The card instead
 * points at whatever contact channels Cấu hình has filled in.
 */
export default async function ForgotPasswordPage() {
  const settings = await getShopSettings();
  const canMail = mailEnabled(settings);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-[440px] rounded-[2rem] border border-white/10 bg-neutral-900/80 p-8 sm:p-10 shadow-2xl animate-[slideUpFade_0.5s_ease-out]">
            <h1 className="text-3xl font-black uppercase tracking-wide text-white">
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
              <div className="flex flex-col gap-3 text-sm text-neutral-300">
                {settings.contactZalo ? (
                  <a
                    href={settings.contactZalo}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 font-bold transition-colors hover:border-white/25 hover:bg-white/10"
                  >
                    Nhắn Zalo cho shop
                  </a>
                ) : null}
                {settings.contactFacebook ? (
                  <a
                    href={settings.contactFacebook}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 font-bold transition-colors hover:border-white/25 hover:bg-white/10"
                  >
                    Nhắn Facebook cho shop
                  </a>
                ) : null}
                <p className="text-[12px] leading-relaxed text-neutral-500">
                  Gửi kèm tên đăng nhập của bạn, admin sẽ xác minh và cấp lại mật
                  khẩu.
                </p>
                <a
                  href="/login"
                  className="mt-2 text-center text-xs font-black uppercase tracking-widest text-[var(--menzu-accent)] transition-colors hover:text-[var(--menzu-accent-dark)]"
                >
                  Về trang đăng nhập
                </a>
              </div>
            )}
          </div>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
