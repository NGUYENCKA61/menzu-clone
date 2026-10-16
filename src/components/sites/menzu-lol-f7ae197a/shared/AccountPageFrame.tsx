import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/session";
import { AccountShell } from "./AccountShell";
import type { Crumb } from "./Breadcrumb";

interface AccountPageFrameProps {
  /** Left out by a page that draws its own title inside its panel. */
  title?: string;
  subtitle?: ReactNode;
  crumb: string;
  /** Linked steps between "Trang chủ" and `crumb`. */
  trail?: Crumb[];
  /** Optional control rendered to the right of the title, header-level. */
  action?: ReactNode;
  /** Off for a page with one job, which then loses the nav column. */
  sidebar?: boolean;
  /** A red glyph in front of the title, as the public pages wear one. */
  icon?: LucideIcon;
  /** "home": the ground the wiki and Liên hệ sit on. */
  ground?: "black" | "home";
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
  trail,
  action,
  sidebar = true,
  icon,
  ground = "black",
  children,
}: AccountPageFrameProps) {
  const user = await getCurrentUser();

  return (
    <AccountShell
      title={title}
      subtitle={subtitle}
      crumb={crumb}
      trail={trail}
      action={action}
      sidebar={sidebar}
      icon={icon}
      ground={ground}
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
