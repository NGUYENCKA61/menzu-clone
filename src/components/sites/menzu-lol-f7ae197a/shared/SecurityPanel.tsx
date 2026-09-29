"use client";

import {
  Check,
  CircleAlert,
  CircleCheck,
  Globe,
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  Plus,
  Save,
  Send,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DiscordMark, GoogleMark } from "./OAuthButtons";
import { TelegramGlyph } from "./BrandGlyphs";

/*
 * menzu's /security, measured off the live page on 29/09/2026 at the owner's
 * word ("sửa lại bảo mật tài khoản cho giống menzu", to be brought in line
 * with the rest of the site afterwards): the three tab buttons above the
 * panel, a title per tab inside it, and its cards, fields and rows class for
 * class. menzu's indigo is the shop's accent here, as its violet became on
 * /wallet. The email is proved with a mailed code as on menzu ("Gửi mã OTP"),
 * and moving to a new address also asks for the current password. What the
 * shop adds: Telegram beside Google and Discord, a first password for an
 * OAuth-only account, and "Đăng xuất" on each other device.
 */

type Tab = "security" | "linked" | "devices";

const TABS: { id: Tab; short: string; long: string; icon: typeof Save }[] = [
  { id: "security", short: "Bảo mật", long: "Bảo mật tài khoản", icon: Save },
  { id: "linked", short: "Liên kết", long: "Liên kết nền tảng", icon: Globe },
  { id: "devices", short: "Thiết bị", long: "Quản lý thiết bị", icon: Monitor },
];

const TAB_BASE =
  "flex-1 flex flex-col lg:flex-row justify-center items-center gap-1.5 lg:gap-2 p-2 sm:py-3.5 rounded-xl font-bold transition-colors";
const TAB_ACTIVE = `${TAB_BASE} bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)] border border-[var(--menzu-accent)]/20`;
const TAB_INACTIVE = `${TAB_BASE} bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/5 border border-white/5`;

const TITLE =
  "text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3";
const SUBTITLE = "text-xs sm:text-sm text-neutral-400 leading-relaxed";
const CARD = "relative bg-white/[0.02] border border-white/5 rounded-2xl p-6 lg:p-8 overflow-hidden group";
const CARD_TITLE = "text-sm font-bold text-white";
const FIELD =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white text-sm outline-none placeholder:text-neutral-600 focus:border-[var(--menzu-accent)]/50 transition-colors disabled:opacity-50";

