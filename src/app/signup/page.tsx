import type { Metadata } from "next";

import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { RegisterForm } from "@/components/sites/menzu-lol-f7ae197a/shared/RegisterForm";
import { getShopSettings } from "@/lib/settingsStore";
import { turnstileEnabled } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Menzu Valorant | Đăng ký",
};

export default async function RegisterPage() {
  const settings = await getShopSettings();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
      <main className="flex-1 relative z-20 w-full flex flex-col">
        <RegisterForm
          // Public half only. The secret stays server-side, where the token is
          // checked.
          turnstileSiteKey={
            turnstileEnabled(settings) ? settings.turnstileSiteKey : null
          }
        />
        <SiteFooter />
      </main>
    </div>
  );
}
