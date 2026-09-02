import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { RegisterForm } from "@/components/sites/menzu-lol-f7ae197a/shared/RegisterForm";
import { safeNext } from "@/lib/safeNext";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { turnstileEnabled } from "@/lib/turnstile";

export const metadata: Metadata = {
  // Bare, because the root layout appends the shop's name to it.
  title: "Đăng ký",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; next?: string }>;
}) {
  // The live check, for the same reason /login makes it: a dead cookie must
  // not stand between a customer and the form.
  if (await getCurrentUser()) redirect("/");

  const [settings, { ref, next: rawNext }] = await Promise.all([
    getShopSettings(),
    searchParams,
  ]);
  // Sanitised here so the form returns the new customer to the product they
  // were buying rather than always to /profile. "/" means they came on their own.
  const next = safeNext(rawNext);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      <main className="flex-1 relative z-20 w-full flex flex-col">
        <RegisterForm
          // Public half only. The secret stays server-side, where the token is
          // checked.
          turnstileSiteKey={
            turnstileEnabled(settings) ? settings.turnstileSiteKey : null
          }
          panelImages={settings.authPanelImages}
          slideEnabled={settings.authSlideEnabled}
          slideSeconds={settings.authSlideSeconds}
          panelSubtitle={settings.authPanelSubtitle}
          panelTitle={settings.authSignupTitle}
          refCode={ref ?? null}
          next={next}
        />
        <SiteFooter />
      </main>
    </div>
  );
}
