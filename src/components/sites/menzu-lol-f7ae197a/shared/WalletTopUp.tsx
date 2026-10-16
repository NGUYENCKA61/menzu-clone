"use client";

import {
  CircleAlert,
  Clipboard,
  CreditCard,
  Hourglass,
  Loader2,
  QrCode,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { CARD_DIGITS_MIN, cardNet, cardRateFor, msUntil, type CardRate } from "@/lib/topup";

import { AccountPanel } from "./AccountPanel";
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
 * Built off menzu's /wallet on 28/09/2026, then resized to this shop's own
 * account pages on 29/09 (the owner: "không theo chuẩn menzu"). The colours
 * are still menzu's: its green on the tab, the chosen carrier and
 * denomination and the card button, and the white bank button — changing
 * them is the owner's call, still open.
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
  // The open bank invoice whose hold window ran out while this screen was up:
  // it stops locking the form then, without a reload. One timer to the
  // deadline rather than the shared per-second clock, which would re-render
  // this whole desk every second for a single moment of interest.
  const [lapsed, setLapsed] = useState<string | null>(null);
  // The newest transfer still waiting to be paid.
  const waitingBank = history.find((row) => row.status === "PENDING" && row.method !== "CARD") ?? null;
  const holdCode = waitingBank?.code;
  const holdUntil = waitingBank?.expiresAt;
  useEffect(() => {
    if (!holdCode || !holdUntil) return;
    const timer = window.setTimeout(() => setLapsed(holdCode), msUntil(holdUntil));
    return () => window.clearTimeout(timer);
  }, [holdCode, holdUntil]);

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
    // Turned down: the strips above the forms are server-rendered and still
    // count it as waiting; the refresh is what takes it off them.
    else router.refresh();
  });

  /**
   * Reload once the customer has read the receipt: the balance in the header
   * and the strips above the forms were rendered before the money arrived.
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
        /** Set when the refusal is an invoice still open (opened elsewhere,
         *  say another tab): the refresh brings its strip and lock here. */
        openCode?: string;
      };

      if (!response.ok || !data.invoiceCode) {
        setError(data.error ?? "Không tạo được hóa đơn");
        setPending(false);
        if (data.openCode) router.refresh();
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

  // A refusal in menzu's shape, as the owner asked on 29/09/2026 ("thông báo
  // kiểu này"): a red box with its mark, at the head of the bank form.
  const errorLine = error ? (
    <p
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 text-[13px] font-medium text-red-400"
    >
      <CircleAlert size={16} className="shrink-0" aria-hidden />
      {error}
    </p>
  ) : null;

  const tabs: { value: Method; label: string; icon: typeof CreditCard }[] = [
    ...(bankEnabled ? [{ value: "bank" as const, label: "Ngân Hàng", icon: CreditCard }] : []),
    ...(cardEnabled ? [{ value: "card" as const, label: "Thẻ Cào", icon: QrCode }] : []),
  ];

  // No history lists here any more: every request — waiting, turned down,
  // overdue, dropped, credited — is on /transactions beside the ledger (the
  // owner, 29/09/2026: "đem nó vào lịch sử giao dịch", then the card list
  // too). What stays is what the customer can still act on, as a strip above
  // each form.
  // The open transfer, in front of the customer above the form. While it is
  // open no second one can start: the route refuses it (openBankTopUp) and
  // the form says so in its red box. Once its hold window runs out on this
  // screen, the strip goes without a reload.
  const unpaid = waitingBank && lapsed !== waitingBank.code ? waitingBank : null;
  // Cards still with the desk, newest first: the newest one's invoice is a
  // click away, and any others are counted.
  const checking = history.filter((row) => row.status === "PENDING" && row.method === "CARD");
  const newestCard = checking[0] ?? null;

  return (
    // The account area's own panel (Tổng quan, Bảo mật…), with the sidebar's
    // Wallet mark: the owner, 29/09, "tự restyle lại cho hợp web mình".
    <AccountPanel
      icon={Wallet}
      title="Nạp tiền vào tài khoản"
      subtitle={
        autoEnabled
          ? "Tiền sẽ được hệ thống tự động cộng 24/7."
          : "Tiền được cộng vào ví ngay khi shop xác nhận."
      }
    >
      <div>

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
              className="relative p-1.5 bg-black/40 border border-white/10 rounded-2xl flex mb-6 w-full backdrop-blur-xl"
            >
              <div
                aria-hidden
                className={`absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 transition-transform duration-300 motion-reduce:transition-none ${
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
                    className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 cursor-pointer text-center group transition-all"
                  >
                    <tab.icon size={16} className={tone} aria-hidden />
                    <span
                      className={`text-xs font-black uppercase tracking-widest transition-colors duration-300 ${tone}`}
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
                      chưa hoàn tất
                      {unpaid.expiresAt ? (
                        <>
                          {" "}
                          (còn{" "}
                          <strong className="text-white tabular-nums">
                            <TopUpCountdown deadline={unpaid.expiresAt} />
                          </strong>
                          )
                        </>
                      ) : null}
                      . Thanh toán hoặc hủy hóa đơn này để tạo hóa đơn mới.
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

            {/* The card tab's own strip, in the bank one's colours: a card
                the desk is still checking, and the way back to its invoice,
                where the outcome arrives. */}
            {method === "card" && newestCard ? (
              <div className="mb-6 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Hourglass size={20} className="text-yellow-500 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <h4 className="text-sm font-bold text-yellow-500 mb-1">Thẻ đang được kiểm tra</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Thẻ{" "}
                      <strong className="text-white">
                        {newestCard.carrier ?? "cào"} {formatVnd(newestCard.amount)}đ
                      </strong>
                      {checking.length > 1 ? ` và ${checking.length - 1} thẻ khác` : ""} đang chờ đối
                      soát.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/wallet/${newestCard.code}`}
                  className="shrink-0 w-full sm:w-auto text-center bg-yellow-500 text-black font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Xem hóa đơn
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
                  className="sm:bg-white/[0.02] sm:border sm:border-white/5 rounded-2xl p-0 sm:p-6 transition-all"
                >
                  {/* A card header the way Bảo mật's cards read: title and
                      hint on one line, no icon tile (the page title carries
                      the Wallet mark now). */}
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-5">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Số tiền nạp</h3>
                    <p className="text-xs text-neutral-500">
                      Nạp từ {formatVnd(minAmount)}đ trở lên. Miễn phí giao dịch.
                    </p>
                  </div>

                  {/* Under the header, above the amount, as menzu places it. */}
                  {errorLine ? <div className="mb-5">{errorLine}</div> : null}

                  <div className="space-y-6">
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
                        // 36px at most, the size of a price on our product
                        // page, the biggest money figure the site shows.
                        className="w-full bg-transparent border-b-2 border-white/10 hover:border-white/30 focus:border-white pb-3 pr-14 sm:pr-16 text-3xl sm:text-4xl font-black text-white focus:outline-none transition-colors tracking-tight placeholder:text-neutral-800"
                      />
                      <div
                        className={`absolute right-0 bottom-4 font-bold text-base sm:text-lg transition-colors ${
                          amount ? "text-white/60" : "text-neutral-700"
                        }`}
                      >
                        VNĐ
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
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

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={pending || !bankAmountOk}
                        aria-busy={pending}
                        className="w-full h-12 bg-white hover:bg-neutral-200 text-black rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                      >
                        {pending ? (
                          <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />
                        ) : null}
                        {pending ? "Đang tạo hóa đơn…" : "Tạo hóa đơn"}
                      </button>
                    </div>
                  </div>
                </form>

                <p className="text-center text-xs text-neutral-500 mt-4 flex items-center justify-center gap-2 font-medium">
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
                          className={`relative group overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 ease-out ${
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
                              // 9px, the smallest chip type the site uses
                              // (the ledger's method chip); 8px was below it.
                              <div className="absolute top-0 right-0 bg-rose-500/20 text-rose-400 text-[9px] font-bold px-1.5 py-[3px] leading-none rounded-bl-md border-b border-l border-rose-500/20">
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
                  <div className="animate-in fade-in zoom-in-95 duration-200 sm:bg-white/[0.02] sm:border sm:border-white/5 p-0 sm:p-5 rounded-2xl mt-6">
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
                      className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.99]"
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
    </AccountPanel>
  );
}
