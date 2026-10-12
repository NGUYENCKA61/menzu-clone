"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  Clock,
  Loader2,
  MessageCircle,
  Send,
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
  "relative bg-white/[0.02] border border-white/5 rounded-2xl p-5 sm:p-6 overflow-hidden";
const CARD_TITLE = "text-sm font-black uppercase tracking-wider text-white";
const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--menzu-accent)]/60 disabled:opacity-60";
const LABEL =
  "mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500";
const HINT = "mt-1.5 text-[11px] leading-relaxed text-neutral-500";
const BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[11px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BUTTON} bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]`;
const QUIET = `${BUTTON} border border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/25 hover:text-white`;

type Otp =
  | { state: "idle" }
  | { state: "pending"; id: string; phone: string }
  | { state: "sent"; id: string; phone: string }
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
            : "bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)]"
        }`}
      >
        {done ? <Check size={13} aria-hidden /> : index}
      </span>
      <span className="text-[13px] font-bold text-white">{title}</span>
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
    ["Facebook", `${request.facebookName} · ${request.facebookUrl}`],
    ["Zalo", request.zaloName ?? "Đã liên kết"],
    ["Số điện thoại", maskPhone(request.phone)],
    [
      "Ngân hàng",
      `${request.bankName} · ${request.bankAccountMasked} · ${request.accountHolder}`,
    ],
    ["Gửi lúc", when(request.createdAt)],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-[140px_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[11px] font-black uppercase tracking-widest text-neutral-500 sm:pt-0.5">
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
 */
export function VerificationCard({
  view,
  onGoLinked,
}: {
  view: VerificationView;
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
  const [code, setCode] = useState("");
  /** The number the server has accepted a code for, if any. */
  const [proved, setProved] = useState<string | null>(null);
  const [bankName, setBankName] = useState(again?.bankName ?? "");
  const [bankAccount, setBankAccount] = useState("");
  const [holder, setHolder] = useState(again?.accountHolder ?? "");
  const [busy, setBusy] = useState<"send" | "verify" | "submit" | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // The wait on the bot: ask every few seconds whether the code went out.
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
        if (data?.state === "sent")
          setOtp({ state: "sent", id, phone: number });
        else if (data?.state === "failed" || data?.state === "missing") {
          setOtp({
            state: "failed",
            phone: number,
            error: data.error ?? "Chưa gửi được mã, bấm Gửi mã lại.",
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

  async function sendCode() {
    setBusy("send");
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
        retryAfter?: number;
        error?: string;
      } | null;
      if (!res.ok || !data?.id || !data.phone) {
        setError(data?.error ?? "Không gửi được mã, thử lại sau.");
        return;
      }
      setCode("");
      setOtp({ state: "pending", id: data.id, phone: data.phone });
      setCooldown(data.retryAfter ?? PHONE_OTP_COOLDOWN_SECONDS);
    } catch {
      setError("Mất kết nối, thử lại sau.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmCode() {
    setBusy("verify");
    setError(null);
    try {
      const res = await fetch("/api/account/verification/phone/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as {
        phone?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.phone) {
        setError(data?.error ?? "Mã không đúng.");
        return;
      }
      setProved(data.phone);
      setPhone(data.phone);
      setOtp({ state: "idle" });
    } catch {
      setError("Mất kết nối, thử lại sau.");
    } finally {
      setBusy(null);
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

  return (
    <div className="flex flex-col gap-6">
      {/* The level, and what it means. */}
      <section className={CARD}>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
              level2
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/[0.04] text-neutral-300"
            }`}
          >
            <BadgeCheck size={13} aria-hidden />
            {level2 ? "Cấp 2 · Đã xác thực" : "Cấp 1 · Chưa xác thực"}
          </span>
          {waiting ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
              <Clock size={13} aria-hidden />
              {VERIFICATION_STATUS_LABEL.PENDING}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">
          {level2
            ? `Shop đã xác thực tài khoản của bạn${view.verifiedAt ? ` từ ${when(view.verifiedAt)}` : ""}. Bạn thuê được cả những bản hack chỉ dành cho tài khoản cấp 2.`
            : "Một số bản hack đặc biệt chỉ bán cho tài khoản xác thực cấp 2. Để lên cấp 2 bạn cần: Zalo đã liên kết, Facebook chính chủ, số điện thoại nhận mã qua Zalo, và tài khoản ngân hàng đứng tên bạn (trùng với tài khoản bạn chuyển khoản nạp tiền). Shop duyệt tay, thường trong 24 giờ."}
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
                  Đã liên kết{view.zaloName ? ` với ${view.zaloName}` : ""}. Mã
                  xác thực số điện thoại gửi vào Zalo này.
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

            {/* 3. Phone */}
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
                  onClick={() => void sendCode()}
                  disabled={
                    busy !== null ||
                    !view.zaloLinked ||
                    !view.botOnline ||
                    phoneProved ||
                    cooldown > 0 ||
                    phoneNow.length < 10
                  }
                  className={QUIET}
                >
                  {busy === "send" ? (
                    <Loader2
                      size={14}
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden
                    />
                  ) : (
                    <Send size={14} aria-hidden />
                  )}
                  {cooldown > 0 ? `Gửi lại (${cooldown}s)` : "Gửi mã qua Zalo"}
                </button>
              </div>
              {!view.botOnline && !phoneProved ? (
                <Line
                  tone="wait"
                  text="Bot Zalo của shop đang không chạy nên chưa gửi mã được lúc này. Bạn quay lại sau nhé."
                />
              ) : null}
              {phoneProved ? (
                <Line
                  tone="ok"
                  text={`Đã xác minh số ${maskPhone(phoneNow)}.`}
                />
              ) : otp.state === "pending" ? (
                <p className="flex items-center gap-2 text-[12px] text-amber-200">
                  <Loader2
                    size={14}
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                  Bot đang kiểm tra số {maskPhone(otp.phone)} và gửi mã vào
                  Zalo…
                </p>
              ) : otp.state === "failed" ? (
                <Line tone="err" text={otp.error} />
              ) : null}
              {otp.state === "sent" || otp.state === "pending" ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <label htmlFor="verify-code" className={LABEL}>
                      Mã 6 số từ Zalo
                    </label>
                    <input
                      id="verify-code"
                      value={code}
                      onChange={(event) =>
                        setCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className={`${FIELD} font-mono tracking-[0.3em]`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void confirmCode()}
                    disabled={busy !== null || code.length !== 6}
                    className={PRIMARY}
                  >
                    {busy === "verify" ? (
                      <Loader2
                        size={14}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                    ) : null}
                    Xác nhận
                  </button>
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
