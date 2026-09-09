"use client";

import {
  Ban,
  Check,
  Clock,
  Copy,
  Hourglass,
  ClipboardPaste,
  Loader2,
  Ticket,
  XCircle,
  CreditCard,
} from "lucide-react";
import Image from "next/image";

import { cardNet, cardRateFor, type CardRate } from "@/lib/topup";
import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { Pager } from "./Pager";
import { ErrorModal } from "./ErrorModal";
import { TopUpCountdown, useTimeLeft } from "./TopUpCountdown";
import { TopUpSuccessDialog } from "./TopUpSuccessDialog";

type Method = "bank" | "card";

/**
 * Carriers whose prepaid cards the shop accepts.
 *
 * Rendered as tinted text rather than brand logos: the marks are the
 * carriers' own marks, the way every top-up desk in the country draws
 * them: a customer holding a card matches the logo before the word.
 */
const CARRIERS = [
  // Measured off the files: the letters, not the drawing. Vinaphone pads its
  // canvas, Zing wraps its word in a badge and Garena stands a dragon next to
  // one, so a shared image height renders five different type sizes. These
  // heights put every wordmark at about 15px.
  { value: "Viettel", label: "Viettel", logo: "/images/carriers/viettel.svg", height: 16 },
  { value: "Vinaphone", label: "Vinaphone", logo: "/images/carriers/vinaphone.svg", height: 24 },
  { value: "Mobifone", label: "Mobifone", logo: "/images/carriers/mobifone.svg", height: 15 },
  { value: "Garena", label: "Garena", logo: "/images/carriers/garena.svg", height: 26 },
  { value: "Zing", label: "Zing", logo: "/images/carriers/zing.svg", height: 25 },
] as const;

export interface TopUpHistoryRow {
  code: string;
  method: string;
  carrier: string | null;
  amount: number;
  /** What the wallet received. Below `amount` on a card once the fee comes
   *  off; null on rows that predate the column, which read `amount`. */
  credited: number | null;
  status: string;
  /** Why the desk refused it. Null on every row that was not refused. */
  note?: string | null;
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
  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--menzu-accent)] text-white transition-colors";
const TAB_INACTIVE =
  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

const PRESET_ACTIVE =
  "px-4 py-2 rounded-lg text-[11px] font-bold border border-[var(--menzu-accent)]/50 bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)] transition-colors whitespace-nowrap";
const PRESET_INACTIVE =
  "px-4 py-2 rounded-lg text-[11px] font-bold border border-neutral-800/60 bg-neutral-950/40 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap";

/** The card-number boxes: the admin field, sized for digits. */
const CARD_FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3.5 py-2.5 font-mono text-sm tracking-wider text-white outline-none transition-colors focus:border-[var(--menzu-accent)]/60 placeholder:font-sans placeholder:tracking-normal placeholder:text-neutral-600";
const CARD_LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-400";

/**
 * One of the two numbers off a scratch card.
 *
 * Digits only as they are typed, and a paste button inside the field: on a
 * phone these numbers usually arrive from a message, and asking someone to
 * long-press a 15-digit field is asking for a mistyped card.
 */
