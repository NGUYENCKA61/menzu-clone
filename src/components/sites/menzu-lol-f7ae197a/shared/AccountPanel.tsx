import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AccountPanelProps {
  /** The page's own mark from the sidebar, in the accent. */
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Optional control to the right of the title. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * menzu's account panel, as /wallet, /transactions and /orders draw it inline:
 * the #111 plate with the title and its subtitle inside, measured off
 * menzu.lol/profile. The pages that keep this shop's own layout (Tổng quan,
 * Bảo mật, Cộng tác viên, Nâng cấp đại lý) sit in it so the account area reads
 * as one set.
 *
 * Under sm the plate goes, as on menzu.lol/security: these pages carry cards
 * of their own, and another 16px each side cut the overview's tier figures
 * down to "Giảm …" on a 390px phone.
 */
export function AccountPanel({ icon: Icon, title, subtitle, action, children }: AccountPanelProps) {
  return (
    <div className="w-full bg-transparent sm:bg-[#111111] border-0 sm:border sm:border-white/5 rounded-none sm:rounded-[24px] p-0 sm:p-8 lg:p-10 relative min-h-0 sm:min-h-[750px]">
      {/* The head as the owner drew it (16/10/2026, "thiết kế lại bố cục như
          này thử"): the page's mark in a tinted square, the title and its
          line beside it, a hairline under the pair. */}
      <div className="relative z-10 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5 sm:mb-8 sm:pb-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)] sm:h-11 sm:w-11"
            aria-hidden
          >
            <Icon size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black uppercase tracking-wider text-white sm:text-2xl">{title}</h1>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400 sm:text-sm">{subtitle}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
