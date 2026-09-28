"use client";

import {
  Ban,
  CircleAlert,
  Clipboard,
  CreditCard,
  History,
  Hourglass,
  Loader2,
  QrCode,
  Ticket,
  Wallet,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useCallback, useRef, useState } from "react";

import { CARD_DIGITS_MIN, cardNet, cardRateFor, type CardRate } from "@/lib/topup";

import { Pager, scrollListTop } from "./Pager";
import { formatVnd } from "./productData";
import { CARRIERS } from "./topUpCarriers";
import { TopUpCountdown } from "./TopUpCountdown";
import { CreditedLines, TopUpDialog } from "./TopUpDialog";
import { useTopUpWatch, type TopUpOutcome } from "./useTopUpWatch";

type Method = "bank" | "card";

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
}

/*
 * Every class below is menzu's /wallet, measured off the live page, colours
 * included: its green on the tab, the chosen carrier and denomination and the
 * card button. Its violet (the title's mark) is red here, but not the shop's
 * #ff3158, which read as neon on this ground: #e13d3f is menzu's violet-500
 * with only the hue turned — same lightness, same strength (28/09/2026).
 */
const STEP = "text-xs text-neutral-400 font-bold uppercase tracking-wider";

/** A fee as menzu prints it on the corner of a tile: "- 20.5 %". */
function feeBadge(rate: number): string {
  return `- ${rate} %`;
}

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
  // Half a number gets told so, under the box it is about.
  const short = value.length > 0 && value.length < CARD_DIGITS_MIN;
  return (
    <div>
      <label htmlFor={id} className="text-[11px] text-neutral-500 font-bold uppercase mb-1.5 block ml-1">
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
          className="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all font-mono shadow-inner"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
        >
          <Clipboard size={15} aria-hidden />
        </button>
      </div>
      {short ? (
        <span className="mt-1.5 ml-1 block text-[11px] font-semibold text-red-400">
          {label} cần ít nhất {CARD_DIGITS_MIN} chữ số
        </span>
      ) : null}
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
  /** Whether the shop has an account to be paid into. */
  bankReady: boolean;
  /** Whether a matched transfer credits the wallet without an admin. */
  autoEnabled: boolean;
  /**
   * Request to poll for, or null when nothing recent is unpaid. Chosen on the
   * server, where a top-up's timestamp is still a date rather than the display
   * string these history rows carry.
   */
  watch: { code: string; expiresAt: string } | null;
}

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
    sum: "text-neutral-400 line-through",
    code: "text-neutral-500",
    card: "border-white/[0.06] bg-white/[0.02]",
  },
  // Time ran out, and the request is still honoured if the transfer shows up
  // later — so the seal warns in red without the strike a refusal wears.
  EXPIRED: {
    text: "Quá hạn",
    box: "border-red-500/25 bg-red-500/10 text-red-400",
    sum: "text-neutral-400",
    code: "text-neutral-500",
    card: "border-white/[0.06] bg-white/[0.02]",
  },
  CANCELLED: {
    text: "Đã hủy",
    box: "border-white/10 bg-white/5 text-neutral-500",
    sum: "text-neutral-400",
    code: "text-neutral-500",
    card: "border-white/[0.06] bg-white/[0.02]",
  },
};

/** Rows per page of history, once the whole list is open. */
const PAGE_SIZE = 10;

/**
 * How many finished requests the page shows before it stops.
 *
 * Anything still waiting is always shown — that is the live part — and the
 * rest is five rows and a way in to the whole list.
 */
const RECENT_COUNT = 5;

/**
 * One method's ledger, paged: each request its own card, the figure at the
 * right edge. A pending row is the live one — outlined, and a link to its
 * invoice, where the transfer details and the cancel button live.
 */