function Notice({ tone, children }: { tone: "ok" | "err"; children: string }) {
  return (
    <p
      role="alert"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-[13px] font-medium ${
        tone === "ok"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
      }`}
    >
      {tone === "ok" ? (
        <Check size={16} className="shrink-0" aria-hidden />
      ) : (
        <CircleAlert size={16} className="shrink-0" aria-hidden />
      )}
      {children}
    </p>
  );
}

/** One live login, as much as the browser is allowed to know about it. */
export interface SessionView {
  /** The token's tail — never the token, which is the login itself. */
  key: string;
  /** "Chrome trên Windows 10/11", parsed server-side from the User-Agent. */
  device: string;
  ip: string | null;
  /** "Thốt Nốt, Vietnam", or null while unresolved. */
  location: string | null;
  /** "13:34 - 21/08/2026". */
  when: string;
  current: boolean;
}

export interface SecurityPanelProps {
  email?: string | null;
  /** The address on file was proved: by a code typed back, or by Google. */
  emailVerified?: boolean;
  /** False for an account that arrived through Google or Discord and has
   *  never set one — the form then asks for no current password, because
   *  there is none to give. */
  hasPassword: boolean;
  googleLinked: boolean;
  discordLinked: boolean;
  /** True once the provider's keys sit in Cấu hình. */
  googleEnabled: boolean;
  discordEnabled: boolean;
  /**
   * Telegram is not an OAuth door: the link is a signed t.me URL the shop bot
   * verifies, and "linked" is the telegramId on the user row rather than an
   * oauth_links entry. Empty when the shop has no bot configured.
   */
  telegramUrl?: string | null;
  telegramLinked?: boolean;
  sessions: SessionView[];
  /** The OAuth callback lands with ?linked= — open on that tab. */
  initialTab?: Tab;
  linkNotice?: { tone: "ok" | "err"; text: string } | null;
}

/** A phone reads as a phone; everything else as menzu's laptop. */
function isPhone(device: string): boolean {
  return /android|iphone|ipad|ios|điện thoại/i.test(device);
}

export function SecurityPanel({
  email,
  emailVerified = false,
  hasPassword,
  googleLinked,
  discordLinked,
  googleEnabled,
  discordEnabled,
  telegramUrl = null,
  telegramLinked = false,
  sessions,
  initialTab = "security",
  linkNotice = null,
}: SecurityPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  const [emailValue, setEmailValue] = useState(email ?? "");
  /** Where the last code went; set, the code row shows under the address. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  /** Asked for on a change of address: this address is what "Quên mật khẩu"
   *  mails to, and the code alone proves the inbox, not the person. */
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState<"send" | "verify" | null>(null);
  /** Seconds until "Gửi lại mã" works again. */
  const [cooldown, setCooldown] = useState(0);
  const [emailMsg, setEmailMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const onFile = (email ?? "").toLowerCase();
  const alreadyProved = emailVerified && emailValue.trim().toLowerCase() === onFile;
  const needsPassword = hasPassword && sentTo !== null && sentTo.toLowerCase() !== onFile;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  /** "all" while "Đăng xuất phiên khác" runs, else the row being signed out. */
  const [devBusy, setDevBusy] = useState<string | null>(null);
  const [devMsg, setDevMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  /** "Gửi mã OTP": a six-digit code to the address typed. */
  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    if (emailBusy || cooldown > 0) return;
    setEmailBusy("send");
    setEmailMsg(null);
    try {
      const res = await fetch("/api/account/email/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
        ttlMinutes?: number;
        retryAfter?: number;
      };
      if (data.retryAfter) setCooldown(data.retryAfter);
      if (!res.ok || !data.email) {
        setEmailMsg({ tone: "err", text: data.error ?? "Không gửi được mã xác minh" });
        return;
      }
      setSentTo(data.email);
      setOtp("");
      setEmailMsg({
        tone: "ok",
        text: `Đã gửi mã 6 số tới ${data.email}. Mã có hiệu lực ${data.ttlMinutes ?? 10} phút.`,
      });
    } catch {
      setEmailMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setEmailBusy(null);
    }
  }

  /** The code typed back; right, and the address is the account's, proved. */
  async function verifyOtp() {
    if (emailBusy) return;
    setEmailBusy("verify");
    setEmailMsg(null);
    try {
      const res = await fetch("/api/account/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: otp, password: emailPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; email?: string };
      if (!res.ok) {
        setEmailMsg({ tone: "err", text: data.error ?? "Không xác minh được email" });
        return;
      }
      setSentTo(null);
      setOtp("");
      setEmailPassword("");
      // Nothing left to resend: the address is proved.
      setCooldown(0);
      setEmailMsg({ tone: "ok", text: "Đã xác minh email." });
      router.refresh();
    } catch {
      setEmailMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setEmailBusy(null);
    }
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    if (pwBusy) return;
    setPwBusy(true);
    setPwMsg(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
          confirmPassword: confirm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setPwMsg({ tone: "err", text: data.error ?? "Không đổi được mật khẩu" });
        return;
      }

      // Every session was invalidated, including this one.
      setPwMsg({
        tone: "ok",
        text: "Đã đổi mật khẩu. Vui lòng đăng nhập lại.",
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      window.setTimeout(() => {
        router.refresh();
        router.push("/login");
      }, 1500);
    } catch {
      setPwMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setPwBusy(false);
    }
  }

  /** Every session but this one, or one row's (by its key). */
  async function signOut(key: string | null) {
    if (devBusy) return;
    setDevBusy(key ?? "all");
    setDevMsg(null);
    try {
      const res = await fetch(
        "/api/account/sessions",
        key
          ? {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ key }),
            }
          : { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        dropped?: number;
        error?: string;
      };
      if (!res.ok) {
        setDevMsg({ tone: "err", text: data.error ?? "Không đăng xuất được" });
        return;
      }
      setDevMsg({
        tone: "ok",
        text: key
          ? "Đã đăng xuất thiết bị."
          : data.dropped && data.dropped > 0
            ? `Đã đăng xuất ${data.dropped} thiết bị khác.`
            : "Không có thiết bị nào khác đang đăng nhập.",
      });
      router.refresh();
    } catch {
      setDevMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setDevBusy(null);
    }
  }

  /** Google and Discord as menzu lists them, then the shop's Telegram bot. */
  const platforms = [
    {
      key: "google",
      name: "Google",
      linked: googleLinked,
      href: googleEnabled ? "/api/auth/google?next=%2Fsecurity" : null,
      external: false,
      tile: "group-hover:bg-white/10",
      mark: (linked: boolean) => (
        <GoogleMark
          className={`w-6 h-6 ${linked ? "" : "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"}`}
        />
      ),
    },
    {
      key: "discord",
      name: "Discord",
      linked: discordLinked,
      href: discordEnabled ? "/api/auth/discord?next=%2Fsecurity" : null,
      external: false,
      tile: "group-hover:bg-[#5865F2]/10 group-hover:border-[#5865F2]/20",
      mark: (linked: boolean) => (
        <DiscordMark
          className={`w-6 h-6 ${linked ? "text-[#5865F2]" : "text-neutral-500 group-hover:text-[#5865F2]"}`}
        />
      ),
    },
    {
      key: "telegram",
      name: "Telegram",
      linked: telegramLinked,
      // Leaves the site for the bot, so it opens in a new tab.
      href: telegramUrl,
      external: true,
      tile: "group-hover:bg-[#29a9eb]/10 group-hover:border-[#29a9eb]/20",
      mark: (linked: boolean) => (
        <TelegramGlyph
          className={`w-6 h-6 ${linked ? "text-[#29a9eb]" : "text-neutral-500 group-hover:text-[#29a9eb]"}`}
        />
      ),
    },
  ];

  const header = (title: string, Icon: typeof Save, subtitle: string) => (
    <div className="mb-2 relative z-10">
      <h1 className={TITLE}>
        <Icon className="text-[var(--menzu-accent)]" aria-hidden />
        {title}
      </h1>
      <p className={SUBTITLE}>{subtitle}</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col pb-6 min-h-[70vh]">
      <div role="tablist" aria-label="Bảo mật" className="flex w-full gap-2 pb-4 mb-6 border-b border-white/5">
        {TABS.map(({ id, short, long, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={tab === id ? TAB_ACTIVE : TAB_INACTIVE}
          >
            <Icon className="w-5 h-5 lg:w-[18px] lg:h-[18px]" aria-hidden />
            <span className="text-[11px] sm:text-xs lg:text-sm whitespace-nowrap">
              <span className="lg:hidden">{short}</span>
              <span className="hidden lg:inline">{long}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="w-full bg-transparent sm:bg-[#111111] border-none sm:border sm:border-white/5 rounded-none sm:rounded-[24px] p-0 sm:p-8 lg:p-10 relative min-h-0 sm:min-h-[500px]">
        {tab === "security" ? (
          <div className="flex flex-col gap-8">
            {header(
              "Bảo mật tài khoản",
              Save,
              "Cập nhật thông tin đăng nhập và quản lý mật khẩu của bạn.",
            )}

            {/* menzu's email card: the address and "Gửi mã OTP"; the code row opens
                under it once a code is out (POST /api/account/email/otp, then
                /verify). A change of address also asks for the current
                password there — see the verify route for why. */}
            <form onSubmit={sendOtp} className={CARD}>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  {/* A heading, not a label: it titles the whole form. */}
                  <h3 className={CARD_TITLE}>Địa chỉ Email</h3>
                  {email && emailVerified ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                      <CircleCheck size={12} aria-hidden />
                      Đã xác minh
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-yellow-500/10 text-[11px] font-bold text-yellow-400 border border-yellow-500/20">
                      <CircleAlert size={12} aria-hidden />
                      {email ? "Chưa xác minh" : "Chưa có email"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label htmlFor="sec-email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="sec-email"
                    type="email"
                    autoComplete="email"
                    value={emailValue}
                    onChange={(e) => {
                      setEmailValue(e.target.value);
                      // A code went to the old spelling; a new one is needed.
                      if (sentTo) setSentTo(null);
                    }}
                    placeholder="Nhập email mới của bạn"
                    className={`flex-1 ${FIELD}`}
                  />
                  <button
                    type="submit"
                    disabled={emailBusy !== null || cooldown > 0 || !emailValue.trim() || alreadyProved}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:bg-white/5 text-white font-bold px-6 py-3 text-xs whitespace-nowrap transition-colors disabled:text-neutral-500"
                  >
                    {emailBusy === "send" ? (
                      <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <Send size={16} aria-hidden />
                    )}
                    {cooldown > 0
                      ? `Gửi lại sau ${cooldown}s`
                      : sentTo
                        ? "Gửi lại mã"
                        : "Gửi mã OTP"}
                  </button>
                </div>

                {sentTo ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label htmlFor="sec-otp" className="sr-only">
                      Mã xác minh
                    </label>
                    <input
                      id="sec-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Nhập mã OTP 6 số"
                      // The digits spaced out once typed; the placeholder reads normally.
                      className={`flex-1 ${FIELD} ${otp ? "font-mono tracking-[0.3em]" : ""}`}
                    />
                    {needsPassword ? (
                      <>
                        <label htmlFor="sec-email-pw" className="sr-only">
                          Mật khẩu hiện tại
                        </label>
                        <input
                          id="sec-email-pw"
                          type="password"
                          autoComplete="current-password"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          placeholder="Mật khẩu hiện tại"
                          className={`${FIELD} sm:w-56`}
                        />
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={emailBusy !== null || otp.length !== 6}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:bg-white/5 text-white font-bold px-6 py-3 text-xs whitespace-nowrap transition-colors disabled:text-neutral-500"
                    >
                      {emailBusy === "verify" ? (
                        <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
                      ) : (
                        <Check size={16} aria-hidden />
                      )}
                      Xác nhận
                    </button>
                  </div>
                ) : null}

                {emailMsg ? <Notice tone={emailMsg.tone}>{emailMsg.text}</Notice> : null}
              </div>
            </form>

            <form onSubmit={submitPassword} className={CARD}>
              <div className="flex flex-col gap-6">
                <h3 className={CARD_TITLE}>{hasPassword ? "Đổi Mật Khẩu" : "Đặt Mật Khẩu"}</h3>
                {/* Every field carries its own label, visually hidden: the
                    design shows only placeholders, and a placeholder is not a
                    label — it disappears the moment you start typing. */}
                <div className="flex flex-col gap-4">
                  {hasPassword ? (
                    <>
                      <label htmlFor="sec-current" className="sr-only">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        id="sec-current"
                        type="password"
                        autoComplete="current-password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                        className={FIELD}
                      />
                    </>
                  ) : (
                    // Signed in through Google or Discord and never set one.
                    // Asking for a current password here was a door with no
                    // key: the field could never be filled.
                    <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[13px] leading-relaxed text-neutral-400">
                      Tài khoản này đăng nhập bằng Google/Discord nên chưa có mật khẩu. Đặt một mật
                      khẩu để đăng nhập được cả hai cách.
                    </p>
                  )}
                  <label htmlFor="sec-next" className="sr-only">
                    Mật khẩu mới
                  </label>
                  <input
                    id="sec-next"
                    type="password"
                    autoComplete="new-password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className={FIELD}
                  />
                  <label htmlFor="sec-confirm" className="sr-only">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="sec-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Xác nhận lại mật khẩu mới"
                    className={FIELD}
                  />
                </div>
                {pwMsg ? <Notice tone={pwMsg.tone}>{pwMsg.text}</Notice> : null}
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="w-full bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:bg-[var(--menzu-accent)]/50 text-white font-bold rounded-xl py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {pwBusy ? (
                    <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
                  ) : null}
                  {pwBusy ? "Đang xử lý…" : hasPassword ? "Đổi Mật Khẩu" : "Đặt Mật Khẩu"}
                </button>
              </div>
            </form>
          </div>
        ) : tab === "linked" ? (
          <div className="flex flex-col gap-8">
            {header(
              "Liên kết nền tảng",
              Globe,
              "Quản lý các tài khoản mạng xã hội được liên kết với hồ sơ của bạn để đăng nhập nhanh chóng.",
            )}

            {linkNotice ? <Notice tone={linkNotice.tone}>{linkNotice.text}</Notice> : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {platforms.map((platform) => {
                // A door only when it leads somewhere: not linked yet, and
                // the provider's keys (or the shop bot) are set in Cấu hình.
                const door = !platform.linked && Boolean(platform.href);
                const status = platform.linked
                  ? "Đã liên kết"
                  : platform.href
                    ? "Chưa liên kết"
                    : "Chưa mở";
                const body = (
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl shrink-0 border border-white/5 ${door ? platform.tile : ""}`}
                    >
                      {platform.mark(platform.linked)}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`font-bold text-base ${platform.linked ? "text-white" : "text-neutral-300 group-hover:text-white"}`}
                      >
                        {platform.name}
                      </span>
                      <span
                        className={`text-xs font-medium ${platform.linked ? "text-emerald-400" : "text-neutral-500"}`}
                      >
                        {status}
                      </span>
                    </div>
                    <div
                      className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center ${
                        platform.linked
                          ? "bg-emerald-500/15 text-emerald-400"
                          : door
                            ? "bg-white/5 text-neutral-400 group-hover:bg-[var(--menzu-accent)] group-hover:text-white"
                            : "bg-white/5 text-neutral-600"
                      }`}
                    >
                      {platform.linked ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
                    </div>
                  </div>
                );
                const shell = "flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5";
                return door ? (
                  <a
                    key={platform.key}
                    href={platform.href!}
                    {...(platform.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`${shell} hover:border-white/10 group`}
                  >
                    {body}
                  </a>
                ) : (
                  <div
                    key={platform.key}
                    className={shell}
                    title={
                      platform.linked
                        ? undefined
                        : "Chưa bật — shop chưa cấu hình kết nối này"
                    }
                  >
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-2 relative z-10">
              <div>
                <h1 className={TITLE}>
                  <Monitor className="text-[var(--menzu-accent)]" aria-hidden />
                  Thiết bị hoạt động
                </h1>
                <p className={SUBTITLE}>
                  Kiểm tra các phiên đăng nhập, địa chỉ IP và đăng xuất khỏi các thiết bị đáng ngờ.
                </p>
              </div>
              {/* Only has work to do once a second session exists. */}
              <button
                type="button"
                onClick={() => signOut(null)}
                disabled={devBusy !== null || sessions.length <= 1}
                className="bg-white/[0.02] hover:bg-red-500/10 text-neutral-300 hover:text-red-400 border border-white/5 hover:border-red-500/30 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {devBusy === "all" ? (
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
                ) : (
                  <LogOut size={16} aria-hidden />
                )}
                Đăng xuất phiên khác
              </button>
            </div>

            {devMsg ? <Notice tone={devMsg.tone}>{devMsg.text}</Notice> : null}

            <div className="flex flex-col gap-3">
              {sessions.map((session) => {
                const DeviceIcon = isPhone(session.device) ? Smartphone : Laptop;
                return (
                  <div
                    key={session.key}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border ${
                      session.current
                        ? "border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/[0.02]"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          session.current
                            ? "bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]"
                            : "bg-white/5 text-neutral-400"
                        }`}
                      >
                        <DeviceIcon aria-hidden />
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                          <span className="font-bold text-white text-sm sm:text-base break-words">
                            {session.device}
                          </span>
                          {session.current ? (
                            <span className="w-fit px-2 py-0.5 rounded-md bg-[var(--menzu-accent)]/20 text-[var(--menzu-accent)] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-[var(--menzu-accent)]/30">
                              Thiết bị hiện tại
                            </span>
                          ) : null}
                        </div>
                        {/* IP, place, time — the dots only between the
                            parts a session actually has. */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2 text-[11px] sm:text-xs text-neutral-500 mt-0.5">
                          {[
                            session.ip ? (
                              <span key="ip" className="flex items-center gap-1.5 font-medium text-neutral-400">
                                <Globe size={12} className="shrink-0" aria-hidden />
                                {session.ip}
                              </span>
                            ) : null,
                            session.location ? <span key="place">{session.location}</span> : null,
                            <span key="when">{session.when}</span>,
                          ]
                            .filter(Boolean)
                            .flatMap((part, index) =>
                              index === 0
                                ? [part]
                                : [
                                    <span
                                      key={`dot-${index}`}
                                      aria-hidden
                                      className="hidden sm:block w-1 h-1 rounded-full bg-neutral-700 shrink-0"
                                    />,
                                    part,
                                  ],
                            )}
                        </div>
                      </div>
                    </div>
                    {session.current ? null : (
                      <button
                        type="button"
                        title="Đăng xuất thiết bị"
                        onClick={() => signOut(session.key)}
                        disabled={devBusy !== null}
                        className="px-4 py-3 bg-white/5 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 rounded-xl shrink-0 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-bold"
                      >
                        {devBusy === session.key ? (
                          <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
                        ) : (
                          <LogOut size={16} aria-hidden />
                        )}
                        Đăng xuất
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
