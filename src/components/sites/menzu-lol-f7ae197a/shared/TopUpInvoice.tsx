"use client";

import {
  Building2,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Hash,
  Hourglass,
  LoaderCircle,
  Smartphone,
  Ticket,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useState, type ReactNode } from "react";

import { formatCountdown } from "@/lib/topup";

import { BankAppPicker } from "./BankAppPicker";
import { ErrorModal } from "./ErrorModal";
import { formatVnd } from "./productData";
import { CreditedLines, TopUpDialog } from "./TopUpDialog";
import { carrierFor } from "./topUpCarriers";
import { useTimeLeft } from "./TopUpCountdown";
import { useTopUpWatch, type TopUpOutcome } from "./useTopUpWatch";

export interface BankAccount {
  code: string;
  name: string;
  account: string;
  holder: string;
}

export interface TopUpInvoiceProps {
  code: string;
  method: "BANK" | "CARD";
  /** What was asked for: the transfer amount, or the card's face value. */
  amount: number;
  /** What the wallet received, once it has; null before that. */
  credited: number | null;
  status: string;
  /** The desk's reason, on a refusal. */
  note: string | null;
  carrier: string | null;
  /** The last digits of the card's serial — enough to recognise it by. */
  serialTail: string | null;
  /** "15:44 - 28/09/2026", written on the server in the shop's clock. */
  createdAt: string;
  /** ISO: when the shop stops holding the request for its payer. */
  expiresAt: string;
  /** Whether it is recent and unsettled enough to keep asking about. */
  watch: boolean;
  /** What goes in the transfer description. */
  transferNote: string;
  /** Every account the shop can be paid into. */
  banks: BankAccount[];
  /** Whether a matched transfer credits the wallet without an admin. */
  autoEnabled: boolean;
  /** A card's fee and what the wallet gets for it, before it is credited. */
  cardPercent: number;
  cardCredit: number;
}

/*
 * Measured off menzu's /deposit page, pending, paid and cancelled, colours
 * included: green while waiting and once paid, red once gone. Its violet
 * transfer note is #e13d3f here — menzu's violet-500 turned to red at the
 * same lightness and strength, where the shop's #ff3158 read as neon.
 */
const PANEL =
  "w-full bg-gradient-to-b from-[#141414] to-[#0a0a0a] border border-white/[0.08] rounded-[24px] p-5 sm:p-6 lg:p-8 flex flex-col relative group overflow-hidden";
const FIELD =
  "bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors";
const LABEL =
  "text-neutral-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-1.5";
const COPY =
  "flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white transition-all active:scale-95 w-full sm:w-auto";
const ROW =
  "w-full flex justify-between items-center bg-black/40 border border-white/[0.05] shadow-inner rounded-[16px] px-5 py-4 mb-6";
const BAR =
  "w-full bg-gradient-to-r border rounded-[16px] px-6 py-4 flex items-center justify-center gap-3 relative overflow-hidden";

/** What each state paints the status panel with. */
const LOOK = {
  wait: {
    seal: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-400",
    bar: "from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    line: "via-emerald-400/20",
  },
  paid: {
    seal: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-500",
    bar: "from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    line: "via-emerald-400/20",
  },
  gone: {
    seal: "bg-red-500/10 border-red-500/20",
    text: "text-red-500",
    bar: "from-red-500/5 via-red-500/10 to-red-500/5 border-red-500/20",
    line: "via-red-400/20",
  },
  late: {
    seal: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-400",
    bar: "from-amber-500/5 via-amber-500/10 to-amber-500/5 border-amber-500/20",
    line: "via-amber-400/20",
  },
} as const;

type Sheet = "paid" | "cancelled" | "failed" | "apps" | null;

/** A fee as the shop writes it: "20,5". */
function percent(rate: number): string {
  return String(rate).replace(".", ",");
}