function HistoryList({ rows, empty }: { rows: TopUpHistoryRow[]; empty: string }) {
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Clamped rather than reset by effect: a list that shrinks under the pager
  // just shows its last page.
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
      <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
        <p className="text-neutral-500 text-sm">{empty}</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="scroll-mt-28 flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {visible.map((row) => {
          const isPending = row.status === "PENDING";
          const status = HISTORY_STATUS[row.status] ?? HISTORY_STATUS.PENDING!;
          const body = (
            <>
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
                {/* Carrier only on card rows — the heading already names the
                    method. */}
                <span
                  className={`truncate text-[11px] ${
                    status.code === "text-white" ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  {row.method === "CARD" ? `${row.carrier ?? "Thẻ cào"} · ` : ""}
                  {row.createdAt}
                </span>
                {/* The desk's answer to "tại sao", on the row it belongs to. */}
                {row.note ? (
                  <span className="text-[11px] leading-snug text-red-400/80">{row.note}</span>
                ) : null}
              </div>

              {/* Money talks in colour: green and signed once credited, struck
                  through once the request can no longer credit, plain while
                  everything is still open. */}
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className={`text-sm font-black tabular-nums ${status.sum}`}>
                  {row.status === "COMPLETED" ? "+" : ""}
                  {formatVnd(row.credited ?? row.amount)}đ
                </span>
                {row.status === "COMPLETED" &&
                row.credited !== null &&
                row.credited < row.amount ? (
                  <span className="text-[10px] tabular-nums text-neutral-500">
                    thẻ {formatVnd(row.amount)}đ · phí {formatVnd(row.amount - row.credited)}đ
                  </span>
                ) : null}
              </span>
            </>
          );
          const shape = `flex items-center gap-4 rounded-xl border px-4 py-3 ${status.card}`;
          return isPending ? (
            <Link
              key={row.code}
              href={`/wallet/${row.code}`}
              className={`${shape} transition-colors hover:border-amber-500/60 hover:bg-white/[0.04]`}
            >
              {body}
            </Link>
          ) : (
            <div key={row.code} className={shape}>
              {body}
            </div>
          );
        })}
      </div>

      {showAll ? (
        <Pager
          page={current}
          pageCount={pageCount}
          onSelect={(next) => {
            setPage(next);
            scrollListTop(listRef.current);
          }}
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
  bankReady,
  autoEnabled,
  watch,
}: WalletTopUpProps) {
  const router = useRouter();
  // The tab lives in the address, as on menzu (?method=card), so the header's
  // "Nạp Thẻ Cào", a reload and a shared link all open the same desk. Bank
  // unless the card was asked for: it is the path that settles by itself.
  // Never a tab that is switched off — that would be a form the server is
  // going to refuse.
  const asked: Method = useSearchParams().get("method") === "card" ? "card" : "bank";
  const method: Method = !bankEnabled ? "card" : !cardEnabled ? "bank" : asked;
  const [carrier, setCarrier] = useState<string>("");
  // Digits only as they are typed: people read the numbers off the card in
  // groups and paste them with spaces, and that must not become an error.
  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credited, setCredited] = useState<TopUpOutcome | null>(null);

  // The amount and any error belong to the tab they were typed on: a bank
  // figure carried into the card form named a denomination no carrier prints,
  // and a bank refusal sat over the card button. Reset while rendering, the
  // way React resets state on a changed input, because the tab can change
  // from outside too — the header's links move the address.
  const [formFor, setFormFor] = useState<Method>(method);
  if (formFor !== method) {
    setFormFor(method);
    setAmount("");
    setError(null);
  }

  const bankAmountOk = amount !== "" && Number(amount) >= minAmount;
  // The amount must be one the carriers print. A figure typed on the bank
  // tab used to ride along here and produce "Nạp Viettel 25.000đ" for a
  // denomination that does not exist.
  const cardAmountOk = amount !== "" && cardPresets.includes(Number(amount));
  const cardReady =
    Boolean(carrier) &&
    cardAmountOk &&
    serial.length >= CARD_DIGITS_MIN &&
    pin.length >= CARD_DIGITS_MIN;
  const carrierLabel = CARRIERS.find((option) => option.value === carrier)?.label ?? "thẻ";

  // Something opened earlier and still unpaid: the page keeps asking, so a
  // transfer made after the invoice was closed still lands with a receipt.
  useTopUpWatch(credited ? null : (watch?.code ?? null), autoEnabled, (outcome) => {
    if (outcome.status === "COMPLETED") setCredited(outcome);
    // Turned down: the history below is server-rendered and still reads
    // "Đang chờ"; the refresh is what puts the refusal on its row.
    else router.refresh();
  });

  /**
   * Reload once the customer has read the receipt: the balance in the header
   * and the history row were rendered before the money arrived.
   */
  const dismissCredited = useCallback(() => {
    window.location.reload();
  }, []);

  function switchTo(next: Method) {
    if (next === method || pending) return;
    // The history API rather than the router: nothing on the server changes
    // with the tab, and Next feeds the new address to useSearchParams.
    window.history.replaceState(null, "", next === "card" ? "/wallet?method=card" : "/wallet");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

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
      };

      if (!response.ok || !data.invoiceCode) {
        setError(data.error ?? "Không tạo được hóa đơn");
        setPending(false);
        return;
      }

      // The invoice is its own page, as on menzu: the transfer details, the
      // QR and the wait live there, and the address survives a reload. The
      // button stays busy until that page takes over.
      router.push(`/wallet/${data.invoiceCode}`);
    } catch {
      setError("Không kết nối được máy chủ");
      setPending(false);
    }
  }

  const errorLine = error ? (
    <p
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
    >
      {error}
    </p>
  ) : null;

  const tabs: { value: Method; label: string; icon: typeof CreditCard }[] = [
    ...(bankEnabled ? [{ value: "bank" as const, label: "Ngân Hàng", icon: CreditCard }] : []),
    ...(cardEnabled ? [{ value: "card" as const, label: "Thẻ Cào", icon: QrCode }] : []),
  ];

  const rows = history.filter((row) =>
    method === "card" ? row.method === "CARD" : row.method !== "CARD",
  );
  // The newest transfer still waiting to be paid: menzu puts it back in front
  // of the customer above the form, rather than letting a second one start.
  const unpaid = history.find((row) => row.status === "PENDING" && row.method !== "CARD") ?? null;

  const ledger =
    tabs.length > 0 ? (
      // The ledger follows the tab above it: on Ngân Hàng only bank rows, on
      // Thẻ Cào only card rows — each method reads as its own desk. Keyed by
      // method so switching tabs starts back at page one.
      <div className="mt-8 border-t border-white/10 pt-8">
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <History size={18} className="text-emerald-400" aria-hidden />
          {method === "card" ? "Thẻ nạp gần đây" : "Lịch sử nạp ngân hàng"}
        </h3>
        <HistoryList
          key={method}
          rows={rows}
          empty={
            method === "card"
              ? "Chưa có lịch sử nạp thẻ nào."
              : "Chưa có lịch sử nạp ngân hàng nào."
          }
        />
      </div>
    ) : null;

  return (
    <div className="w-full bg-[#111111] border border-white/5 rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 lg:p-10 relative min-h-0 sm:min-h-[750px]">
      <div>
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
            <QrCode size={24} className="shrink-0 text-[#e13d3f]" aria-hidden />
            Nạp tiền vào tài khoản
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            {autoEnabled
              ? "Tiền sẽ được hệ thống tự động cộng 24/7."
              : "Tiền được cộng vào ví ngay khi shop xác nhận."}
          </p>
        </div>

        {tabs.length === 0 ? (
          <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-sm font-bold text-white">Tạm ngưng nhận nạp tiền</p>
            <p className="mt-1.5 text-sm text-neutral-500">
              Shop đang tạm dừng cả nạp ngân hàng và thẻ cào. Số dư sẵn có trong ví vẫn dùng
              để mua hàng bình thường.
            </p>
          </div>
        ) : (
          <>
            {/* The method switch: one sliding lozenge under two labels. */}
            <div
              role="tablist"
              aria-label="Phương thức nạp"
              className="relative p-1.5 bg-black/40 border border-white/10 rounded-[20px] sm:rounded-[24px] flex mb-8 w-full backdrop-blur-xl"
            >
              <div
                aria-hidden
                className={`absolute top-1.5 bottom-1.5 left-1.5 rounded-[14px] sm:rounded-[18px] bg-emerald-500/10 border border-emerald-500/30 transition-transform duration-300 motion-reduce:transition-none ${
                  tabs.length > 1 ? "w-[calc(50%-6px)]" : "w-[calc(100%-12px)]"
                } ${method === "card" && tabs.length > 1 ? "translate-x-full" : "translate-x-0"}`}
              />
              {tabs.map((tab) => {
                const on = method === tab.value;
                const tone = on ? "text-emerald-400" : "text-neutral-500";
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => switchTo(tab.value)}
                    className="relative z-10 flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 cursor-pointer text-center group transition-all"
                  >
                    <tab.icon size={18} className={tone} aria-hidden />
                    <span
                      className={`text-xs sm:text-sm font-black uppercase tracking-wider transition-colors duration-300 ${tone}`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {method === "bank" && unpaid ? (
              <div className="mb-6 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CircleAlert size={20} className="text-yellow-500 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <h4 className="text-sm font-bold text-yellow-500 mb-1">Đơn nạp tiền đang chờ xử lý</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Bạn có một hóa đơn <strong className="text-white">{formatVnd(unpaid.amount)}đ</strong>{" "}
                      chưa hoàn tất.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/wallet/${unpaid.code}`}
                  className="shrink-0 w-full sm:w-auto text-center bg-yellow-500 text-black font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Tiếp tục thanh toán
                </Link>
              </div>
            ) : null}

            {method === "bank" && !bankReady ? (
              <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                <p className="text-sm font-bold text-white">Chưa nhận được chuyển khoản</p>
                <p className="mt-1.5 text-sm text-neutral-500">
                  Shop chưa khai báo tài khoản ngân hàng nhận tiền. Vui lòng dùng thẻ cào hoặc
                  liên hệ shop qua Zalo.
                </p>
              </div>
            ) : method === "bank" ? (
              <div className="w-full mt-4">
                <form
                  onSubmit={handleSubmit}
                  className="sm:bg-[#111111] sm:border sm:border-white/5 rounded-[24px] p-0 sm:p-10 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/[0.03] border border-white/10 rounded-[14px] sm:rounded-2xl flex items-center justify-center shrink-0">
                      <Wallet className="text-white w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-none mb-1 sm:mb-0">
                        Số tiền nạp
                      </h3>
                      <p className="text-[11px] sm:text-sm text-neutral-500 font-medium sm:mt-0.5 leading-relaxed">
                        Nạp từ {formatVnd(minAmount)}đ trở lên. Miễn phí giao dịch.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="relative group">
                      {/* State keeps bare digits (presets and submit read it
                          as a number); only the field shows them grouped —
                          50000 reads as 50.000 the moment it is typed. */}
                      <input
                        type="text"
                        aria-label="Số tiền nạp"
                        value={amount ? formatVnd(Number(amount)) : ""}
                        onChange={(event) =>
                          setAmount(event.target.value.replace(/\D/g, "").slice(0, 12))
                        }
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0"
                        className="w-full bg-transparent border-b-2 border-white/10 hover:border-white/30 focus:border-white pb-4 pr-16 sm:pr-20 text-4xl sm:text-6xl font-black text-white focus:outline-none transition-colors tracking-tighter placeholder:text-neutral-800"
                      />
                      <div
                        className={`absolute right-0 bottom-6 font-bold text-lg sm:text-2xl transition-colors ${
                          amount ? "text-white/60" : "text-neutral-700"
                        }`}
                      >
                        VNĐ
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-2">
                      {presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(String(preset))}
                          className="w-full py-3 sm:py-2.5 rounded-xl sm:rounded-full font-bold text-xs sm:text-sm transition-colors duration-200 border bg-white/[0.02] border-white/5 hover:border-white/20 text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                        >
                          {formatVnd(preset)}
                        </button>
                      ))}
                    </div>

                    {errorLine}

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={pending || !bankAmountOk}
                        aria-busy={pending}
                        className="w-full bg-white hover:bg-neutral-200 text-black rounded-2xl py-4 font-black text-base transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                      >
                        {pending ? (
                          <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />
                        ) : null}
                        {pending ? "Đang tạo hóa đơn…" : "Tạo hóa đơn"}
                      </button>
                    </div>
                  </div>
                </form>

                <p className="text-center text-xs text-neutral-500 mt-6 flex items-center justify-center gap-2 font-medium">
                  <span
                    aria-hidden
                    className={`w-2 h-2 rounded-full ${autoEnabled ? "bg-emerald-500" : "bg-amber-500"}`}
                  />
                  {autoEnabled
                    ? "Hệ thống tự động xử lý hóa đơn 24/7"
                    : "Hóa đơn được shop đối soát và cộng tiền thủ công"}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="w-full mt-4 space-y-6">
                <div>
                  <span className={`${STEP} mb-3 block`}>1. Chọn nhà mạng</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
                    {CARRIERS.map((option) => {
                      const on = carrier === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCarrier(option.value)}
                          aria-pressed={on}
                          aria-label={option.label}
                          className={`relative group overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4 rounded-[16px] sm:rounded-[20px] border transition-all duration-300 ease-out ${
                            on
                              ? "bg-emerald-500/10 border-emerald-500"
                              : "bg-[#161616] border-white/5 hover:border-white/10 active:scale-[0.98]"
                          }`}
                        >
                          <div
                            aria-hidden
                            className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br to-transparent ${
                              on ? "from-emerald-500/10" : "from-white/5"
                            }`}
                          />
                          <div className="h-8 sm:h-10 w-full flex items-center justify-center relative z-10">
                            {/* A plain <img>, as menzu draws it: the mark
                                fills the box up to its height or 85% of its
                                width, whichever comes first. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={option.logo}
                              alt={option.label}
                              className={`max-h-full max-w-[85%] object-contain transition-all duration-300 ${
                                on ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                              }`}
                            />
                          </div>
                          <div
                            aria-hidden
                            className={`absolute top-2 right-2 transition-all duration-300 ${
                              on ? "opacity-100 scale-100" : "opacity-0 scale-50"
                            }`}
                          >
                            <span className="flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {carrier ? (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                      <span className={`${STEP} whitespace-nowrap`}>2. Chọn mệnh giá</span>
                      <span className="text-red-400 font-normal text-[11px] bg-red-500/10 px-2.5 py-0.5 rounded-full w-fit whitespace-nowrap">
                        Lưu ý: Chọn sai mệnh giá sẽ mất thẻ
                      </span>
                    </div>
                    {/* Each tile says what the wallet gets: the customer
                        knows the figure before sending the card, not from the
                        ledger afterwards. */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {cardPresets.map((preset) => {
                        const on = amount === String(preset);
                        const rate = cardRateFor(preset, cardRates, cardFee);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(String(preset))}
                            aria-pressed={on}
                            className={`relative overflow-hidden p-3 rounded-xl border text-center transition-colors duration-200 ${
                              on
                                ? "bg-emerald-500/10 border-emerald-500"
                                : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.05]"
                            }`}
                          >
                            {rate > 0 ? (
                              <div className="absolute top-0 right-0 bg-rose-500/20 text-rose-400 text-[8px] font-bold px-1 py-[3px] leading-none rounded-bl-md border-b border-l border-rose-500/20">
                                {feeBadge(rate)}
                              </div>
                            ) : null}
                            <p
                              className={`text-sm font-black mt-1 ${
                                on ? "text-emerald-400" : "text-white"
                              }`}
                            >
                              {formatVnd(preset)} đ
                            </p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">
                              Nhận:{" "}
                              <span className="text-emerald-500 font-bold">
                                {formatVnd(cardNet(preset, cardRates, cardFee))} đ
                              </span>
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* The card itself. Typed here rather than sent to the shop
                    over chat: the request then carries everything the desk
                    needs. */}
                {carrier && cardAmountOk ? (
                  <div className="animate-in fade-in zoom-in-95 duration-200 sm:bg-[#111111] sm:border sm:border-white/5 p-0 sm:p-5 rounded-[24px] mt-6">
                    <span className={`${STEP} mb-4 block`}>3. Thông tin mã thẻ</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <CardNumberField
                        id="card-pin"
                        label="Mã Thẻ (PIN)"
                        placeholder="Nhập mã thẻ..."
                        value={pin}
                        onChange={setPin}
                      />
                      <CardNumberField
                        id="card-serial"
                        label="Số Serial"
                        placeholder="Nhập số serial..."
                        value={serial}
                        onChange={setSerial}
                      />
                    </div>

                    {errorLine ? <div className="mb-4">{errorLine}</div> : null}

                    <button
                      type="submit"
                      disabled={pending || !cardReady}
                      aria-busy={pending}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl py-4 font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.99]"
                    >
                      {pending ? (
                        <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden />
                      ) : (
                        <CreditCard size={17} aria-hidden />
                      )}
                      {pending ? "Đang gửi thẻ…" : `Nạp ${carrierLabel} ${formatVnd(Number(amount))} đ`}
                    </button>
                  </div>
                ) : null}
              </form>
            )}
          </>
        )}

        {ledger}
      </div>

      {credited ? (
        <TopUpDialog
          tone="green"
          title="Nạp tiền thành công"
          action={{ label: "Xong", onClick: dismissCredited }}
          onClose={dismissCredited}
        >
          <CreditedLines credited={credited.credited} face={credited.amount} />
        </TopUpDialog>
      ) : null}
    </div>
  );
}
