"use client";

import {
  Ban,
  Banknote,
  Check,
  Clock,
  CreditCard,
  Hourglass,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { Pager } from "./Pager";
import { TopUpCountdown, useTimeLeft } from "./TopUpCountdown";
import { TopUpSuccessDialog } from "./TopUpSuccessDialog";

type Method = "bank" | "card";

/**
 * Carriers whose prepaid cards the shop accepts.
 *
 * Rendered as tinted text rather than brand logos: the marks are the
 * carriers' trademarks, and a name identifies the card just as well for
 * someone holding one. Drop the SVGs in later if the shop has the rights.
 */
const CARRIERS = [
  { value: "Viettel", label: "Viettel", tint: "#EE0033" },
  { value: "Vinaphone", label: "Vinaphone", tint: "#0066B3" },
  { value: "Mobifone", label: "Mobifone", tint: "#0F4C99" },
  { value: "Garena", label: "Garena", tint: "#F04E23" },
  { value: "Zing", label: "Zing", tint: "#00A3E0" },
] as const;

export interface TopUpHistoryRow {
  code: string;
  method: string;
  carrier: string | null;
  amount: number;
  status: string;
  /** Pre-formatted on the server so the two renders cannot disagree. */
  createdAt: string;
  /** ISO deadline while the request is still waiting; null once it is not. */
  expiresAt: string | null;
  /** The description the customer was told to write — lets a pending row
   *  reopen as the full invoice after a reload. */
  transferNote: string;
}

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const TAB_ACTIVE =
  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--brand)] text-white transition-colors";
const TAB_INACTIVE =
  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

const PRESET_ACTIVE =
  "px-4 py-2 rounded-lg text-[11px] font-bold border border-[var(--brand)]/50 bg-[var(--brand)]/15 text-[#a78bfa] transition-colors whitespace-nowrap";
const PRESET_INACTIVE =
  "px-4 py-2 rounded-lg text-[11px] font-bold border border-neutral-800/60 bg-neutral-950/40 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap";

export interface WalletTopUpProps {
  history?: TopUpHistoryRow[];
  /** Smallest accepted amount, from the shop settings. */
  minAmount: number;
  /** The amount buttons, already sorted low to high by the server. */
  presets: number[];
  bankEnabled: boolean;
  cardEnabled: boolean;
  /** Every account the shop can be paid into; empty means none configured. */
  banks: BankAccount[];
  /** Whether a matched transfer credits the wallet without an admin. */
  autoEnabled: boolean;
  /**
   * Request to poll for, or null when nothing recent is unpaid. Chosen on the
   * server, where a top-up's timestamp is still a date rather than the display
   * string these history rows carry.
   */
  watch: { code: string; expiresAt: string } | null;
}

export interface BankAccount {
  code: string;
  name: string;
  account: string;
  holder: string;
}

interface Invoice {
  code: string;
  amount: number;
  transferNote: string;
  method: Method;
  /** ISO, from the server's clock rather than this browser's. */
  expiresAt: string | null;
}

/** What the success dialog needs, once a request has actually been paid. */
interface Credited {
  code: string;
  amount: number;
  balance: number;
}

/** One transfer detail with a copy button — every value here gets retyped. */
function CopyRow({
  label,
  value,
  display,
  highlight = false,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  display?: string;
  highlight?: boolean;
  onCopy: (label: string, value: string) => void;
  copied: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`truncate text-sm font-bold ${
            highlight ? "text-amber-300 font-mono" : "text-white"
          }`}
        >
          {display ?? value}
        </span>
        <button
          type="button"
          onClick={() => onCopy(label, value)}
          className="shrink-0 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors"
        >
          {copied === label ? "Đã chép" : "Chép"}
        </button>
      </div>
    </div>
  );
}

const HISTORY_STATUS: Record<
  string,
  { text: string; className: string; icon: LucideIcon; box: string }