/** One read-only detail: a small grey label over the value. */
function Detail({
  icon: Icon,
  label,
  children,
  upper = false,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  upper?: boolean;
}) {
  return (
    <div className={`${FIELD} min-w-0 p-4`}>
      <span className={LABEL}>
        <Icon size={14} aria-hidden />
        {label}
      </span>
      <span
        className={`block truncate text-white font-bold text-sm sm:text-base ${upper ? "uppercase tracking-wide" : ""}`}
      >
        {children}
      </span>
    </div>
  );
}

/** COPY, which answers for a moment with a tick. */
function CopyButton({
  done,
  onCopy,
  label,
  accent = false,
}: {
  done: boolean;
  onCopy: () => void;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={done ? `Đã copy ${label}` : `Copy ${label}`}
      className={`${COPY} ${
        accent
          ? "z-10 bg-[#e13d3f] hover:bg-[#e13d3f]/90"
          : "bg-white/10 hover:bg-white/20"
      }`}
    >
      {done ? <Check size={16} strokeWidth={3} aria-hidden /> : <Copy size={16} aria-hidden />}
      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
        {done ? "Đã copy" : "Copy"}
      </span>
    </button>
  );
}

/** The hairline menzu draws along the top and bottom of a live status bar. */
function BarLines({ tint }: { tint: string }) {
  return (
    <>
      <div
        aria-hidden
        className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent ${tint} to-transparent`}
      />
      <div
        aria-hidden
        className={`absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent ${tint} to-transparent`}
      />
    </>
  );
}

/**
 * One top-up request as its own page, the way menzu shows an invoice.
 *
 * Opened straight after the form creates the request, and again from its row
 * in the history, so the transfer details survive a reload and a closed tab.
 * While the request is unsettled the page asks after it every ten seconds;
 * the answer turns the status panel and puts up the matching sheet.
 */
export function TopUpInvoice({
  code,
  method,
  amount,
  credited,
  status: storedStatus,
  note: storedNote,
  carrier,
  serialTail,
  createdAt,
  expiresAt,
  watch,
  transferNote,
  banks,
  autoEnabled,
  cardPercent,
  cardCredit,
}: TopUpInvoiceProps) {
  const router = useRouter();
  // Which account the customer says they will transfer to. It only decides
  // which details and QR are drawn — reconciliation reads every account, so
  // paying the other one still settles the request.
  const [bankIndex, setBankIndex] = useState(0);
  const bank = banks[bankIndex] ?? banks[0] ?? null;
  const [copied, setCopied] = useState<string | null>(null);
  /** The QR picture comes from a third party. Until it lands the frame says
   *  so; if it never does, the frame says that too, with a way to try again. */
  const [qr, setQr] = useState<"loading" | "ready" | "failed">("loading");
  const [qrTry, setQrTry] = useState(0);
  const [outcome, setOutcome] = useState<TopUpOutcome | null>(null);
  // menzu greets an invoice that is already gone with its red sheet.
  const [sheet, setSheet] = useState<Sheet>(
    storedStatus === "CANCELLED" ? "cancelled" : storedStatus === "FAILED" ? "failed" : null,
  );
  const [cancelling, setCancelling] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // What the poll learnt wins over what the server rendered: it is newer.
  const status = outcome?.status ?? storedStatus;
  const note = outcome?.note ?? storedNote;
  const open = status === "PENDING" || status === "EXPIRED";
  const isCard = method === "CARD";

  useTopUpWatch(watch && !outcome ? code : null, autoEnabled, (result) => {
    setOutcome(result);
    setSheet(result.status === "COMPLETED" ? "paid" : "failed");
  });

  // Running out is not a refusal — a late transfer still credits — so this
  // only changes what the panel says, never what the page does.
  const timeLeft = useTimeLeft(open ? expiresAt : null);
  const overdue = status === "EXPIRED" || (timeLeft !== null && timeLeft <= 0);
  const [minutes, seconds] =
    timeLeft === null ? ["--", "--"] : formatCountdown(timeLeft).split(":");

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied((now) => (now === label ? null : now)), 1500);
    } catch {
      // Clipboard is blocked on insecure origins; the value is on screen to
      // read anyway, so this is not worth an error message.
    }
  }

  /**
   * Withdraws the request. The server refuses anything already settled, so a
   * transfer that landed a moment ago is safe: the refusal says so. Told
   * after, not asked before: the owner found the question a nag.
   */
  async function cancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      const response = await fetch("/api/wallet/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setFailure(data?.error ?? "Không hủy được lệnh, thử lại sau");
        return;
      }
      setSheet("cancelled");
      // The status panel is server-rendered; refresh so it reads Đã Hủy.
      router.refresh();
    } catch {
      setFailure("Không kết nối được máy chủ");
    } finally {
      setCancelling(false);
    }
  }

  const carrierMark = carrierFor(carrier);
  const again = isCard ? "/wallet?method=card" : "/wallet";
  // The QR panel: a bank request still open, with somewhere to pay into.
  const paying = !isCard && open && bank !== null;

  // ——— The details panel: what to type, or what was sent ———
  const details = isCard ? (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Detail icon={Ticket} label="Nhà mạng">
          {carrierMark ? (
            <Image
              src={carrierMark.logo}
              alt={carrierMark.label}
              width={160}
              height={40}
              style={{ height: Math.round(carrierMark.height * 1.25) }}
              className="w-auto max-w-full object-contain"
            />
          ) : (
            (carrier ?? "Thẻ cào")
          )}
        </Detail>
        <Detail icon={CreditCard} label="Mệnh giá">
          <span className="tabular-nums">{formatVnd(amount)}đ</span>
        </Detail>
      </div>
      {serialTail ? (
        <div className="mb-4">
          <Detail icon={Hash} label="Số serial">
            <span className="font-mono tracking-wider">•••• {serialTail}</span>
          </Detail>
        </div>
      ) : null}
      {/* The one figure the customer is promised, where the transfer note
          sits on a bank invoice. */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-5 sm:p-6 mb-8 sm:mb-10 relative overflow-hidden">
        <div aria-hidden className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <span className="text-emerald-500/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
          <Wallet size={14} aria-hidden />
          Thực nhận về ví
        </span>
        <span className="block text-emerald-500 font-bold text-xl sm:text-2xl tracking-wide tabular-nums">
          {formatVnd(credited ?? cardCredit)}đ
        </span>
        {cardPercent > 0 ? (
          <span className="mt-1 block text-xs text-neutral-500">
            Đã trừ chiết khấu {percent(cardPercent)}%
          </span>
        ) : null}
      </div>
    </>
  ) : bank ? (
    <>
      {banks.length > 1 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-neutral-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            Chuyển vào
          </span>
          {banks.map((option, index) => (
            <button
              key={`${option.code}-${option.account}`}
              type="button"
              onClick={() => {
                if (index === bankIndex) return;
                setBankIndex(index);
                setQr("loading");
              }}
              aria-pressed={index === bankIndex}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                index === bankIndex
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white"
              }`}
            >
              {option.name || option.code}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Detail icon={Building2} label="Ngân hàng">
          {bank.name || bank.code}
        </Detail>
        <Detail icon={User} label="Chủ tài khoản" upper>
          {bank.holder}
        </Detail>
      </div>

      <div
        className={`${FIELD} group p-4 sm:p-5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
      >
        <div className="min-w-0">
          <span className={LABEL}>
            <CreditCard size={14} aria-hidden />
            Số tài khoản
          </span>
          <span className="block truncate text-white font-bold text-lg sm:text-xl tracking-wide">
            {bank.account}
          </span>
        </div>
        <CopyButton
          label="số tài khoản"
          done={copied === "account"}
          onCopy={() => copy("account", bank.account)}
        />
      </div>

      {/* The one line that decides whose money it is. */}
      <div className="bg-gradient-to-r from-[#e13d3f]/10 to-transparent border border-[#e13d3f]/20 rounded-2xl p-5 sm:p-6 mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div aria-hidden className="absolute top-0 left-0 w-1 h-full bg-[#e13d3f]" />
        <div className="min-w-0">
          <span className="text-[#e13d3f]/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
            <FileText size={14} aria-hidden />
            Nội dung nạp (bắt buộc)
          </span>
          <span className="block truncate text-[#e13d3f] font-bold text-xl sm:text-2xl tracking-wide">
            {transferNote}
          </span>
        </div>
        <CopyButton
          label="nội dung nạp"
          accent
          done={copied === "note"}
          onCopy={() => copy("note", transferNote)}
        />
      </div>
    </>
  ) : (
    <p className={`${FIELD} mb-8 p-5 text-sm text-neutral-400`}>
      Shop chưa khai báo tài khoản ngân hàng nhận tiền. Liên hệ shop qua Zalo kèm mã lệnh{" "}
      <span className="font-mono font-bold text-white">{code}</span>.
    </p>
  );

  // ——— The status panel ———
  let status_panel: ReactNode;
  if (paying && bank) {
    const look = overdue ? LOOK.late : LOOK.wait;
    status_panel = (
      <>
        <div className={ROW}>
          <span className="text-neutral-400 font-medium text-xs sm:text-sm">Thời gian còn lại</span>
          <div className="flex items-center gap-2">
            <Clock size={16} className={look.text} aria-hidden />
            <span className="text-white font-mono font-bold text-xl sm:text-2xl tracking-tight">
              {minutes}:{seconds}
            </span>
          </div>
        </div>

        {/* VietQR renders the bank, account, amount and description into one
            scan. Plain <img>: it is a third-party URL and adding it to
            next/image's allow-list would be config for one picture. */}
        <div className="relative mb-6 w-full max-w-[240px]">
          <div
            className={`relative bg-white rounded-[24px] w-full aspect-square border-[4px] ${
              overdue ? "border-amber-400/80" : "border-emerald-400/80"
            } group overflow-hidden flex items-center justify-center`}
          >
            {qr !== "failed" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${bankIndex}-${qrTry}`}
                src={`https://img.vietqr.io/image/${encodeURIComponent(bank.code)}-${encodeURIComponent(bank.account)}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(bank.holder)}${qrTry ? `&r=${qrTry}` : ""}`}
                alt={`Mã QR chuyển khoản ${formatVnd(amount)}đ`}
                onLoad={() => setQr("ready")}
                onError={() => setQr("failed")}
                className={`max-w-[88%] max-h-[88%] object-contain block relative z-10 transition-opacity duration-500 ${
                  qr === "ready" ? "opacity-100" : "opacity-0"
                }`}
              />
            ) : null}
            {qr === "loading" ? (
              <LoaderCircle
                size={28}
                className="absolute animate-spin text-neutral-300 motion-reduce:animate-none"
                aria-label="Đang tạo mã QR"
              />
            ) : null}
            {qr === "failed" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
                <p className="text-xs leading-relaxed text-neutral-600">
                  Không tải được mã QR — vẫn chuyển khoản được bằng thông tin bên cạnh.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQr("loading");
                    setQrTry((n) => n + 1);
                  }}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-neutral-800"
                >
                  Thử lại
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="text-center mb-6 w-full">
          <p className="text-white font-bold text-lg sm:text-xl tracking-tight mb-2">
            {overdue ? "Hết thời gian giữ lệnh" : "Quét mã QR"}
          </p>
          <p className="text-neutral-500 text-xs leading-relaxed px-4">
            {overdue ? (
              <>
                Nếu bạn đã chuyển khoản, tiền vẫn được cộng khi shop nhận được.
                <br />
                Đừng chuyển lại lần nữa.
              </>
            ) : (
              <>
                Mở ứng dụng ngân hàng và quét mã.
                <br />
                Hệ thống tự động điền sẵn mọi thông tin.
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSheet("apps")}
          className="w-full bg-[#111111] hover:bg-[#1a1a1a] border border-white/10 rounded-[16px] p-4 flex items-center justify-between transition-colors mb-6 group/btn active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white group-hover/btn:bg-emerald-500/20 group-hover/btn:text-emerald-400 transition-colors">
              <Smartphone size={20} aria-hidden />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Mở App Ngân Hàng</p>
              <p className="text-neutral-500 text-[10px]">Tự động điền số tiền &amp; nội dung</p>
            </div>
          </div>
          <ChevronRight
            size={18}
            className="text-neutral-600 group-hover/btn:text-white transition-colors"
            aria-hidden
          />
        </button>

        <div className={`${BAR} ${look.bar}`}>
          <BarLines tint={look.line} />
          {overdue ? (
            <Hourglass size={20} className={look.text} aria-hidden />
          ) : (
            <LoaderCircle
              size={24}
              className={`animate-spin motion-reduce:animate-none ${look.text}`}
              aria-hidden
            />
          )}
          <span className={`${look.text} font-bold tracking-wide text-xs sm:text-sm`}>
            {overdue
              ? "Đã quá thời gian giữ lệnh"
              : autoEnabled
                ? "Đang chờ nhận tiền..."
                : "Đang chờ shop xác nhận..."}
          </span>
        </div>
      </>
    );
  } else {
    // Settled, or a card the desk is still checking: the date, a seal, a line.
    const refused = status === "FAILED";
    const kind =
      status === "COMPLETED"
        ? "paid"
        : refused || status === "CANCELLED"
          ? "gone"
          : "wait";
    const look = LOOK[kind];
    const Icon = kind === "paid" ? CircleCheck : kind === "gone" ? CircleX : LoaderCircle;
    const title =
      kind === "paid"
        ? "Đã Thanh Toán"
        : refused
          ? "Bị Từ Chối"
          : kind === "gone"
            ? "Đã Hủy"
            : "Đang Kiểm Tra Thẻ";
    const line =
      kind === "paid"
        ? "Hóa đơn này đã được xử lý thành công."
        : refused
          ? (note ??
            (isCard
              ? "Shop không nạp được thẻ này. Kiểm tra lại số seri và mã thẻ, hoặc liên hệ hỗ trợ kèm mã lệnh."
              : "Shop không xác nhận được lệnh nạp này. Liên hệ hỗ trợ kèm mã lệnh nếu bạn đã chuyển tiền."))
          : kind === "gone"
            ? "Hóa đơn này đã được hủy."
            : "Shop đang đối soát thẻ với nhà mạng. Tiền vào ví ngay khi thẻ hợp lệ.";
    const barText =
      kind === "paid"
        ? "Giao dịch đã hoàn tất"
        : refused
          ? "Giao dịch bị từ chối"
          : kind === "gone"
            ? "Giao dịch đã hủy"
            : "Đang chờ xử lý...";
    status_panel = (
      <>
        <div className={ROW}>
          <span className="text-neutral-400 font-medium text-xs sm:text-sm">Ngày khởi tạo</span>
          <span className="text-white font-mono font-bold text-xs sm:text-sm tracking-tight">
            {createdAt}
          </span>
        </div>

        <div className="flex-1 w-full flex flex-col items-center justify-center gap-6 mb-6">
          <div className={`w-32 h-32 ${look.seal} border rounded-full flex items-center justify-center`}>
            <Icon
              size={64}
              className={`${look.text} ${kind === "wait" ? "animate-spin motion-reduce:animate-none" : ""}`}
              aria-hidden
            />
          </div>
          <div className="text-center">
            <p className={`${look.text} font-black text-2xl mb-2`}>{title}</p>
            <p className="text-neutral-500 text-sm max-w-[320px] mx-auto">{line}</p>
          </div>
        </div>

        <div className={`${BAR} ${look.bar}`}>
          {kind === "wait" ? <BarLines tint={look.line} /> : null}
          <Icon
            size={18}
            className={`${look.text} ${kind === "wait" ? "animate-spin motion-reduce:animate-none" : ""}`}
            aria-hidden
          />
          <span className={`${look.text} font-bold tracking-wide text-xs sm:text-sm`}>{barText}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col-reverse lg:flex-row gap-4 lg:gap-6">
        <section className={`${PANEL} flex-[1.4]`}>
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          />
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 rounded-[16px] flex items-center justify-center shadow-inner">
              <Wallet size={20} className="text-white" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight mb-1">
                Chi tiết giao dịch
              </h2>
              {paying ? (
                <p className="text-neutral-500 text-[10px] sm:text-xs">
                  {autoEnabled
                    ? "Chuyển đúng nội dung để hệ thống tự động xử lý ngay lập tức."
                    : "Chuyển đúng nội dung để shop đối soát nhanh nhất."}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">{details}</div>

          <div className="pt-6 sm:pt-8 mt-4 border-t border-dashed border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 px-0 sm:px-4 sm:-mx-4">
            <span className="text-neutral-400 font-medium text-base sm:text-lg">
              {isCard ? "Mệnh giá thẻ" : "Số tiền thanh toán"}
            </span>
            <span className="text-white font-black text-4xl sm:text-6xl tracking-tighter sm:text-right mt-1 sm:mt-0 tabular-nums">
              {formatVnd(amount)} <span className="text-xl sm:text-3xl text-neutral-600 font-bold">đ</span>
            </span>
          </div>
        </section>

        <aside className={`${PANEL} flex-1 lg:max-w-[440px] items-center justify-between`}>
          {status_panel}
        </aside>
      </div>

      {/* The way out of an open request, under the panels where menzu keeps
          it. Gone once it is settled: nothing left to cancel. */}
      <div className="mt-8 flex items-center justify-end gap-4 px-2 sm:px-0">
        {open ? (
          <button
            type="button"
            onClick={cancel}
            disabled={cancelling}
            className="text-neutral-500 hover:text-[#ff4655] underline underline-offset-4 font-medium transition-colors text-sm disabled:cursor-wait disabled:opacity-60"
          >
            {cancelling ? "Đang hủy…" : "Hủy hóa đơn này"}
          </button>
        ) : null}
      </div>

      {sheet === "apps" && bank ? (
        <BankAppPicker
          bank={bank.code}
          account={bank.account}
          amount={amount}
          note={transferNote}
          holder={bank.holder}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === "paid" && outcome ? (
        <TopUpDialog
          tone="green"
          title="Nạp tiền thành công"
          // A full load, not a router push: the header's balance was drawn
          // before the money arrived.
          action={{ label: "Quay lại Ví của tôi", onClick: () => window.location.assign(again) }}
          onClose={() => setSheet(null)}
        >
          <CreditedLines credited={outcome.credited} face={outcome.amount} />
        </TopUpDialog>
      ) : null}

      {sheet === "cancelled" || sheet === "failed" ? (
        <TopUpDialog
          tone="red"
          title={sheet === "failed" ? "Giao dịch bị từ chối" : "Giao dịch đã hủy"}
          action={{ label: "Tạo đơn mới", href: again }}
          onClose={() => setSheet(null)}
        >
          {sheet === "failed"
            ? (note ?? "Shop không xác nhận được hóa đơn này. Liên hệ hỗ trợ kèm mã lệnh nếu cần.")
            : "Hóa đơn nạp tiền này đã được hủy."}
        </TopUpDialog>
      ) : null}

      {failure ? (
        <ErrorModal title="Không hủy được" message={failure} onClose={() => setFailure(null)} />
      ) : null}
    </>
  );
}