function CardNumberField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const take = (raw: string) => onChange(raw.replace(/\D/g, "").slice(0, 24));
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={CARD_LABEL}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(event) => take(event.target.value)}
          className={`${CARD_FIELD} pr-11`}
        />
        <button
          type="button"
          aria-label={`Dán ${label}`}
          onClick={async () => {
            try {
              take(await navigator.clipboard.readText());
            } catch {
              // Blocked or empty clipboard: the field is still typeable, and
              // an error here would be noise about something optional.
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-500 transition-colors hover:text-white"
        >
          <ClipboardPaste size={15} />
        </button>
      </div>
    </div>
  );
}

export interface WalletTopUpProps {
  history?: TopUpHistoryRow[];
  /** Smallest accepted amount, from the shop settings. */
  minAmount: number;
  /** The amount buttons, already sorted low to high by the server. */
  presets: number[];
  /**
   * The thẻ cào tab's own amounts — the denominations the carriers actually
   * print. A card for 2.000.000đ does not exist, so the bank list must not be
   * what the card tab offers.
   */
  cardPresets: number[];
  /** Overrides per denomination; empty means every card uses the one rate. */
  cardRates: CardRate[];
  /** The rate every denomination uses unless the list overrides it. */
  cardFee: number;
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
  /** The card's face value — what was asked for. */
  amount: number;
  /** What the wallet actually got, once the card fee came off. */
  credited: number;
  balance: number;
}

/**
 * One transfer detail. The two values a buyer actually retypes into their
 * banking app — the account number and the transfer note — carry a copy
 * button; the rest are there to be read and checked, not moved.
 */
function CopyRow({
  label,
  value,
  display,
  highlight = false,
  copyable = true,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  display?: string;
  highlight?: boolean;
  copyable?: boolean;
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
        {/* Every row reserves the button's slot, filled or empty, so the
            values end on one line instead of a ragged edge. */}
        <span className="flex w-8 shrink-0 justify-end">
          {copyable ? (
            <button
              type="button"
              onClick={() => onCopy(label, value)}
              aria-label={copied === label ? `Đã copy ${label}` : `Copy ${label}`}
              title={copied === label ? "Đã copy" : "Copy"}
              className={`grid h-7 w-7 place-items-center rounded-md border transition-colors ${
                copied === label
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {copied === label ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/* A state is one coloured word beside the code, and only when it needs
   saying: a credited row is told by its signed green figure. No seal, no
   framed pill — a statement, not a row of badges. */
/* The seal on the row's left carries the state's colour; the word beside the
   code stays quiet except where the state is live or wrong. */
const HISTORY_STATUS: Record<
  string,
  { text: string; box: string; sum: string; code: string; card: string }
> = {
  PENDING: {
    text: "Đang chờ",
    box: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    sum: "text-amber-400",
    code: "text-white",
    // The edge, and only the edge: the row you can still act on is outlined,
    // the ground under it stays the same as every other row.
    card: "border-amber-500/40 bg-white/[0.02]",
  },
  COMPLETED: {
    text: "Đã cộng",
    box: "border-white/10 bg-white/[0.06] text-neutral-300",
    sum: "text-white",
    code: "text-white",
    card: "border-white/[0.06] bg-white/[0.02]",
  },
  FAILED: {
    text: "Từ chối",
    // Quieted to match the other dead rows: still red, because a refusal
    // is not the same as a request the customer dropped, but no longer
    // the brightest thing on a page of finished requests.
    box: "border-red-500/15 bg-red-500/[0.06] text-red-400/60",
    sum: "text-neutral-600 line-through",
    code: "text-neutral-500",
    card: "border-white/[0.06] bg-white/[0.02]",
  },
  // Time ran out, and the request is still honoured if the transfer shows up
  // later — so the seal warns in red without the strike a refusal wears.
  EXPIRED: {
    text: "Quá hạn",
    box: "border-red-500/25 bg-red-500/10 text-red-400",
    sum: "text-neutral-600",
    code: "text-neutral-500",
    card: "border-white/[0.06] bg-white/[0.02]",
  },
  CANCELLED: {
    text: "Đã hủy",
    box: "border-white/10 bg-white/5 text-neutral-500",
    sum: "text-neutral-600",
    code: "text-neutral-500",
    card: "border-white/[0.06] bg-white/[0.02]",
  },
};

/** Rows per page of history, once the whole list is open. */
const PAGE_SIZE = 10;

/**
 * How many finished requests the page shows before it stops.
 *
 * The list used to run to fifty, and on a busy account that is a screen and a
 * half of cancelled requests under the one thing the page is for. Anything
 * still waiting is always shown — that is the live part — and the rest is
 * five rows and a way in to the whole list.
 */
const RECENT_COUNT = 5;

/**
 * One method's ledger, paged, drawn as a statement: one block, hairlines
 * between rows, the figure at the right edge. A pending row is a live thing —
 * marked by a red bar on its left, and clicking it reopens its invoice above,
 * where the cancel link lives.
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
  const [showAll, setShowAll] = useState(false);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Clamped rather than reset by effect: cancelling the last row of the last
  // page shrinks pageCount and the view just follows.
  const current = Math.min(page, pageCount - 1);
  // Short by default: everything still waiting, then the five newest of the
  // rest. Nothing is dropped — "Xem tất cả" opens the paged list in place.
  const waiting = rows.filter((row) => row.status === "PENDING");
  const settled = rows.filter((row) => row.status !== "PENDING");
  const short = [...waiting, ...settled.slice(0, RECENT_COUNT)];
  const hidden = rows.length - short.length;
  const visible = showAll
    ? rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)
    : short;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center text-sm text-neutral-400">
        {empty}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {visible.map((row) => {
          const isPending = row.status === "PENDING";
          const status = HISTORY_STATUS[row.status] ?? HISTORY_STATUS.PENDING!;
          return (
            <div
              key={row.code}
              onClick={isPending ? () => onOpen(row) : undefined}
              /* Each request its own card, as the overview page's tiles are.
                 One of them owns an edge: the amber one, still waiting for
                 money, and the only card that answers a press because it is
                 the only one with an invoice left to open. */
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${status.card} ${
                isPending
                  ? "cursor-pointer transition-colors hover:border-amber-500/60 hover:bg-white/[0.04]"
                  : ""
              }`}
            >
              {/* The state as a coloured seal, readable before any word is;
                  the pending one turns. */}
              <span
                title={status.text}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${status.box}`}
              >
                <span className="sr-only">{status.text}</span>
                {isPending ? (
                  <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden />
                ) : row.status === "COMPLETED" ? (
                  row.method === "CARD" ? (
                    <Ticket size={15} aria-hidden />
                  ) : (
                    <CreditCard size={15} aria-hidden />
                  )
                ) : row.status === "FAILED" ? (
                  <XCircle size={15} aria-hidden />
                ) : row.status === "EXPIRED" ? (
                  <Hourglass size={15} aria-hidden />
                ) : (
                  <Ban size={15} aria-hidden />
                )}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`font-mono text-xs font-bold ${status.code}`}>{row.code}</span>
                  {isPending && row.expiresAt ? (
                    <span className="text-[11px] font-semibold text-amber-400">
                      còn <TopUpCountdown deadline={row.expiresAt} />
                    </span>
                  ) : null}
                </div>
                {/* Carrier only on card rows — the section heading already
                    names the method. */}
                <span
                  className={`truncate text-[11px] ${
                    status.code === "text-white" ? "text-neutral-500" : "text-neutral-600"
                  }`}
                >
                  {row.method === "CARD" ? `${row.carrier ?? "Thẻ cào"} · ` : ""}
                  {row.createdAt}
                </span>
                {/* The desk's answer to "tại sao", on the row it belongs to.
                    A refusal that says only "Từ chối" reads as the shop
                    keeping the money, and the reason was asked for in chat
                    every single time. */}
                {row.note ? (
                  <span className="text-[11px] leading-snug text-red-400/80">{row.note}</span>
                ) : null}
              </div>

              {/* Money talks in colour: green and signed once credited, struck
                  through once the request can no longer credit, plain while
                  everything is still open. The green is the ledger's green, so
                  the same money reads the same on both pages. */}
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className={`text-sm font-black tabular-nums ${status.sum}`}>
                  {row.status === "COMPLETED" ? "+" : ""}
                  {formatVnd(row.credited ?? row.amount)}đ
                </span>
                {row.status === "COMPLETED" &&
                row.credited !== null &&
                row.credited < row.amount ? (
                  <span className="text-[10px] tabular-nums text-neutral-500">
                    thẻ {formatVnd(row.amount)}đ · phí{" "}
                    {formatVnd(row.amount - row.credited)}đ
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      {showAll ? (
        <Pager
          page={current}
          pageCount={pageCount}
          onSelect={setPage}
          total={rows.length}
          pageSize={PAGE_SIZE}
          unit="lệnh"
        />
      ) : hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-start text-[11px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
        >
          Xem tất cả {rows.length} lệnh
        </button>
      ) : null}
    </div>
  );
}

export function WalletTopUp({
  history = [],
  minAmount,
  presets,
  cardPresets,
  cardRates,
  cardFee,
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
  // Digits only as they are typed: people read the numbers off the card in
  // groups and paste them with spaces, and that must not become an error.
  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const router = useRouter();
  // Which code "Hủy" is working on — one flag serves the invoice card's link
  // and every history-row chip without them sharing a spinner.
  const [cancelingCode, setCancelingCode] = useState<string | null>(null);
  // The code just withdrawn, shown on a sheet until it is dismissed: the
  // card above simply disappears otherwise, which reads as a glitch.
  const [cancelled, setCancelled] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  // Every box the card form needs before it can be sent. The carrier and the
  // denomination are picked, the two numbers are typed; anything shorter than
  // six digits is half a card.
  const cardReady =
    Boolean(carrier) && amount !== "" && serial.length >= 6 && pin.length >= 6;
  // The two figures the card tab talks in: what the shop keeps, and what the
  // wallet gets. Both read from the same helper the server credits with.
  const cardPercent = amount ? cardRateFor(Number(amount), cardRates, cardFee) : 0;
  const cardCredit = amount ? cardNet(Number(amount), cardRates, cardFee) : 0;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Invoice | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [credited, setCredited] = useState<Credited | null>(null);
  /** The desk turned this request down while the screen was watching it. */
  const [refused, setRefused] = useState<{ code: string; note: string | null } | null>(null);

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
    if (credited || refused || !waitingCode) return;
    let stopped = false;

    const tick = async () => {
      try {
        // Ask the shop to read its statement. The answer is ignored: it covers
        // every customer, and may have been served from the rate-limit window.
        // Only when the feed is automatic; by hand there is nothing to read,
        // and the status call below still catches the desk's decision.
        if (autoEnabled) await fetch("/api/wallet/sync", { method: "POST" });

        // Then ask about this request specifically, which also catches one
        // settled by an admin or the scheduler between two ticks.
        const status = await fetch("/api/wallet/status?code=" + waitingCode);
        const data = (await status.json()) as {
          status?: string;
          amount?: number;
          credited?: number | null;
          balance?: number;
          note?: string | null;
        };
        if (!stopped && data.status === "COMPLETED") {
          setCredited({
            code: waitingCode,
            amount: data.amount ?? 0,
            credited: data.credited ?? data.amount ?? 0,
            balance: data.balance ?? 0,
          });
        }
        // Turned down. The card stops breathing and says so; a spinner that
        // keeps turning over a decided request promises something that is
        // not happening.
        if (!stopped && data.status === "FAILED") {
          setRefused({ code: waitingCode, note: data.note ?? null });
          // The history below is server-rendered and still reads "Đang chờ";
          // with the invoice closed it is the only place the refusal shows.
          router.refresh();
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
  }, [waitingCode, autoEnabled, credited, refused]);

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
          // Only meaningful for a card top-up; the endpoint ignores them for
          // bank transfers rather than storing fields that mean nothing.
          ...(method === "card" ? { carrier, serial, pin } : {}),
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
      setSerial("");
      setPin("");
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
      setCancelled(code);
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
            <CreditCard size={15} />
            Ngân Hàng
          </button>
        ) : null}
        {cardEnabled ? (
          <button
            type="button"
            onClick={() => setMethod("card")}
            className={method === "card" ? TAB_ACTIVE : TAB_INACTIVE}
          >
            <Ticket size={15} />
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
          className={`relative overflow-hidden rounded-2xl border-[1.5px] bg-[#111] p-5 flex flex-col gap-4 ${
            refused
              ? "border-red-500/70"
              : credited
                ? "border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.07)]"
                : "invoice-breathe border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.07)]"
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
            {refused ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-red-500 text-white">
                <XCircle size={12} aria-hidden />
                {done.method === "card" ? "Thẻ bị từ chối" : "Lệnh nạp bị từ chối"}
              </span>
            ) : credited ? (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                Đã nhận được tiền · đang cập nhật ví
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-red-500/30 bg-red-500/10 text-red-400">
                {/* Turning while the request is alive: the page is watching
                    the bank, and this is what says so before any word. */}
                <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden />
                {autoEnabled ? "Đang chờ tiền về" : "Đang chờ xác nhận"}
              </span>
            )}
            {/* Placed next to the status, because it qualifies it: the request
                is waiting, and this is how much longer it waits for. */}
            {!credited && !refused && done.expiresAt ? (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-white/10 bg-white/5 text-neutral-400"
                aria-label="Thời gian còn lại"
              >
                <Clock size={12} aria-hidden />
                <span className="text-white">
                  <TopUpCountdown deadline={done.expiresAt} />
                </span>
              </span>
            ) : null}
          </div>

          {/* The desk said no. The reason it typed, or the plain fact when it
              typed none, and the way back to the form — not a shake: this
              arrived from a ten-second poll, not from anything the customer
              pressed, and a card that jolts on its own is motion nobody asked
              for. */}
          {refused ? (
            <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3">
              <p className="text-[12.5px] leading-relaxed text-neutral-200">
                {refused.note
                  ? refused.note
                  : done.method === "card"
                    ? "Shop không nạp được thẻ này. Kiểm tra lại số seri và mã thẻ, hoặc liên hệ hỗ trợ kèm mã lệnh."
                    : "Shop không xác nhận được lệnh nạp này. Liên hệ hỗ trợ kèm mã lệnh nếu bạn đã chuyển tiền."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDone(null);
                  setRefused(null);
                  setError(null);
                }}
                className="press self-start rounded-lg bg-[var(--menzu-accent)] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-[var(--menzu-accent-dark)]"
              >
                {done.method === "card" ? "Nhập thẻ khác" : "Tạo lệnh khác"}
              </button>
            </div>
          ) : null}

          {overdue && !credited && !refused ? (
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
                <CopyRow label="Ngân hàng" value={bank.name || bank.code} copyable={false} onCopy={copy} copied={copied} />
                <CopyRow label="Số tài khoản" value={bank.account} onCopy={copy} copied={copied} />
                <CopyRow label="Chủ tài khoản" value={bank.holder} copyable={false} onCopy={copy} copied={copied} />
                <CopyRow
                  label="Số tiền"
                  value={String(done.amount)}
                  display={`${formatVnd(done.amount)}đ`}
                  copyable={false}
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
              Đã nhận thẻ {done.amount.toLocaleString("vi-VN")}đ, mã lệnh{" "}
              <span className="font-mono font-bold text-white">{done.code}</span>. Shop
              đang đối soát với nhà mạng — tiền vào ví ngay khi thẻ hợp lệ. Bạn
              không cần gửi gì thêm, cứ đóng trang này.
            </p>
          )}

          {/* Bottom-right on purpose: the exit door of the card, past every
              transfer detail. Gone once money has arrived — a credited
              request has nothing left to cancel. */}
          {!credited && !refused ? (
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

      {/* Told after, not asked before: the owner found the question a nag.
          The sheet is what stops the card's disappearance reading as a
          glitch. */}
      {cancelled ? (
        <ErrorModal
          tone="done"
          title="Đã hủy hóa đơn"
          message={`Lệnh ${cancelled} đã được hủy. Bạn có thể tạo hóa đơn mới bất cứ lúc nào.`}
          onClose={() => setCancelled(null)}
        />
      ) : null}

      {done ? null : !bankEnabled && !cardEnabled ? (
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
            <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-neutral-950/60 border border-neutral-800/60 focus-within:border-[var(--menzu-accent)]/60 transition-colors">
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

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-70 disabled:cursor-wait text-white font-black py-3.5 uppercase tracking-widest text-xs transition-colors"
          >
            {pending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
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
                  aria-label={option.label}
                  className={`relative flex h-12 items-center justify-center rounded-xl border px-4 transition-colors ${
                    carrier === option.value
                      ? "border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/10"
                      : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-600"
                  }`}
                >
                  {/* The mark, not the word, at the height measured for it
                      rather than one height for all five. */}
                  <Image
                    src={option.logo}
                    alt={option.label}
                    width={160}
                    height={40}
                    style={{ height: option.height }}
                    className="w-auto max-w-[86%] object-contain"
                  />
                  {carrier === option.value ? (
                    <span
                      aria-hidden
                      className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--menzu-accent)]"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </fieldset>

          {carrier ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  2. Chọn mệnh giá
                </h3>
                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  Lưu ý: Chọn sai mệnh giá sẽ mất thẻ
                </span>
              </div>
              {/* One tile per denomination rather than a row of chips: the
                  figure is the thing being chosen, and it should be big
                  enough to check against the card in the customer's hand. */}
              <div className="flex flex-wrap gap-2">
                {cardPresets.map((preset) => (
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
              {/* What the wallet will actually get, said before the card is
                  sent rather than discovered in the ledger afterwards. Only
                  when the shop keeps something — a shop that credits cards
                  whole has nothing to explain. */}
              {/* One quiet green line: the wallet's own colour on the one
                  figure the customer is promised, and the reason for it in
                  the same breath. Still a single line tall. */}
              {amount && cardPercent > 0 ? (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                      Thực nhận về ví
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Đã trừ chiết khấu {String(cardPercent).replace(".", ",")}%
                    </span>
                  </div>
                  <span className="shrink-0 text-lg font-black tabular-nums text-emerald-400">
                    {formatVnd(cardCredit)}đ
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* The card itself. Typed here rather than sent to the shop over
              chat: the request then carries everything the desk needs, and
              the customer is not left holding two numbers and no instructions. */}
          {carrier && amount ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                3. Thông tin mã thẻ
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CardNumberField
                  id="card-pin"
                  label="Mã thẻ (PIN)"
                  placeholder="Nhập mã thẻ..."
                  value={pin}
                  onChange={setPin}
                />
                <CardNumberField
                  id="card-serial"
                  label="Số serial"
                  placeholder="Nhập số serial..."
                  value={serial}
                  onChange={setSerial}
                />
              </div>
              <span className="text-[11px] text-neutral-500">
                Cào lớp bạc rồi nhập đúng hai dãy số trên thẻ. Thẻ đã dùng hoặc
                nhập sai sẽ bị từ chối.
              </span>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || !cardReady}
            className="w-full rounded-2xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 uppercase tracking-widest text-xs transition-colors"
          >
            {pending
              ? "Đang xử lý…"
              : cardReady
                ? `Nạp ${CARRIERS.find((option) => option.value === carrier)?.label ?? "thẻ"} ${formatVnd(Number(amount))}đ`
                : "Nạp thẻ cào"}
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
            {method === "card" ? "Thẻ nạp gần đây" : "Lịch sử nạp ngân hàng"}
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
          amount={credited.credited}
          face={credited.amount}
          balance={credited.balance}
          onClose={dismissCredited}
        />
      ) : null}
    </div>
  );
}
