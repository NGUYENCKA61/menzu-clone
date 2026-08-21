"use client";

import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { StatusToast } from "./StatusToast";

/**
 * The far end of the reset email: two password fields against the token that
 * rode in on the URL.
 *
 * The token is handed over by the page, which read it from the query string
 * on the server — this component never parses the URL itself, so there is
 * exactly one reading of it. Success replaces the form with a standing note
 * and a door to /login; the API has already revoked every session, so there
 * is nothing on this page to go back to.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
        setPending(false);
        return;
      }
      setDone(data.message ?? "Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.");
    } catch {
      setError("Không kết nối được máy chủ");
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500/15 text-emerald-400">
          <ShieldCheck size={28} strokeWidth={2.5} />
        </span>
        <h2 className="mt-5 text-[17px] font-black uppercase tracking-wide text-white">
          Mật khẩu đã đổi
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-300">{done}</p>
        <a
          href="/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--menzu-accent)] text-[13px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
        >
          Đăng nhập ngay
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor="reset-password"
        className="block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2.5 ml-1"
      >
        Mật khẩu mới
      </label>
      <div className="relative">
        <Lock
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          id="reset-password"
          type={show ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ít nhất 6 ký tự"
          className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-12 py-4 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-600"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-white"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <label
        htmlFor="reset-confirm"
        className="mt-5 block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2.5 ml-1"
      >
        Xác nhận mật khẩu
      </label>
      <div className="relative">
        <Lock
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          id="reset-confirm"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Nhập lại mật khẩu mới"
          className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-600"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-2xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-70 disabled:cursor-wait text-white font-black py-4 uppercase tracking-widest text-sm transition-colors"
      >
        {pending ? "ĐANG ĐỔI…" : "ĐẶT MẬT KHẨU MỚI"}
      </button>

      {error ? (
        <StatusToast
          title="Không đổi được"
          message={error}
          onClose={() => setError(null)}
        />
      ) : null}
    </form>
  );
}
