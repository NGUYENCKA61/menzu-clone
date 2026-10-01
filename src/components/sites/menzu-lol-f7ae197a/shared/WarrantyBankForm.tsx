"use client";

import { Landmark, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { normaliseAccount, normaliseHolder, readBankDetails, REFUND_BANKS } from "@/lib/bankRefund";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--menzu-accent)]/60";
const LABEL = "mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500";

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
  const [accountHolder, setAccountHolder] = useState(submitted?.accountHolder ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
      >
        <Landmark className="h-3.5 w-3.5" />
        Sửa số tài khoản
      </button>
    );
  }

  const both = normaliseAccount(bankAccount) && normaliseAccount(bankAccountConfirm);
  const mismatch = Boolean(both) && normaliseAccount(bankAccount) !== normaliseAccount(bankAccountConfirm);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const check = readBankDetails({ bankName, bankAccount, bankAccountConfirm, accountHolder });
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
        body: JSON.stringify({ id: ticketId, bankName, bankAccount, bankAccountConfirm, accountHolder }),
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

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div>
        <label htmlFor={`bank-${ticketId}`} className={LABEL}>
          Ngân hàng
        </label>
        <select
          id={`bank-${ticketId}`}
          value={bankName}
          onChange={(event) => setBankName(event.target.value)}
          className={FIELD}
        >
          <option value="">Chọn ngân hàng của bạn</option>
          {REFUND_BANKS.map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`account-${ticketId}`} className={LABEL}>
            Số tài khoản
          </label>
          <input
            id={`account-${ticketId}`}
            inputMode="numeric"
            autoComplete="off"
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
            placeholder="Ví dụ: 0123456789"
            className={`${FIELD} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor={`confirm-${ticketId}`} className={LABEL}>
            Nhập lại số tài khoản
          </label>
          <input
            id={`confirm-${ticketId}`}
            inputMode="numeric"
            autoComplete="off"
            value={bankAccountConfirm}
            onChange={(event) => setBankAccountConfirm(event.target.value)}
            onPaste={(event) => event.preventDefault()}
            placeholder="Gõ lại, không dán"
            className={`${FIELD} tabular-nums ${mismatch ? "border-rose-500/50" : ""}`}
          />
          {mismatch ? (
            <p className="mt-1.5 text-[11px] font-semibold text-rose-300">Hai số chưa khớp.</p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor={`holder-${ticketId}`} className={LABEL}>
          Tên chủ tài khoản
        </label>
        <input
          id={`holder-${ticketId}`}
          autoComplete="off"
          value={accountHolder}
          onChange={(event) => setAccountHolder(event.target.value)}
          onBlur={() => setAccountHolder(normaliseHolder(accountHolder))}
          placeholder="NGUYEN VAN A"
          className={`${FIELD} uppercase`}
        />
        <p className="mt-1.5 text-[11px] text-neutral-500">
          Như in trên thẻ ngân hàng — chữ in hoa, không dấu.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 text-xs font-bold text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Landmark className="h-4 w-4" />
          )}
          Gửi số tài khoản
        </button>
        {submitted ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex h-11 items-center rounded-xl border border-white/12 px-4 text-xs font-bold text-neutral-300 hover:text-white"
          >
            Thôi
          </button>
        ) : null}
      </div>
    </form>
  );
}
