"use client";

import { ArrowLeft, MailCheck, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StatusToast } from "./StatusToast";

/**
 * The "quên mật khẩu" card: one field, one button, and afterwards one
 * instruction that stays on screen.
 *
 * The success state replaces the form instead of toasting over it — "check
 * your inbox" is homework, not news, and homework should not dismiss itself
 * after five seconds. Errors toast like everywhere else.
 *
 * The card never says whether the account exists; the server's sentence is
 * shown verbatim, and it is worded to read identically either way.
 */
export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!identifier.trim()) {
      setError("Vui lòng nhập tên đăng nhập hoặc email");
      return;
    }
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
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
      setSentMessage(
        data.message ?? "Nếu tài khoản tồn tại và có email, đường dẫn đặt lại đã được gửi.",
      );
    } catch {
      setError("Không kết nối được máy chủ");
      setPending(false);
    }
  }

  if (sentMessage) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500/15 text-emerald-400">
          <MailCheck size={28} strokeWidth={2.5} />
        </span>
        <h2 className="mt-5 text-[17px] font-black uppercase tracking-wide text-white">
          Đã gửi yêu cầu
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-300">{sentMessage}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--menzu-accent)] text-[13px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
        >
          Về trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor="forgot-identifier"
        className="block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2.5 ml-1"
      >
        Tên đăng nhập / Email
      </label>
      <div className="relative">
        <User
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          id="forgot-identifier"
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Tài khoản cần lấy lại mật khẩu"
          className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-600"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-2xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-70 disabled:cursor-wait text-white font-black py-4 uppercase tracking-widest text-sm transition-colors"
      >
        {pending ? "ĐANG GỬI…" : "GỬI ĐƯỜNG DẪN ĐẶT LẠI"}
      </button>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Về trang đăng nhập
      </Link>

      {error ? (
        <StatusToast
          title="Không gửi được"
          message={error}
          onClose={() => setError(null)}
        />
      ) : null}
    </form>
  );
}
