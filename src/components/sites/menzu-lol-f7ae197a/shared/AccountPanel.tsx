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
    <div className="w-full bg-transparent sm:bg-[#171920] border-0 sm:border sm:border-white/5 rounded-none sm:rounded-[24px] p-0 sm:p-8 lg:p-10 relative min-h-0 sm:min-h-[750px]">
      <div className="mb-6 sm:mb-8 relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
            <Icon size={24} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">{subtitle}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
