import type { Metadata } from "next";

import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { LoginForm } from "@/components/sites/menzu-lol-f7ae197a/shared/LoginForm";
import { getShopSettings } from "@/lib/settingsStore";
import { turnstileEnabled } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Menzu Valorant | Đăng nhập",
};

/**
 * The live site has no header and no tools rail on /login — just the card and
 * the footer. Verified against https://menzu.lol/login while logged out.
 */
export default async function LoginPage() {
  const settings = await getShopSettings();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
      <main className="flex-1 relative z-20 w-full flex flex-col">
        <LoginForm
          // Only the public half crosses to the browser. The secret stays on
          // the server, where the token is checked; sending it here would put
          // the shop's ability to forge a pass into every page source.
          turnstileSiteKey={
            turnstileEnabled(settings) ? settings.turnstileSiteKey : null
          }
        />
        <SiteFooter />
      </main>
    </div>
  );
}
