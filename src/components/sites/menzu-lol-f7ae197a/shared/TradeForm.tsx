"use client";

import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";

const MODES = [
  {
    value: "SELL",
    title: "Thanh lý thu tiền",
    body: "Định giá tài khoản và nhận thanh toán tiền mặt qua Zalo.",
  },
  {
    value: "EXCHANGE",
    title: "Thu cũ đổi mới",
    body: "Đổi tài khoản lấy tài khoản khác trên shop, bù hoặc trừ tiền.",
  },
] as const;

const MAIL_TYPES = [
  {
    value: "DROP",
    title: "Drop Mail",
    body: "Còn mail gốc, bàn giao cả email ban đầu.",
  },
  {
    value: "DEAD",
    title: "Dead Mail",
    body: "Mất mail gốc nhưng vẫn đổi được email liên kết.",
  },
] as const;

const CARD = "rounded-2xl border p-4 text-left transition-colors";
const CARD_ON = `${CARD} border-[#7C3AED] bg-[#7C3AED]/10`;
const CARD_OFF = `${CARD} border-white/10 bg-white/[0.02] hover:border-white/25`;

/**
 * "Gửi yêu cầu báo giá" — the trade-in request form.
 *
 * Submitted as multipart rather than JSON because of the screenshot; the file
 * never becomes a base64 string, which would inflate it by a third and push a
 * 5MB upload past common body limits.
 */
export function TradeForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<string>("SELL");
  const [mailType, setMailType] = useState<string>("DROP");
  const [hasWelcomeMail, setHasWelcomeMail] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [zalo, setZalo] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCode, setSentCode] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const body = new FormData();
    body.set("mode", mode);
    body.set("mailType", mailType);
    body.set("hasWelcomeMail", String(hasWelcomeMail));
    body.set("zalo", zalo);
    body.set("note", note);
    if (file) body.set("screenshot", file);

    try {
      const response = await fetch("/api/trade", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Gửi yêu cầu thất bại");
        setPending(false);
        return;
      }

      setSentCode(data.code ?? null);
      setFile(null);
      setZalo("");
      setNote("");
      setPending(false);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        <legend className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-3">
          Hình thức giao dịch
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              aria-pressed={mode === option.value}
              className={mode === option.value ? CARD_ON : CARD_OFF}
            >
              <span className="block text-sm font-bold text-white">{option.title}</span>
              <span className="block text-[11px] text-neutral-400 mt-1 leading-relaxed">
                {option.body}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-3">
          Dạng tài khoản
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MAIL_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMailType(option.value)}
              aria-pressed={mailType === option.value}
              className={mailType === option.value ? CARD_ON : CARD_OFF}
            >
              <span className="block text-sm font-bold text-white">{option.title}</span>
              <span className="block text-[11px] text-neutral-400 mt-1 leading-relaxed">
                {option.body}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasWelcomeMail}
            onChange={(event) => setHasWelcomeMail(event.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#7C3AED]"
          />
          <span>
            <span className="block text-sm font-bold text-white">Có thư Welcome</span>
            <span className="block text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
              Riot gửi thư chào mừng tới email đầu tiên khi đăng ký tài khoản.
              Có thư này thì tài khoản được định giá cao hơn.
            </span>
          </span>
        </label>

        {hasWelcomeMail ? (
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="hidden"
              id="trade-screenshot"
            />
            <label
              htmlFor="trade-screenshot"
              className="flex items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-4 cursor-pointer hover:border-[#7C3AED]/60 transition-colors"
            >
              <Upload size={18} className="text-neutral-500 shrink-0" />
              <span className="text-[12px] text-neutral-400 truncate flex-1">
                {file ? file.name : "Chọn ảnh chụp thư Welcome (tối đa 5MB)"}
              </span>
              {file ? (
                <button
                  type="button"
                  aria-label="Bỏ ảnh"
                  onClick={(event) => {
                    event.preventDefault();
                    setFile(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="text-neutral-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              ) : null}
            </label>
            <a
              href="/checkwc"
              className="inline-block mt-2 text-[11px] font-bold text-[#7C3AED] hover:underline"
            >
              Hướng dẫn check thư Welcome
            </a>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="trade-zalo"
            className="block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2"
          >
            Số điện thoại Zalo
          </label>
          <input
            id="trade-zalo"
            type="tel"
            inputMode="numeric"
            required
            value={zalo}
            onChange={(event) => setZalo(event.target.value)}
            placeholder="Nhập số điện thoại Zalo của bạn..."
            className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
          />
        </div>
        <div>
          <label
            htmlFor="trade-note"
            className="block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2"
          >
            Ghi chú <span className="text-neutral-600">(không bắt buộc)</span>
          </label>
          <input
            id="trade-note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Rank, số skin, mong muốn…"
            className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
          />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
        >
          {error}
        </p>
      ) : null}

      {sentCode ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
        >
          Đã gửi yêu cầu — mã đơn {sentCode}. Nhắn Zalo cho admin kèm mã này để
          được duyệt nhanh.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-70 disabled:cursor-wait text-white font-black py-4 uppercase tracking-widest text-sm transition-colors"
      >
        {pending ? "Đang gửi…" : "Gửi yêu cầu báo giá"}
      </button>
    </form>
  );
}
