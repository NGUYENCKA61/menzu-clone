import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { AccountSidebar, type SidebarUser } from "./AccountSidebar";
import { LinkPending } from "./LinkPending";
import { Breadcrumb } from "./Breadcrumb";

export interface AccountShellProps {
  /** Left out by a page that draws its own title inside its panel, as
   *  menzu's /wallet does. */
  title?: string;
  subtitle?: string;
  crumb: string;
  isAdmin?: boolean;
  user?: SidebarUser | null;
  /** Optional control rendered to the right of the title, header-level. */
  action?: React.ReactNode;
  /** Off for a page the buyer came to do one thing on: the nav column goes
   *  and the page is set like the public ones (Liên hệ, Đánh giá, Wiki) —
   *  same column, same air, a red bar at the title and a rule under it (the
   *  owner, 10/10/2026, about the warranty page). */
  sidebar?: boolean;
  /** A red glyph in front of the title, as the public pages wear one, in
   *  place of the red bar. Only read when `sidebar` is off. */
  icon?: LucideIcon;
  children: React.ReactNode;
}

/**
 * Shared page frame for the authenticated account area. Every /profile,
 * /wallet, /transactions, /orders, /service-orders, and /security route
 * renders through this shell: breadcrumb trail, sidebar nav (desktop only),
 * and a title/subtitle header ahead of the page's own content.
 */
export function AccountShell({
  title,
  subtitle,
  crumb,
  isAdmin = false,
  user = null,
  action = null,
  sidebar = true,
  icon: Icon,
  children,
}: AccountShellProps) {
  // flex-1, not min-h-screen: the header sits above this and the footer
  // below, so a whole screen of its own left a short page (the profile, a
  // warranty form) with hundreds of pixels of nothing before the footer
  // (the owner, 10/10/2026, reviewing the warranty page).
  return (
    <div
      className={`w-full max-w-[1320px] mx-auto px-4 lg:px-6 flex flex-1 flex-col ${
        sidebar ? "py-8" : "py-12"
      }`}
    >
      {/* The box keeps the 24px, as on menzu; the pill's own margin used to
          ride inside it and doubled the gap on every account page. A page
          without the nav column lets the trail keep its own margin, as the
          public pages do. */}
      {sidebar ? (
        <div className="mb-6">
          <Breadcrumb margin="mb-0" items={[{ label: "Trang chủ", href: "/" }, { label: crumb }]} />
        </div>
      ) : (
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: crumb }]} />
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {sidebar ? <AccountSidebar isAdmin={isAdmin} user={user} /> : null}

        <div className="flex-1 w-full min-w-0">
          {title ? (
            sidebar ? (
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                    {title}
                  </h1>
                  <p className="text-sm text-neutral-400 mt-1.5">{subtitle}</p>
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
              </div>
            ) : (
              // The public pages' opening: the red mark, the title, a rule
              // under the row.
              <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {/* The page's own glyph where the public pages put
                        theirs, the red bar only when none is given (the
                        owner, 10/10/2026: "icon cờ lê thay cho dấu gạch"). */}
                    {Icon ? (
                      <Icon size={28} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
                    ) : (
                      <span
                        aria-hidden
                        className="h-6 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]"
                      />
                    )}
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                      {title}
                    </h1>
                  </div>
                  {subtitle ? (
                    <p className="mt-3 text-sm text-neutral-400">{subtitle}</p>
                  ) : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
              </div>
            )
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}

export interface AccountEmptyProps {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * Shared empty state for account pages with no data yet (transactions,
 * orders, service orders). The CTA link only renders when both a label and
 * an href are supplied.
 */
export function AccountEmpty({ title, body, ctaLabel, ctaHref }: AccountEmptyProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
      <p className="text-xl font-bold text-white mb-2">{title}</p>
      <p className="text-neutral-400">{body}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="relative mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          {ctaLabel}
          <LinkPending />
        </Link>
      )}
    </div>
  );
}
