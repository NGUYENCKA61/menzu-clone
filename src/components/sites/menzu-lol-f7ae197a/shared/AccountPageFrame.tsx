import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { getCurrentUser } from "@/lib/session";
import { AccountShell } from "./AccountShell";

interface AccountPageFrameProps {
  title: string;
  subtitle: string;
  crumb: string;
  children: ReactNode;
}

/**
 * Chrome shared by every route in the authenticated account area
 * (/profile, /wallet, /transactions, /orders, /service-orders, /security).
 * The six of them are separate routes on the live site, not tabs.
 */
export async function AccountPageFrame({
  title,
  subtitle,
  crumb,
  children,
}: AccountPageFrameProps) {
  // Read here rather than in AccountSidebar: that is a client component, and
  // trusting a role sent to the browser would let anyone reveal the group.
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <PageBackdrop />
          <AccountShell title={title} subtitle={subtitle} crumb={crumb} isAdmin={isAdmin}>
            {children}
          </AccountShell>
        </div>
        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}
