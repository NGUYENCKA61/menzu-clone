import type { Metadata } from "next";

import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { ResetPasswordForm } from "@/components/sites/menzu-lol-f7ae197a/shared/ResetPasswordForm";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

/**
 * Where the reset email's link lands. The token is read here, once, on the
 * server, and handed to the form; the form itself never touches the URL.
 *
 * A missing token draws the explanation instead of a form that could only
 * fail — people do arrive here by typing the path or from a mangled link.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-[440px] rounded-[2rem] border border-white/10 bg-neutral-900/80 p-8 sm:p-10 shadow-2xl animate-[slideUpFade_0.5s_ease-out]">
            <h1 className="text-3xl font-black uppercase tracking-wide text-white">
              Đặt lại mật khẩu
            </h1>

            {token ? (
              <>
                <p className="mt-2 mb-8 text-sm font-medium text-neutral-400">
                  Chọn mật khẩu mới cho tài khoản của bạn
                </p>
                <ResetPasswordForm token={token} />
              </>
            ) : (
              <>
                <p className="mt-2 mb-8 text-sm font-medium text-neutral-400">
                  Đường dẫn không đầy đủ. Hãy mở đúng liên kết trong email đặt
                  lại mật khẩu — hoặc yêu cầu một liên kết mới.
                </p>
                <a
                  href="/forgot-password"
                  className="flex w-full items-center justify-center rounded-2xl bg-[var(--menzu-accent)] py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
                >
                  Yêu cầu liên kết mới
                </a>
              </>
            )}
          </div>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
