"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BankPicker } from "@/components/sites/menzu-lol-f7ae197a/shared/BankPicker";
import {
  normaliseAccount,
  normaliseHolder,
  readBankDetails,
} from "@/lib/bankRefund";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--menzu-accent)]/60";
const LABEL =
  "mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500";

/**
 * The buyer's account for a bank refund — shown on the warranty status page
 * once the shop has turned the ticket into one (the owner, 01/10/2026:
 * "khách hàng sẽ nhập stk ngân hàng xác nhận lại stk").
 *
 * The number is typed twice, and the second box refuses a paste: copying the
 * first box into the second would only confirm a typo, and money sent to a
 * wrong account does not come back. Checked with the same rules the route
 * uses (readBankDetails), so the form cannot accept what the server refuses.
 *
 * Once sent, the page shows the account masked and this offers "Sửa" until
 * the shop transfers — a corrected account beats a refund to the wrong one.
 */
export function WarrantyBankForm({
  ticketId,
  submitted,
}: {
  ticketId: string;
  /** What was sent already, to start an edit from; null before the first. */
  submitted: { bankName: string; accountHolder: string } | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(submitted === null);
  const [bankName, setBankName] = useState(submitted?.bankName ?? "");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountConfirm, setBankAccountConfirm] = useState("");
  const [accountHolder, setAccountHolder] = useState(
    submitted?.accountHolder ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sent once, and that is that: no "Sửa" afterwards (the owner, 12/10/2026:
  // "không được sửa số tài khoản"). A wrong number is the shop's to sort
  // out in the thread before it transfers.
  if (!editing) return null;

  const both =
    normaliseAccount(bankAccount) && normaliseAccount(bankAccountConfirm);
  const mismatch =
    Boolean(both) &&
    normaliseAccount(bankAccount) !== normaliseAccount(bankAccountConfirm);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const check = readBankDetails({
      bankName,
      bankAccount,
      bankAccountConfirm,
      accountHolder,
    });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/warranty-requests/bank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: ticketId,
          bankName,
          bankAccount,
          bankAccountConfirm,
          accountHolder,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Không gửi được, bạn thử lại nhé.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  // No box of its own: it sits inside the report's card already. Two rows,
  // the bank and the number typed twice on the first, the holder and the
  // send on the second (the owner, 12/10/2026: "sửa lại cho đẹp hơn bớt
  // rối").
  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`bank-${ticketId}`} className={LABEL}>
            Ngân hàng{" "}
            <span aria-hidden className="text-[var(--menzu-accent)]">
              *
            </span>
          </label>
          <BankPicker
            id={`bank-${ticketId}`}
            value={bankName}
            onChange={setBankName}
          />
        </div>
        <div>
          <label htmlFor={`account-${ticketId}`} className={LABEL}>
            Số tài khoản{" "}
            <span aria-hidden className="text-[var(--menzu-accent)]">
              *
            </span>
          </label>
          <input
            id={`account-${ticketId}`}
            inputMode="numeric"
            autoComplete="off"
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
            placeholder="Nhập số tài khoản"
            className={`${FIELD} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor={`confirm-${ticketId}`} className={LABEL}>
            Nhập lại số tài khoản{" "}
            <span aria-hidden className="text-[var(--menzu-accent)]">
              *
            </span>
          </label>
          <input
            id={`confirm-${ticketId}`}
            inputMode="numeric"
            autoComplete="off"
            value={bankAccountConfirm}
            onChange={(event) => setBankAccountConfirm(event.target.value)}
            onPaste={(event) => event.preventDefault()}
            placeholder="Nhập lại số tài khoản"
            className={`${FIELD} tabular-nums ${mismatch ? "border-rose-500/50" : ""}`}
          />
          {mismatch ? (
            <p className="mt-1.5 text-[11px] font-semibold text-rose-300">
              Hai số chưa khớp.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <label htmlFor={`holder-${ticketId}`} className={LABEL}>
            Tên chủ tài khoản{" "}
            <span aria-hidden className="text-[var(--menzu-accent)]">
              *
            </span>
          </label>
          <input
            id={`holder-${ticketId}`}
            autoComplete="off"
            value={accountHolder}
            onChange={(event) => setAccountHolder(event.target.value)}
            onBlur={() => setAccountHolder(normaliseHolder(accountHolder))}
            placeholder="NGUYEN VAN A"
            className={`${FIELD} uppercase placeholder:normal-case`}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 text-xs font-bold text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          Gửi số tài khoản
        </button>
        {submitted ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex h-[46px] items-center rounded-xl border border-white/12 px-4 text-xs font-bold text-neutral-300 hover:text-white"
          >
            Thôi
          </button>
        ) : null}
      </div>

      <p className="text-[12px] text-neutral-500">
        Tên in hoa không dấu như trên thẻ. Kiểm tra kỹ, tiền chuyển sai số không
        lấy lại được.
      </p>

      {error ? (
        <p className="text-[13px] font-semibold text-rose-300">{error}</p>
      ) : null}
    </form>
  );
}
