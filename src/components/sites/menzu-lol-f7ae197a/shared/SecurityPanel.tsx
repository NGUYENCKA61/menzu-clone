"use client";

import { Link2, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Tab = "security" | "linked" | "devices";

const TABS: { id: Tab; label: string; heading: string; icon: typeof ShieldCheck }[] = [
  { id: "security", label: "Bảo mật", heading: "Bảo mật tài khoản", icon: ShieldCheck },
  { id: "linked", label: "Liên kết", heading: "Liên kết nền tảng", icon: Link2 },
  { id: "devices", label: "Thiết bị", heading: "Quản lý thiết bị", icon: MonitorSmartphone },
];

const TAB_ACTIVE =
  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[#7C3AED] text-white transition-colors";
const TAB_INACTIVE =
  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";
const LABEL =
  "block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2";
const SUBMIT =
  "self-start h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-70 disabled:cursor-wait transition-colors text-[11px] font-black uppercase tracking-widest text-white";

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

export function SecurityPanel({ email }: { email?: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("security");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

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

      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
        {active.heading}
      </span>

      {tab === "security" ? (
        <div className="flex flex-col gap-4">
          <form
            onSubmit={submitEmail}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-3"
          >
            <label htmlFor="sec-email" className={LABEL}>
              Địa chỉ Email
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
            <label htmlFor="sec-current" className={LABEL}>
              Đổi Mật Khẩu
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
            <input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className={FIELD}
            />
            <input
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
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center text-sm text-neutral-400">
          {tab === "linked"
            ? "Chưa liên kết nền tảng nào."
            : "Chưa có thiết bị nào được ghi nhận."}
        </div>
      )}
    </div>
  );
}
