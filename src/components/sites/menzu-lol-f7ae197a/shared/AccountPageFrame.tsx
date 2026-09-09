import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/session";
import { AccountShell } from "./AccountShell";

interface AccountPageFrameProps {
  title: string;
  subtitle: string;
  crumb: string;
  /** Optional control rendered to the right of the title, header-level. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * The shell every signed-in account screen renders through: breadcrumb,
 * sidebar and title around the page's own content.
 *
 * The header, footer and rails used to be drawn here too. They moved to the
 * (account) layout so they survive a click from one account page to the next
 * and the page below them can show its skeleton at once; this now only reads
 * who is signed in — on the server, because AccountSidebar is a client
 * component and a role sent to the browser could be edited to reveal the
 * admin row — and hands the shell what it needs.
 */
export async function AccountPageFrame({
  title,
  subtitle,
  crumb,
  action,
  children,
}: AccountPageFrameProps) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <AccountShell
      title={title}
      subtitle={subtitle}
      crumb={crumb}
      isAdmin={isAdmin}
      action={action}
      user={
        user
          ? {
              username: user.username,
              avatarUrl: user.avatarUrl,
              role: user.role,
            }
          : null
      }
    >
      {children}
    </AccountShell>
  );
}