> = {
  PENDING: {
    text: "Đang chờ",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    icon: Clock,
    box: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  },
  COMPLETED: {
    text: "Đã cộng",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: Check,
    box: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
  FAILED: {
    text: "Từ chối",
    className: "border-red-500/30 bg-red-500/10 text-red-400",
    icon: X,
    box: "border-red-500/25 bg-red-500/10 text-red-400",
  },
  // Still honoured if the transfer shows up later, so it does not read as a
  // refusal.
  EXPIRED: {
    text: "Quá hạn",
    className: "border-white/10 bg-white/5 text-neutral-500",
    icon: Hourglass,
    box: "border-white/10 bg-white/5 text-neutral-500",
  },
  CANCELLED: {
    text: "Đã hủy",
    className: "border-white/10 bg-white/5 text-neutral-500",
    icon: Ban,
    box: "border-white/10 bg-white/5 text-neutral-500",
  },
};

/** Rows per page of history. */
const PAGE_SIZE = 10;

/**
 * One method's ledger, paged. A pending row is a live thing: clicking it
 * reopens its invoice above, where the cancel link lives. Rows wear the
 * inner-tile chrome of the overview page's cards.
 */
function HistoryList({
  rows,
  empty,
  onOpen,
}: {
  rows: TopUpHistoryRow[];
  empty: string;
  onOpen: (row: TopUpHistoryRow) => void;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Clamped rather than reset by effect: cancelling the last row of the last
  // page shrinks pageCount and the view just follows.
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center text-sm text-neutral-400">
        {empty}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visible.map((row) => {
        const isPending = row.status === "PENDING";
        const status = HISTORY_STATUS[row.status] ?? HISTORY_STATUS.PENDING!;
        const StatusIcon = status.icon;
        return (
          <div
            key={row.code}
            onClick={isPending ? () => onOpen(row) : undefined}
            className={`flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 ${
              isPending
                ? "cursor-pointer transition-colors hover:border-red-500/40 hover:bg-white/[0.05]"
                : ""
            }`}
          >
            {/* The state as a coloured seal, readable before any word is. */}
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${status.box}`}
            >
              <StatusIcon size={15} />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-white">
                  {row.code}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${status.className}`}
                >
                  {status.text}
                </span>
              </div>
              {/* Carrier only on card rows — the section heading already
                  names the method. The countdown rides here because after a
                  reload this line is the only place it can live. */}
              <span className="truncate text-[11px] text-neutral-500">
                {row.method === "CARD" ? `${row.carrier ?? "Thẻ cào"} · ` : ""}
                {row.createdAt}
                {isPending && row.expiresAt ? (
                  <>
                    {" "}
                    · còn <TopUpCountdown deadline={row.expiresAt} />
                  </>
                ) : null}
              </span>
            </div>

            {/* Money talks in colour: green and signed once credited, struck
                through once the request can no longer credit, plain while
                everything is still open. */}
            <span
              className={`shrink-0 text-sm font-black ${
                row.status === "COMPLETED"
                  ? "text-emerald-400"
                  : row.status === "FAILED" || row.status === "CANCELLED"
                    ? "text-neutral-600 line-through"
                    : "text-neutral-200"
              }`}
            >
              {row.status === "COMPLETED" ? "+" : ""}
              {formatVnd(row.amount)}đ
            </span>
          </div>
        );
      })}

      <Pager
        page={current}
        pageCount={pageCount}
        onSelect={setPage}
        total={rows.length}
        pageSize={PAGE_SIZE}
        unit="lệnh"
      />
    </div>
  );
}

