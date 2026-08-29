"use client";

import { Check, Globe, Laptop, Link2, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DiscordMark, GoogleMark } from "./OAuthButtons";

type Tab = "security" | "linked" | "devices";

const TABS: { id: Tab; label: string; icon: typeof ShieldCheck }[] = [
  { id: "security", label: "Bảo mật", icon: ShieldCheck },
  { id: "linked", label: "Liên kết", icon: Link2 },
  { id: "devices", label: "Thiết bị", icon: MonitorSmartphone },
];

const TAB_ACTIVE =
  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--menzu-accent)] text-white transition-colors";
const TAB_INACTIVE =
  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

// Quiet shells on purpose: four stacked form fields in red outlines read as
// four warnings. The red treatment stays on the single search boxes only.
const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-600";
/** The overview page's card header pair. */
const CARD_TITLE = "text-sm font-black uppercase tracking-wider text-white";
const CARD_HINT = "text-xs text-neutral-500";
const SUBMIT =
  "self-start h-10 px-5 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-70 disabled:cursor-wait transition-colors text-[11px] font-black uppercase tracking-widest text-white";

function Notice({ tone, children }: { tone: "ok" | "err"; children: string }) {
  return (
    <p
      role="alert"
      className={
        tone === "ok"
          ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
          : "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
      }
    >
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
  googleLinked: boolean;
  discordLinked: boolean;
  /** True once the provider's keys sit in Cấu hình. */
  googleEnabled: boolean;
  discordEnabled: boolean;
  sessions: SessionView[];
  /** The OAuth callback lands with ?linked= — open on that tab. */
  initialTab?: Tab;
  linkNotice?: { tone: "ok" | "err"; text: string } | null;
}

export function SecurityPanel({
  email,
  googleLinked,
  discordLinked,
  googleEnabled,
  discordEnabled,
  sessions,
  initialTab = "security",
  linkNotice = null,
}: SecurityPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  const [emailValue, setEmailValue] = useState(email ?? "");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [devBusy, setDevBusy] = useState(false);
  const [devMsg, setDevMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const providers = [
    {
      key: "discord",
      name: "Discord",
      perk: "Nhận thông báo đơn hàng",
      linked: discordLinked,
      enabled: discordEnabled,
      mark: <DiscordMark className="w-5 h-5 text-[#5865F2]" />,
    },
    {
      key: "google",
      name: "Google",
      perk: "Đăng nhập nhanh hơn",
      linked: googleLinked,
      enabled: googleEnabled,
      mark: <GoogleMark className="w-5 h-5" />,
    },
  ] as const;

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    if (emailBusy) return;
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setEmailMsg(
        res.ok
          ? { tone: "ok", text: "Đã cập nhật email" }
          : { tone: "err", text: data.error ?? "Không cập nhật được email" },
      );
      if (res.ok) router.refresh();
    } catch {
      setEmailMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setEmailBusy(false);
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

  async function revokeOthers() {
    if (devBusy) return;
    setDevBusy(true);
    setDevMsg(null);
    try {
      const res = await fetch("/api/account/sessions", { method: "POST" });
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
        text:
          data.dropped && data.dropped > 0
            ? `Đã đăng xuất ${data.dropped} thiết bị khác.`
            : "Không có thiết bị nào khác đang đăng nhập.",
      });
      router.refresh();
    } catch {
      setDevMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setDevBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={tab === id ? TAB_ACTIVE : TAB_INACTIVE}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "security" ? (
        <div className="flex flex-col gap-4">
          <form
            onSubmit={submitEmail}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-3"
          >
            {/* A heading, not a label: it titles the whole form. Used as a
                label it would have announced the input as "Địa chỉ Email"
                while saying nothing about what to type. */}
            {/* The live site verifies an email change with an OTP it mails
                out. No mail delivery is configured here, so the change is
                applied directly rather than shipping a "Gửi mã OTP" button
                that sends nothing. Wire up a mailer before trusting this
                field to prove ownership of an address. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className={CARD_TITLE}>Địa chỉ Email</h3>
              <span className={CARD_HINT}>Nơi nhận link đặt lại mật khẩu</span>
            </div>
            <label htmlFor="sec-email" className="sr-only">
              Email mới
            </label>
            <input
              id="sec-email"
              type="email"
              autoComplete="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="Nhập email mới của bạn"
              className={FIELD}
            />
            {emailMsg ? <Notice tone={emailMsg.tone}>{emailMsg.text}</Notice> : null}
            <button type="submit" disabled={emailBusy} className={SUBMIT}>
              {emailBusy ? "Đang lưu…" : "Cập nhật"}
            </button>
          </form>

          <form
            onSubmit={submitPassword}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className={CARD_TITLE}>Đổi Mật Khẩu</h3>
              <span className={CARD_HINT}>Đổi xong mọi thiết bị phải đăng nhập lại</span>
            </div>

            {/* Every field carries its own label. The design shows only
                placeholders, so they are visually hidden — a placeholder is
                not a label: it disappears the moment you start typing, and a
                screen reader may never announce it at all. */}
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
            {pwMsg ? <Notice tone={pwMsg.tone}>{pwMsg.text}</Notice> : null}
            <button type="submit" disabled={pwBusy} className={SUBMIT}>
              {pwBusy ? "Đang xử lý…" : "Đổi Mật Khẩu"}
            </button>
          </form>
        </div>
      ) : tab === "linked" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={CARD_TITLE}>Liên kết nền tảng</h3>
            <span className={CARD_HINT}>Kết nối để sử dụng thêm tiện ích</span>
          </div>

          {linkNotice ? <Notice tone={linkNotice.tone}>{linkNotice.text}</Notice> : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {providers.map((provider) => (
              <div
                key={provider.key}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/50">
                  {provider.mark}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-bold leading-none text-white">
                    {provider.name}
                  </span>
                  <span className="truncate text-[11px] leading-none text-neutral-500">
                    {provider.linked ? "Đã liên kết" : "Chưa liên kết"} · {provider.perk}
                  </span>
                </span>
                {provider.linked ? (
                  <span className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                    <Check size={12} /> Đã liên kết
                  </span>
                ) : provider.enabled ? (
                  <a
                    href={`/api/auth/${provider.key}?next=%2Fsecurity`}
                    className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg bg-[var(--menzu-accent)] px-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
                  >
                    Liên kết
                  </a>
                ) : (
                  // Same rule as the login buttons: a real door only once the
                  // provider's keys sit in Cấu hình.
                  <button
                    type="button"
                    className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg bg-[var(--menzu-accent)] px-4 text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    Liên kết
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={CARD_TITLE}>Quản lý thiết bị</h3>
            <span className={CARD_HINT}>Các phiên đăng nhập đang hoạt động</span>
          </div>

          {devMsg ? <Notice tone={devMsg.tone}>{devMsg.text}</Notice> : null}

          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <div
                key={session.key}
                className="flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)]">
                  <Laptop size={17} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold leading-none text-white">
                      {session.device}
                    </span>
                    {session.current ? (
                      <span className="rounded-md border border-[var(--menzu-accent)]/50 bg-[var(--menzu-accent)]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--menzu-accent)]">
                        Thiết bị hiện tại
                      </span>
                    ) : null}
                  </div>
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-neutral-500">
                    <Globe size={11} className="shrink-0" />
                    {session.ip ? (
                      <>
                        <span className="font-semibold text-neutral-300">
                          {session.ip}
                        </span>
                        <span aria-hidden>·</span>
                      </>
                    ) : null}
                    {session.location ? (
                      <>
                        <span>{session.location}</span>
                        <span aria-hidden>·</span>
                      </>
                    ) : null}
                    <span>{session.when}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Destructive, so it wears the warning colour — and it only has
              work to do once a second session exists. */}
          <button
            type="button"
            onClick={revokeOthers}
            disabled={devBusy || sessions.length <= 1}
            className="self-start h-10 rounded-xl border border-red-500/40 bg-red-500/10 px-5 text-[11px] font-black uppercase tracking-widest text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {devBusy ? "Đang đăng xuất…" : "Đăng xuất các thiết bị khác"}
          </button>
        </section>
      )}
    </div>
  );
}
