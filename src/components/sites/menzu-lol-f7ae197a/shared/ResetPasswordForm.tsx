"use client";

import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
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
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
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
    // LAB (17/10/2026): the notice look, as on the forgot card.
    return (
      <div>
        <h2 className="flex items-center gap-2.5 text-[18px] font-bold text-white">
          <ShieldCheck size={20} aria-hidden className="shrink-0 text-emerald-400" />
          Mật khẩu đã đổi
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-300">{done}</p>
        <Link
          href="/login"
          className="mt-7 flex w-full items-center justify-center rounded-2xl bg-[var(--menzu-accent-dark)] py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent)]"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor="reset-password"
        className="block text-[13px] font-semibold text-neutral-400 mb-2.5 ml-1"
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
          placeholder="Ít nhất 8 ký tự"
          className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-12 py-4 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-500"
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
        className="mt-5 block text-[13px] font-semibold text-neutral-400 mb-2.5 ml-1"
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
          className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-500"
        />
      </div>

      {/* The forgot card's button and grey arrow link, so the two halves of
          one errand match (the owner, 21/10/2026: "làm đi cho đồng bộ hết");
          this one was a smaller rounded-xl bar in capitals typed as such. */}
      <button
        type="submit"
        disabled={pending}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--menzu-accent-dark)] hover:bg-[var(--menzu-accent)] disabled:opacity-70 disabled:cursor-wait text-white font-semibold py-4 text-[15px] transition-colors"
      >
        {pending ? "Đang đổi…" : "Đặt mật khẩu mới"}
      </button>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-2 text-[14px] font-semibold text-neutral-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Về trang đăng nhập
      </Link>

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
