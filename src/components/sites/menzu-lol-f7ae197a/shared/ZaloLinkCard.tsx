"use client";

import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { useEffect, useState } from "react";

/**
 * The Zalo row of Bảo mật › Liên kết nền tảng. Zalo is no OAuth door and the
 * bot runs on a personal account, so the link is a code: the customer asks
 * for one here, sends "LIENKET <code>" to the bot's number, and the bot ties
 * the two together (the owner, 12/10/2026). Once linked, every notice to
 * this account also lands in that Zalo chat.
 */
export function ZaloLinkCard({
  phone,
  name,
  linked,
  linkedName,
}: {
  /** The bot's own number, as the shop typed it in Cấu hình. */
  phone: string;
  /** How the shop named that account; blank falls back to the number. */
  name: string;
  linked: boolean;
  /** The display name the bot saw when the link was made. */
  linkedName: string | null;
}) {
  const router = useRouter();
  const [issued, setIssued] = useState<{
    message: string;
    expiresAt: string;
  } | null>(null);
  const [busy, setBusy] = useState<"code" | "check" | "unlink" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // A link that just went through: the code has done its work.
  useEffect(() => {
    if (linked) setIssued(null);
  }, [linked]);

  async function issue() {
    setBusy("code");
    setError(null);
    try {
      const res = await fetch("/api/integrations/zalo/link-code", {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        expiresAt?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.message || !data.expiresAt) {
        setError(data?.error ?? "Không lấy được mã, thử lại sau.");
        return;
      }
      setIssued({ message: data.message, expiresAt: data.expiresAt });
    } catch {
      setError("Không lấy được mã, thử lại sau.");
    } finally {
      setBusy(null);
    }
  }

  async function unlink() {
    setBusy("unlink");
    setError(null);
    try {
      const res = await fetch("/api/integrations/zalo/unlink", {
        method: "POST",
      });
      if (!res.ok) {
        setError("Chưa huỷ được, thử lại sau.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function check() {
    setBusy("check");
    router.refresh();
    // The refresh itself has no promise to await; the button settles shortly.
    window.setTimeout(() => setBusy(null), 1200);
  }

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard: the code is on screen to type.
    }
  }

  const botLabel = name.trim() || phone;
  const expires = issued
    ? new Date(issued.expiresAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/5">
          <MessageCircle
            className={`h-6 w-6 ${linked ? "text-[#0068ff]" : "text-neutral-500"}`}
            aria-hidden
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <span
            className={`text-base font-bold ${linked ? "text-white" : "text-neutral-300"}`}
          >
            Zalo
          </span>
          <span
            className={`text-xs font-medium ${linked ? "text-emerald-400" : "text-neutral-500"}`}
          >
            {linked
              ? `Đã liên kết${linkedName ? ` với ${linkedName}` : ""}`
              : "Nhận thông báo bảo hành, đơn hàng, nạp tiền qua Zalo"}
          </span>
        </div>
        <div className="ml-auto shrink-0">
          {linked ? (
            <button
              type="button"
              onClick={() => void unlink()}
              disabled={busy !== null}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[13px] font-semibold text-neutral-300 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
            >
              {busy === "unlink" ? (
                <Loader2
                  size={14}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <Unlink size={14} aria-hidden />
              )}
              Huỷ liên kết
            </button>
          ) : issued ? null : (
            <button
              type="button"
              onClick={() => void issue()}
              disabled={busy !== null}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50"
            >
              {busy === "code" ? (
                <Loader2
                  size={14}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : null}
              Liên kết
            </button>
          )}
        </div>
      </div>

      {issued && !linked ? (
        <ol className="flex flex-col gap-3 border-t border-white/5 pt-4 text-[13px] leading-relaxed text-neutral-300">
          <li className="flex gap-3">
            <span className="font-black text-neutral-500">1.</span>
            <span>
              Mở Zalo và nhắn cho{" "}
              <a
                href={`https://zalo.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white underline underline-offset-2"
              >
                {botLabel}
              </a>
              {name.trim() ? (
                <span className="text-neutral-500"> ({phone})</span>
              ) : null}
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-black text-neutral-500">2.</span>
            <span className="flex flex-wrap items-center gap-2">
              Gửi đúng nội dung
              <code className="rounded-lg border border-white/10 bg-neutral-950/60 px-2.5 py-1 font-mono text-sm font-bold tracking-widest text-white">
                {issued.message}
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
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-black text-neutral-500">3.</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>
                Bot trả lời xong thì bấm kiểm tra. Mã hết hạn lúc {expires}.
              </span>
              <button
                type="button"
                onClick={check}
                disabled={busy !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] font-semibold text-neutral-200 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
              >
                {busy === "check" ? (
                  <Loader2
                    size={13}
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  <RefreshCw size={13} aria-hidden />
                )}
                Kiểm tra
              </button>
              <button
                type="button"
                onClick={() => void issue()}
                disabled={busy !== null}
                className="text-[12px] font-semibold text-neutral-500 transition-colors hover:text-white"
              >
                Lấy mã khác
              </button>
            </span>
          </li>
        </ol>
      ) : null}

      {error ? (
        <p className="text-[12px] font-semibold text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
