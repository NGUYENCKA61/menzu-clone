"use client";

import { Check, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { TOTP_PERIOD, generateTotp, secondsRemaining } from "@/lib/totp";

/**
 * Generates Riot 2FA codes from a base32 secret.
 *
 * Everything runs in the browser. The secret is never sent anywhere, never
 * stored, and is gone on reload — a 2FA secret is a permanent credential, and
 * a server that receives one has taken on a liability it cannot discharge.
 */
export function TotpTool() {
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(TOTP_PERIOD);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Held in a ref so the ticking effect below does not restart on each keystroke.
  const activeSecret = useRef<string | null>(null);

  const refresh = useCallback(async (value: string) => {
    try {
      setCode(await generateTotp(value));
      setRemaining(secondsRemaining());
      setError(null);
    } catch (caught) {
      activeSecret.current = null;
      setCode(null);
      setError(caught instanceof Error ? caught.message : "Secret key không hợp lệ");
    }
  }, []);

  useEffect(() => {
    if (!activeSecret.current) return;

    const tick = setInterval(() => {
      const left = secondsRemaining();
      setRemaining(left);
      // The window just rolled over, so the displayed code is now stale.
      if (left === TOTP_PERIOD && activeSecret.current) void refresh(activeSecret.current);
    }, 1000);

    return () => clearInterval(tick);
  }, [code, refresh]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = secret.trim();
    if (!value) {
      setError("Vui lòng nhập secret key");
      return;
    }
    activeSecret.current = value;
    await refresh(value);
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Trình duyệt chặn truy cập clipboard");
    }
  }

  return (
    <div className="w-full max-w-[520px] mx-auto space-y-5">
      <div className="rounded-3xl border border-white/10 bg-[#121216] p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-white">Menzu 2FA</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Valorant · Auto 2FA
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label
            htmlFor="totp-secret"
            className="block text-[11px] font-black uppercase tracking-widest text-neutral-400"
          >
            Paste secret key
          </label>
          <div className="relative">
            <KeyRound
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              id="totp-secret"
              type="text"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              // Never offer to remember a permanent credential.
              autoComplete="off"
              spellCheck={false}
              placeholder="VD: GEZDGNBVGY3TQOJQ..."
              className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-4 py-4 text-sm font-mono text-white outline-none focus:border-indigo-500/60 transition-colors placeholder-neutral-600"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 uppercase tracking-widest text-xs transition-colors"
          >
            Get OTP
          </button>
        </form>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
          >
            {error}
          </p>
        ) : null}

        {code ? (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between gap-4">
              <span
                className="text-4xl sm:text-5xl font-black tracking-[0.2em] text-white font-mono"
                aria-live="polite"
              >
                {code}
              </span>
              <button
                type="button"
                onClick={copyCode}
                aria-label="Sao chép mã"
                className="shrink-0 w-11 h-11 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 flex items-center justify-center transition-colors"
              >
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                    remaining <= 5 ? "bg-red-500" : "bg-indigo-500"
                  }`}
                  style={{ width: `${(remaining / TOTP_PERIOD) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-500 font-bold">
                Mã đổi sau <span className="text-white">{remaining}s</span>
              </p>
            </div>

            {copied ? (
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                ✓ Đã sao chép code!
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-[11px] text-neutral-500 leading-relaxed text-center px-4">
        Secret key được xử lý hoàn toàn trên trình duyệt của bạn — không gửi lên
        máy chủ và không được lưu lại.
      </p>
    </div>
  );
}
