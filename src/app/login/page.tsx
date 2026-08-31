import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { LoginForm } from "@/components/sites/menzu-lol-f7ae197a/shared/LoginForm";
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
 * The live site has no header and no tools rail on /login — just the card and
 * the footer. Verified against https://menzu.lol/login while logged out.
 */
export default async function LoginPage() {
  // Asked of the database, not of the cookie: a customer whose session was
  // revoked — password changed, other devices signed out, thirty days gone —
  // still carries the cookie, and bouncing them on that alone locked them out
  // of the very page that would fix it.
  if (await getCurrentUser()) redirect("/");

  const settings = await getShopSettings();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      <main className="flex-1 relative z-20 w-full flex flex-col">
        <LoginForm
          // Only the public half crosses to the browser. The secret stays on
          // the server, where the token is checked; sending it here would put
          // the shop's ability to forge a pass into every page source.
          turnstileSiteKey={
            turnstileEnabled(settings) ? settings.turnstileSiteKey : null
          }
          googleEnabled={googleOauthEnabled(settings)}
          discordEnabled={discordOauthEnabled(settings)}
          panelImages={settings.authPanelImages}
          slideEnabled={settings.authSlideEnabled}
          slideSeconds={settings.authSlideSeconds}
          panelSubtitle={settings.authPanelSubtitle}
          panelTitle={settings.authLoginTitle}
        />
        <SiteFooter />
      </main>
    </div>
  );
}
