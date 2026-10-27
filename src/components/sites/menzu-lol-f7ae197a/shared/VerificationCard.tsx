"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  PHONE_OTP_COOLDOWN_SECONDS,
  VERIFICATION_STATUS_LABEL,
  maskPhone,
  normalisePhone,
  type VerificationView,
} from "@/lib/verificationRules";

import { BankPicker } from "./BankPicker";

const CARD =
  "relative bg-white/[0.02] border border-line rounded-[14px] p-5 sm:p-6 overflow-hidden";
const CARD_TITLE = "text-[17px] font-bold text-frost";
const FIELD =
  "w-full rounded-[10px] border border-line bg-raise px-4 py-3 text-[15px] text-frost outline-none transition-colors placeholder:text-dim focus:border-white/40 disabled:opacity-60";
const LABEL =
  "mb-2 block text-[13px] font-medium text-mist";
const HINT = "mt-1.5 text-[13px] leading-relaxed text-dim";
const BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BUTTON} bg-[var(--menzu-accent-dark)] text-white hover:bg-[var(--menzu-accent)]`;
const QUIET = `${BUTTON} border border-line bg-raise text-frost hover:border-line-strong`;

type Otp =
  | { state: "idle" }
  /** A code issued: the customer is on Zalo sending it, and the form polls. */
  | {
      state: "pending";
      id: string;
      phone: string;
      message: string;
      expiresAt: string;
    }
  | { state: "verified"; phone: string }
  | { state: "failed"; phone: string; error: string };

const POLL_MS = 3000;

function when(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A numbered step heading, as the free tool's "Cách nhận key" draws them. */
function Step({
  index,
  title,
  done,
}: {
  index: number;
  title: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
          done
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-raise text-frost ring-1 ring-inset ring-line"
        }`}
      >
        {done ? <Check size={13} aria-hidden /> : index}
      </span>
      <span className="text-[15px] font-semibold text-frost">{title}</span>
    </div>
  );
}