export function WalletTopUp({
  history = [],
  minAmount,
  presets,
  bankEnabled,
  cardEnabled,
  banks,
  autoEnabled,
  watch,
}: WalletTopUpProps) {
  // Which account the customer says they will transfer to. It only decides
  // which QR is drawn — reconciliation reads every account, so paying the
  // other one still settles the request.
  const [bankIndex, setBankIndex] = useState(0);
  const bank = banks[bankIndex] ?? null;
  // Bank first: it is the path that settles by itself, and the one the shop
  // wants people on. Never a tab that is switched off, though — that would
  // open on a form the server is going to refuse.
  const [method, setMethod] = useState<Method>(bankEnabled ? "bank" : "card");
  const [carrier, setCarrier] = useState<string>("");
  const router = useRouter();
  // Which code "Hủy" is working on — one flag serves the invoice card's link
  // and every history-row chip without them sharing a spinner.
  const [cancelingCode, setCancelingCode] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Invoice | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [credited, setCredited] = useState<Credited | null>(null);

  // The request this page watches: the one just opened, or whatever the server
  // says is still unpaid and recent. Watching one specific code, rather than
  // the shop's overall match count, means a poll that was rate limited or that
  // credited somebody else cannot make this page act.
  const waitingCode = done?.code ?? watch?.code ?? null;
  const deadline = done?.expiresAt ?? watch?.expiresAt ?? null;

  /**
   * While the customer has something outstanding, ask the shop to check its
   * statement. That is what makes an automatic top-up land in seconds without
   * a cron server — and when auto is off the endpoint answers immediately with
   * nothing, so this costs a request every ten seconds and no more.
   */
  useEffect(() => {
    if (!autoEnabled || credited || !waitingCode) return;
    let stopped = false;

    const tick = async () => {
      try {
        // Ask the shop to read its statement. The answer is ignored: it covers
        // every customer, and may have been served from the rate-limit window.
        await fetch("/api/wallet/sync", { method: "POST" });

        // Then ask about this request specifically, which also catches one
        // settled by an admin or the scheduler between two ticks.
        const status = await fetch("/api/wallet/status?code=" + waitingCode);
        const data = (await status.json()) as {
          status?: string;
          amount?: number;
          balance?: number;
        };
        if (!stopped && data.status === "COMPLETED") {
          setCredited({
            code: waitingCode,
            amount: data.amount ?? 0,
            balance: data.balance ?? 0,
          });
        }
      } catch {
        // A failed poll is not worth telling the customer about; the next one
        // is ten seconds away and the shop can still confirm by hand.
      }
    };

    const timer = window.setInterval(tick, 10_000);
    void tick();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [waitingCode, autoEnabled, credited]);

  // Whether the request on screen has run past the window the shop holds it
  // for. Not a refusal: a late transfer still credits, so this only changes
  // what the screen says, never what it does.
  const timeLeft = useTimeLeft(credited ? null : deadline);
  const overdue = timeLeft !== null && timeLeft <= 0;

  /**
   * Reload once the customer has read the receipt.
   *
   * Everything around this component was rendered before the money arrived:
   * the balance in the header, and the history row still reading "Đang chờ".
   */
  const dismissCredited = useCallback(() => {
    window.location.reload();
  }, []);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard is blocked on insecure origins; the value is on screen to
      // read anyway, so this is not worth an error message.
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setDone(null);

    try {
      const response = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount.replace(/\D/g, "")),
          method: method === "card" ? "CARD" : "BANK",
          // Only meaningful for a card top-up; the endpoint ignores it for
          // bank transfers rather than storing a carrier that means nothing.
          ...(method === "card" ? { carrier } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        invoiceCode?: string;
        amount?: number;
        transferNote?: string;
        expiresAt?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Không tạo được hóa đơn");
        return;
      }

      // No reload: the balance has not moved yet and will not until the shop
      // confirms, and reloading would throw away the transfer instructions the
      // customer is about to use.
      setDone({
        code: data.invoiceCode ?? "",
        amount: data.amount ?? 0,
        transferNote: data.transferNote ?? "",
        method,
        expiresAt: data.expiresAt ?? null,
      });
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  /**
   * Withdraws a request — from the invoice card or straight off a history
   * row. The server refuses anything already settled, so a transfer that
   * landed a moment ago is safe: the refusal simply shows as the error strip.
   */
  async function cancelByCode(code: string) {
    if (cancelingCode) return;
    setCancelingCode(code);
    setError(null);
    try {
      const response = await fetch("/api/wallet/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Không hủy được lệnh, thử lại sau");
        return;
      }
      if (done?.code === code) setDone(null);
      // The history below is server-rendered; refresh so the row shows Đã hủy.
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setCancelingCode(null);
    }
  }

  /**
   * A pending history row reopens as the live invoice — same panel, same
   * QR — for the customer who closed the tab mid-transfer and came back.
   */
  function openRow(row: TopUpHistoryRow) {
    setDone({
      code: row.code,
      amount: row.amount,
      transferNote: row.transferNote,
      method: row.method === "CARD" ? "card" : "bank",
      expiresAt: row.expiresAt,
    });
    setError(null);
    // The panel mounts at the top of the block, likely off-screen from a
    // click halfway down the ledger.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-xs leading-relaxed text-neutral-300">
        <span className="font-black uppercase tracking-wider text-red-400">
          Lưu ý:
        </span>{" "}
        Tiền vào tài khoản trong 30–60s. Nếu sau thời gian trên chưa được cộng
        tiền, vui lòng liên hệ admin.
      </div>

      <div className="flex items-center gap-3">
        {bankEnabled ? (
          <button
            type="button"
            onClick={() => setMethod("bank")}
            className={method === "bank" ? TAB_ACTIVE : TAB_INACTIVE}
          >
            <Banknote size={15} />
            Ngân Hàng
          </button>
        ) : null}
        {cardEnabled ? (
          <button
            type="button"
            onClick={() => setMethod("card")}
            className={method === "card" ? TAB_ACTIVE : TAB_INACTIVE}
          >
            <CreditCard size={15} />
            Thẻ Cào
          </button>
        ) : null}
      </div>

      {/* The transfer instructions. Shown after the request is opened and kept
          on screen — this is the only place the customer can read the code the
          shop matches their transfer by. */}
      {done ? (
        // The menzu red dress: near-black shell, 1.5px red border with a soft
        // glow, and the hairline scan along the top edge — the same signature
        // the storefront's search fields wear.
        <div
          className={`relative overflow-hidden rounded-2xl border-[1.5px] border-red-500/30 bg-[#111] shadow-[0_0_40px_rgba(239,68,68,0.07)] p-5 flex flex-col gap-4 ${
            credited ? "" : "invoice-breathe"
          }`}
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/70 to-transparent"
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-black uppercase tracking-widest text-white">
              Lệnh nạp <span className="font-mono text-red-400">{done.code}</span>
            </span>
            {credited ? (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                Đã nhận được tiền · đang cập nhật ví
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-red-500/30 bg-red-500/10 text-red-400">
                {autoEnabled ? "Đang chờ tiền về" : "Đang chờ xác nhận"}
              </span>
            )}
            {/* Placed next to the status, because it qualifies it: the request
                is waiting, and this is how much longer it waits for. */}
            {!credited && done.expiresAt ? (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-white/10 bg-white/5 text-neutral-400">
                Còn <TopUpCountdown deadline={done.expiresAt} />
              </span>
            ) : null}
          </div>

          {overdue && !credited ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] leading-relaxed text-neutral-300">
              Hết thời gian giữ lệnh. Nếu bạn{" "}
              <span className="font-bold text-white">đã chuyển khoản</span>, tiền vẫn được
              cộng khi shop nhận được — đừng tạo lệnh mới, và cũng đừng chuyển lại lần nữa.
            </p>
          ) : null}

          {done.method === "bank" && bank ? (
            <div className="flex flex-col sm:flex-row gap-5">
              {/* VietQR renders the bank, account, amount and description into
                  one scan. Plain <img>: it is a third-party URL and adding it
                  to next/image's allow-list would be config for one picture. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.vietqr.io/image/${encodeURIComponent(bank.code)}-${encodeURIComponent(bank.account)}-compact2.png?amount=${done.amount}&addInfo=${encodeURIComponent(done.transferNote)}&accountName=${encodeURIComponent(bank.holder)}`}
                alt={`Mã QR chuyển khoản ${formatVnd(done.amount)}đ`}
                width={220}
                height={310}
                className="w-[220px] h-auto shrink-0 rounded-xl bg-white"
              />

              <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                <CopyRow label="Ngân hàng" value={bank.name || bank.code} onCopy={copy} copied={copied} />
                <CopyRow label="Số tài khoản" value={bank.account} onCopy={copy} copied={copied} />
                <CopyRow label="Chủ tài khoản" value={bank.holder} onCopy={copy} copied={copied} />
                <CopyRow
                  label="Số tiền"
                  value={String(done.amount)}
                  display={`${formatVnd(done.amount)}đ`}
                  onCopy={copy}
                  copied={copied}
                />
                <CopyRow
                  label="Nội dung"
                  value={done.transferNote}
                  highlight
                  onCopy={copy}
                  copied={copied}
                />
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Ghi <span className="font-bold text-white">đúng nội dung</span> ở trên khi
                  chuyển khoản — hệ thống dựa vào đó để biết tiền là của bạn.{" "}
                  {autoEnabled
                    ? "Cứ để trang này mở, tiền về là ví tự cộng trong vài giây."
                    : "Chuyển xong cứ đóng trang, tiền vào ví ngay khi shop đối soát xong."}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-neutral-300 leading-relaxed">
              Gửi ảnh thẻ cào ({done.amount.toLocaleString("vi-VN")}đ) kèm mã{" "}
              <span className="font-mono font-bold text-white">{done.code}</span> cho shop
              qua Zalo để được đối soát. Tiền vào ví ngay khi shop xác nhận.
            </p>
          )}

          {/* Bottom-right on purpose: the exit door of the card, past every
              transfer detail. Gone once money has arrived — a credited
              request has nothing left to cancel. */}
          {!credited ? (
            <button
              type="button"
              onClick={() => cancelByCode(done.code)}
              disabled={cancelingCode !== null}
              className="self-end text-[11px] font-black uppercase tracking-widest text-red-400/80 transition-colors hover:text-red-300 disabled:cursor-wait disabled:opacity-60"
            >
              {cancelingCode === done.code ? "Đang hủy…" : "Hủy hóa đơn này"}
            </button>
          ) : null}
        </div>
      ) : null}

      {!bankEnabled && !cardEnabled ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 px-5 py-10 text-center">
          <p className="text-sm font-bold text-white">Tạm ngưng nhận nạp tiền</p>
          <p className="mt-1.5 text-[13px] text-neutral-400">
            Shop đang tạm dừng cả nạp ngân hàng và thẻ cào. Số dư sẵn có trong ví vẫn
            dùng để mua hàng bình thường.
          </p>
        </div>
      ) : method === "bank" && banks.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 px-5 py-10 text-center">
          <p className="text-sm font-bold text-white">Chưa nhận được chuyển khoản</p>
          <p className="mt-1.5 text-[13px] text-neutral-400">
            Shop chưa khai báo tài khoản ngân hàng nhận tiền. Vui lòng dùng thẻ cào hoặc
            liên hệ shop qua Zalo.
          </p>
        </div>
      ) : method === "bank" ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
        >
          {banks.length > 1 ? (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Chọn ngân hàng
              </span>
              <div className="flex flex-wrap gap-2">
                {banks.map((option, index) => (
                  <button
                    key={`${option.code}-${option.account}`}
                    type="button"
                    onClick={() => setBankIndex(index)}
                    aria-pressed={index === bankIndex}
                    className={index === bankIndex ? PRESET_ACTIVE : PRESET_INACTIVE}
                  >
                    {option.name || option.code}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
              Số tiền nạp
            </label>
            <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-neutral-950/60 border border-neutral-800/60 focus-within:border-[var(--brand)]/60 transition-colors">
              {/* State keeps bare digits (presets and submit read it as a
                  number); only the field shows them grouped — 50000 reads
                  as 50.000 the moment it is typed. */}
              <input
                value={amount ? formatVnd(Number(amount)) : ""}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/\D/g, "").slice(0, 12))
                }
                inputMode="numeric"
                placeholder="0"
                className="flex-1 bg-transparent outline-none text-white text-sm font-bold tabular-nums placeholder-neutral-600"
              />
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                VNĐ
              </span>
            </div>
            <span className="text-[11px] text-neutral-500">
              Nạp từ {formatVnd(minAmount)}đ trở lên. Miễn phí giao dịch.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={amount === String(p) ? PRESET_ACTIVE : PRESET_INACTIVE}
              >
                {formatVnd(p)}
              </button>
            ))}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
            >
              {error}
            </p>
          ) : null}

          {done ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400">
              Đã tạo lệnh nạp {done.code}. Xem hướng dẫn chuyển khoản bên dưới.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 disabled:cursor-wait text-white font-black py-3.5 uppercase tracking-widest text-xs transition-colors"
          >
            {pending ? "Đang xử lý…" : "Tạo hóa đơn"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-5"
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
              1. Chọn nhà mạng
            </legend>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CARRIERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCarrier(option.value)}
                  aria-pressed={carrier === option.value}
                  className={`h-14 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-colors ${
                    carrier === option.value
                      ? "border-[var(--brand)] bg-[var(--brand)]/10 text-white"
                      : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-600 hover:text-white"
                  }`}
                  style={carrier === option.value ? undefined : { color: option.tint }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
              Số tiền nạp
            </h3>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={amount === String(preset) ? PRESET_ACTIVE : PRESET_INACTIVE}
                >
                  {formatVnd(preset)}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-neutral-500">
              Chọn đúng mệnh giá in trên thẻ. Sai mệnh giá thẻ sẽ mất.
            </span>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
            >
              {error}
            </p>
          ) : null}

          {done ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400">
              Đã tạo lệnh nạp {done.code}. Xem hướng dẫn chuyển khoản bên dưới.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || !carrier}
            className="w-full rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 uppercase tracking-widest text-xs transition-colors"
          >
            {pending ? "Đang xử lý…" : "Tạo hóa đơn"}
          </button>
        </form>
      )}

      {/* The ledger follows the tab above it: on Ngân Hàng only bank rows,
          on Thẻ Cào only card rows — each method reads as its own desk. The
          card chrome and header row match the overview page's sections.
          Keyed by method so switching tabs starts back at page one. */}
      <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            {method === "card" ? "Lịch sử nạp thẻ cào" : "Lịch sử nạp ngân hàng"}
          </h3>
          <span className="text-xs text-neutral-500">
            Bấm vào lệnh đang chờ để mở lại hóa đơn
          </span>
        </div>
        <HistoryList
          key={method}
          rows={history.filter((row) =>
            method === "card" ? row.method === "CARD" : row.method !== "CARD",
          )}
          empty={
            method === "card"
              ? "Chưa có lệnh nạp thẻ cào nào."
              : "Chưa có lệnh nạp ngân hàng nào."
          }
          onOpen={openRow}
        />
      </section>

      {credited ? (
        <TopUpSuccessDialog
          code={credited.code}
          amount={credited.amount}
          balance={credited.balance}
          onClose={dismissCredited}
        />
      ) : null}
    </div>
  );
}
