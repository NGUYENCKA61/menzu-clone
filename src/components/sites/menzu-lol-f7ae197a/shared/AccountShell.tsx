import { AccountSidebar } from "./AccountSidebar";
import { Breadcrumb } from "./Breadcrumb";

export interface AccountShellProps {
  title: string;
  subtitle: string;
  crumb: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}

/**
 * Shared page frame for the authenticated account area. Every /profile,
 * /wallet, /transactions, /orders, /service-orders, and /security route
 * renders through this shell: breadcrumb trail, sidebar nav (desktop only),
 * and a title/subtitle header ahead of the page's own content.
 */
export function AccountShell({ title, subtitle, crumb, isAdmin = false, children }: AccountShellProps) {
  return (
    <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-8 flex flex-col min-h-screen">
      <div className="mb-6">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: crumb }]} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <AccountSidebar isAdmin={isAdmin} />

        <div className="flex-1 w-full min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
              {title}
            </h1>
            <p className="text-sm text-neutral-400 mt-1.5">{subtitle}</p>
          </div>

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
        <a
          href={ctaHref}
          className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}
