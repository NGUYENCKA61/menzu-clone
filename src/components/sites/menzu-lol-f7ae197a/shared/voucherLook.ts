/**
 * How a voucher box looks — one look for the basket's summary and the
 * product page's buy dialogs (the owner, 01/10/2026: the box was "tối hù",
 * make it red and brighter, "làm sao đồng bộ là dc").
 *
 * Before a code is typed the button is outlined in the accent rather than
 * faded out, so it reads as a button and not as something broken; with a
 * code typed it is solid, the one thing to press; once the code is applied it
 * steps back to the outline, so the checkout button stays the only solid
 * red in sight.
 */

export const VOUCHER_LABEL =
  "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-300";

export const VOUCHER_ICON = "h-3.5 w-3.5 shrink-0 text-[var(--menzu-accent)]";

/** "Đã áp dụng mã" under the box, green like the discount's own row below,
 *  which carries the amount (the owner, 01/10/2026: "thành đã áp dụng như
 *  bạn nói"). It was red, and read like the box's error line. */
export const VOUCHER_APPLIED = "mt-2 text-[11px] font-semibold text-emerald-400";

/** `typed`: a code is in the box — its edge takes the accent. */
export function voucherInputClass(typed: boolean): string {
  return `h-10 min-w-0 flex-1 rounded-xl border bg-white/[0.06] px-3 font-mono text-[13px] font-bold uppercase tracking-wider text-white outline-none transition-colors placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400 focus:border-[var(--menzu-accent)]/60 ${
    typed ? "border-[var(--menzu-accent)]/60" : "border-white/15"
  }`;
}

/** `solid`: a code is typed and not yet applied — press me. */
export function voucherButtonClass(solid: boolean): string {
  return `h-10 shrink-0 rounded-xl border px-4 text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed ${
    solid
      ? "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]"
      : "border-[var(--menzu-accent)]/45 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)] hover:bg-[var(--menzu-accent)]/20"
  }`;
}

/** The basket's apply button, calmer than the dialogs' one (the owner,
 *  01/10/2026: "không nên chuyển đỏ đặc", on trial): grey while there is
 *  nothing to apply — an empty box, or a code already applied — and the
 *  light red of a live control once a fresh code is typed. The panel's one
 *  solid red stays the pay button. */
export function voucherApplyClass(ready: boolean): string {
  return `h-10 shrink-0 rounded-xl border px-4 text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed ${
    ready
      ? "border-[var(--menzu-accent)]/45 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)] hover:bg-[var(--menzu-accent)]/20"
      : "border-white/[0.12] bg-white/[0.04] text-neutral-400 enabled:hover:text-neutral-200"
  }`;
}