function Line({ tone, text }: { tone: "ok" | "err" | "wait"; text: string }) {
  const Icon = tone === "ok" ? Check : tone === "wait" ? Clock : CircleAlert;
  return (
    <p
      role={tone === "err" ? "alert" : undefined}
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${
        tone === "ok"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : tone === "wait"
            ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
            : "border-red-500/20 bg-red-500/10 text-red-300"
      }`}
    >
      <Icon size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

/** The facts of a bid, as the customer's own page repeats them. */
function Summary({
  request,
}: {
  request: NonNullable<VerificationView["request"]>;
}) {
  const rows: [string, string][] = [
    ["Facebook", `${request.facebookName}, ${request.facebookUrl}`],
    ["Zalo", request.zaloName ?? "Đã liên kết"],
    ["Số điện thoại", maskPhone(request.phone)],
    [
      "Ngân hàng",
      `${request.bankName}, ${request.bankAccountMasked}, ${request.accountHolder}`,
    ],
    ["Gửi lúc", when(request.createdAt)],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-[140px_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[13px] font-semibold text-neutral-500 sm:pt-0.5">
            {k}
          </dt>
          <dd className="break-all text-neutral-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Bảo mật › Xác thực cấp 2 (the owner, 12/10/2026: "cần liên kết Facebook
 * Zalo chính chủ và số điện thoại có otp và duyệt bởi admin kèm tk ngân
 * hàng khớp với tk chuyển và tên fb"). The level and the latest bid on top;
 * under it the form, in four steps, until a bid is waiting or approved.
 *
 * The phone step runs the other way round from a usual OTP (the owner,
 * 15/10/2026: "cái đảo chiều đc đó"): the web shows the code and the customer
 * sends it to the shop's Zalo bot from the linked Zalo, as the link code is
 * sent. The bot never writes first, so the spare personal account it runs on
 * is not seen messaging strangers; the form polls until the code has arrived.
 */
export function VerificationCard({
  view,
  botPhone,
  botName,
  onGoLinked,
}: {
  view: VerificationView;
  /** The bot's own number from Cấu hình, where the customer sends the code. */
  botPhone: string | null;
  /** How the shop named that account; blank falls back to the number. */
  botName: string;
  /** Opens the Liên kết tab, where Zalo is linked. */
  onGoLinked: () => void;
}) {
  const router = useRouter();
  const last = view.request;
  const again = last?.status === "REJECTED" ? last : null;
  const [fbUrl, setFbUrl] = useState(again?.facebookUrl ?? "");
  const [fbName, setFbName] = useState(again?.facebookName ?? "");
  const [phone, setPhone] = useState(again?.phone ?? "");
  const [otp, setOtp] = useState<Otp>({ state: "idle" });
  const [copied, setCopied] = useState(false);
  /** The number the server has accepted a code for, if any. */
  const [proved, setProved] = useState<string | null>(null);
  const [bankName, setBankName] = useState(again?.bankName ?? "");
  const [bankAccount, setBankAccount] = useState("");
  const [holder, setHolder] = useState(again?.accountHolder ?? "");
  const [busy, setBusy] = useState<"code" | "submit" | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // The wait on the customer and the bot: ask every few seconds whether the
  // code has come back from the linked Zalo.
  useEffect(() => {
    if (otp.state !== "pending") return;
    const { id, phone: number } = otp;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/account/verification/phone?id=${encodeURIComponent(id)}`,
          { cache: "no-store" },
        );
        const data = (await res.json().catch(() => null)) as {
          state?: string;
          error?: string | null;
        } | null;
        if (data?.state === "verified") {
          setProved(number);
          setPhone(number);
          setOtp({ state: "verified", phone: number });
        } else if (data?.state === "failed" || data?.state === "missing") {
          setOtp({
            state: "failed",
            phone: number,
            error: data.error ?? "Chưa xác minh được số, bấm Lấy mã khác.",
          });
        }
      } catch {
        // A blip: ask again next time.
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [otp]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const phoneNow = normalisePhone(phone);
  const phoneProved = proved !== null && proved === phoneNow;

  async function getCode() {
    setBusy("code");
    setError(null);
    try {
      const res = await fetch("/api/account/verification/phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json().catch(() => null)) as {
        id?: string;
        phone?: string;
        message?: string;
        expiresAt?: string;
        retryAfter?: number;
        error?: string;
      } | null;
      if (
        !res.ok ||
        !data?.id ||
        !data.phone ||
        !data.message ||
        !data.expiresAt
      ) {
        setError(data?.error ?? "Không lấy được mã, thử lại sau.");
        return;
      }
      setCopied(false);
      setOtp({
        state: "pending",
        id: data.id,
        phone: data.phone,
        message: data.message,
        expiresAt: data.expiresAt,
      });
      setCooldown(data.retryAfter ?? PHONE_OTP_COOLDOWN_SECONDS);
    } catch {
      setError("Mất kết nối, thử lại sau.");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (otp.state !== "pending") return;
    try {
      await navigator.clipboard.writeText(otp.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard: the code is on screen to type.
    }
  }

  async function submit() {
    setBusy("submit");
    setError(null);
    try {
      const res = await fetch("/api/account/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          facebookUrl: fbUrl,
          facebookName: fbName,
          phone,
          bankName,
          bankAccount,
          accountHolder: holder,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Chưa gửi được hồ sơ, thử lại sau.");
        return;
      }
      // The page re-reads the bid: it is the shop's to answer now.
      router.refresh();
    } catch {
      setError("Mất kết nối, thử lại sau.");
    } finally {
      setBusy(null);
    }
  }

  const canSubmit =
    view.zaloLinked &&
    phoneProved &&
    fbUrl.trim() !== "" &&
    fbName.trim() !== "" &&
    bankName !== "" &&
    bankAccount.trim() !== "" &&
    holder.trim() !== "";

  const level2 = view.level === 2;
  const waiting = !level2 && last?.status === "PENDING";
  const botLabel = botName.trim() || botPhone || "bot Zalo của shop";

  return (
    <div className="flex flex-col gap-6">
      {/* The level, and what it means. */}
      <section className={CARD}>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${
              level2
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/[0.04] text-neutral-300"
            }`}
          >
            <BadgeCheck size={13} aria-hidden />
            {level2 ? "Cấp 2, đã xác thực" : "Cấp 1, chưa xác thực"}
          </span>
          {waiting ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[12px] font-semibold text-amber-300">
              <Clock size={13} aria-hidden />
              {VERIFICATION_STATUS_LABEL.PENDING}
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-[72ch] text-[15px] leading-relaxed text-mist">
          {level2
            ? `Shop đã xác thực tài khoản của bạn${view.verifiedAt ? ` từ ${when(view.verifiedAt)}` : ""}. Bạn thuê được cả những bản hack chỉ dành cho tài khoản cấp 2.`
            : "Một số bản hack đặc biệt chỉ bán cho tài khoản xác thực cấp 2. Để lên cấp 2 bạn cần: Zalo đã liên kết, Facebook chính chủ, số điện thoại của Zalo đó (xác minh bằng một tin nhắn bạn gửi cho bot), và tài khoản ngân hàng đứng tên bạn (trùng với tài khoản bạn chuyển khoản nạp tiền). Shop duyệt tay, thường trong 24 giờ."}
        </p>
      </section>

      {level2 && last?.status === "APPROVED" ? (
        <section className={CARD}>
          <h2 className={CARD_TITLE}>Hồ sơ đã duyệt</h2>
          <div className="mt-4">
            <Summary request={last} />
          </div>
        </section>
      ) : waiting && last ? (
        <section className={CARD}>
          <h2 className={CARD_TITLE}>Hồ sơ đang chờ duyệt</h2>
          <div className="mt-4 flex flex-col gap-4">
            <Line
              tone="wait"
              text="Shop đang xem hồ sơ của bạn. Có kết quả, bạn nhận thông báo trên web và qua Zalo đã liên kết."
            />
            <Summary request={last} />
          </div>
        </section>
      ) : level2 ? null : (
        <section className={CARD}>
          <h2 className={CARD_TITLE}>Gửi hồ sơ xác thực</h2>
          {again ? (
            <div className="mt-4">
              <Line
                tone="err"
                text={`Hồ sơ gửi ${when(again.createdAt)} chưa được duyệt${again.note ? `: ${again.note.replace(/[.!]+$/, "")}` : ""}. Sửa lại rồi gửi lại.`}
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-6">
            {/* 1. Zalo */}
            <div className="flex flex-col gap-3">
              <Step index={1} title="Liên kết Zalo" done={view.zaloLinked} />
              {view.zaloLinked ? (
                <p className="flex items-center gap-2 text-[12px] text-emerald-400">
                  <MessageCircle size={14} aria-hidden />
                  Đã liên kết{view.zaloName ? ` với ${view.zaloName}` : ""}. Số
                  điện thoại được xác minh qua Zalo này.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[12px] text-neutral-400">
                    Lấy mã ở mục Liên kết nền tảng rồi nhắn cho bot Zalo của
                    shop.
                  </p>
                  <button type="button" onClick={onGoLinked} className={QUIET}>
                    Liên kết Zalo
                  </button>
                </div>
              )}
            </div>

            {/* 2. Facebook */}
            <div className="flex flex-col gap-3">
              <Step index={2} title="Facebook chính chủ" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="verify-fb-url" className={LABEL}>
                    Link trang cá nhân
                  </label>
                  <input
                    id="verify-fb-url"
                    value={fbUrl}
                    onChange={(event) => setFbUrl(event.target.value)}
                    placeholder="https://facebook.com/ten.cua.ban"
                    autoComplete="off"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="verify-fb-name" className={LABEL}>
                    Tên hiển thị trên Facebook
                  </label>
                  <input
                    id="verify-fb-name"
                    value={fbName}
                    onChange={(event) => setFbName(event.target.value)}
                    placeholder="VD: Nguyễn Văn An"
                    autoComplete="off"
                    className={FIELD}
                  />
                </div>
              </div>
              <p className={HINT}>
                Shop đối chiếu tên Facebook với tên chủ tài khoản ngân hàng.
              </p>
            </div>

            {/* 3. Phone: the code goes from the customer to the bot. */}
            <div className="flex flex-col gap-3">
              <Step index={3} title="Số điện thoại" done={phoneProved} />
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label htmlFor="verify-phone" className={LABEL}>
                    Số điện thoại của Zalo đã liên kết
                  </label>
                  <input
                    id="verify-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="09xxxxxxxx"
                    inputMode="tel"
                    autoComplete="tel"
                    disabled={phoneProved}
                    className={FIELD}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void getCode()}
                  disabled={
                    busy !== null ||
                    !view.zaloLinked ||
                    !view.botOnline ||
                    !botPhone ||
                    phoneProved ||
                    cooldown > 0 ||
                    phoneNow.length < 10
                  }
                  className={QUIET}
                >
                  {busy === "code" ? (
                    <Loader2
                      size={14}
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden
                    />
                  ) : (
                    <KeyRound size={14} aria-hidden />
                  )}
                  {cooldown > 0
                    ? `Lấy mã khác (${cooldown}s)`
                    : otp.state === "idle"
                      ? "Lấy mã"
                      : "Lấy mã khác"}
                </button>
              </div>
              {!view.botOnline && !phoneProved ? (
                <Line
                  tone="wait"
                  text="Kênh Zalo của shop đang bảo trì nên chưa xác minh số được lúc này. Bạn quay lại sau nhé."
                />
              ) : !botPhone && !phoneProved ? (
                <Line
                  tone="wait"
                  text="Shop chưa cài số Zalo của bot nên chưa xác minh số được lúc này. Bạn quay lại sau nhé."
                />
              ) : null}
              {phoneProved ? (
                <Line
                  tone="ok"
                  text={`Đã xác minh số ${maskPhone(phoneNow)} qua Zalo.`}
                />
              ) : otp.state === "failed" ? (
                <Line tone="err" text={otp.error} />
              ) : otp.state === "pending" ? (
                // One sentence and one waiting line, no numbers inside a
                // numbered step (the owner, 15/10/2026: "mấy ô số có AI quá").
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[14px] leading-relaxed text-neutral-300">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    <span>
                      Mở Zalo của số {maskPhone(otp.phone)}, nhắn cho{" "}
                      <a
                        href={`https://zalo.me/${botPhone ?? ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-white underline underline-offset-2"
                      >
                        {botLabel}
                      </a>
                      {botName.trim() && botPhone ? (
                        <span className="text-neutral-500"> ({botPhone})</span>
                      ) : null}{" "}
                      đúng nội dung
                    </span>
                    <code className="rounded-lg border border-white/10 bg-neutral-950/60 px-2.5 py-1 font-mono text-sm font-bold tracking-widest text-white">
                      {otp.message}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copy()}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-400 transition-colors hover:text-white"
                    >
                      {copied ? (
                        <Check size={14} aria-hidden />
                      ) : (
                        <Copy size={14} aria-hidden />
                      )}
                      {copied ? "Đã chép" : "Sao chép"}
                    </button>
                  </p>
                  <p className="flex items-center gap-2 text-[12px] text-neutral-400">
                    <Loader2
                      size={14}
                      className="shrink-0 animate-spin text-amber-200 motion-reduce:animate-none"
                      aria-hidden
                    />
                    <span>
                      Đang chờ bot trả lời, bước này sẽ tự xanh. Mã dùng đến{" "}
                      {clock(otp.expiresAt)}, chỉ nhận từ Zalo đã liên kết.
                    </span>
                  </p>
                </div>
              ) : null}
            </div>

            {/* 4. Bank */}
            <div className="flex flex-col gap-3">
              <Step index={4} title="Tài khoản ngân hàng" />
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="verify-bank" className={LABEL}>
                    Ngân hàng
                  </label>
                  <BankPicker
                    id="verify-bank"
                    value={bankName}
                    onChange={setBankName}
                  />
                </div>
                <div>
                  <label htmlFor="verify-account" className={LABEL}>
                    Số tài khoản
                  </label>
                  <input
                    id="verify-account"
                    value={bankAccount}
                    onChange={(event) => setBankAccount(event.target.value)}
                    placeholder="Chỉ số"
                    inputMode="numeric"
                    autoComplete="off"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="verify-holder" className={LABEL}>
                    Tên chủ tài khoản
                  </label>
                  <input
                    id="verify-holder"
                    value={holder}
                    onChange={(event) => setHolder(event.target.value)}
                    placeholder="NGUYEN VAN AN"
                    autoComplete="off"
                    className={`${FIELD} uppercase`}
                  />
                </div>
              </div>
              <p className={HINT}>
                Tài khoản bạn dùng để chuyển khoản nạp tiền. Tên phải trùng với
                tên trên Facebook.
              </p>
            </div>

            {error ? <Line tone="err" text={error} /> : null}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy !== null || !canSubmit}
              className={`${PRIMARY} h-12 w-full`}
            >
              {busy === "submit" ? (
                <Loader2
                  size={14}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <BadgeCheck size={16} aria-hidden />
              )}
              Gửi hồ sơ xác thực
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
