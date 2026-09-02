"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { REASON_MAX, REASON_MIN } from "@/lib/refundRequests";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-600 focus:border-[var(--menzu-accent)]/60";
const LABEL =
  "mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500";
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * The form on the refund page: what went wrong, and the picture that shows it.
 *
 * A word count under the box rather than a silent maxlength, because the floor
 * is the part people trip on — a box that quietly refuses "loi" on submit
 * teaches nothing, and one that says "còn 14 ký tự" is answerable.
 */
export function RefundRequestForm({
  code,
  onDone,
}: {
  code: string;
  /** Where to send the buyer once it lands. */
  onDone: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // One object URL alive at a time, and none after unmount.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const short = reason.trim().length < REASON_MIN;
  const left = REASON_MIN - reason.trim().length;

  async function submit() {
    if (busy || short) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("code", code);
      form.set("reason", reason);
      if (file) form.set("image", file);
      const res = await fetch("/api/refund-requests", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Không gửi được yêu cầu");
        return;
      }
      router.push(onDone);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="refund-reason" className={LABEL}>
          Lý do yêu cầu hoàn trả
        </label>
        <textarea
          id="refund-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value.slice(0, REASON_MAX))}
          rows={6}
          placeholder="Mô tả rõ chuyện gì đã xảy ra — dùng được bao lâu thì lỗi, lỗi thế nào, đã thử cách gì chưa. Càng rõ shop càng xử lý nhanh."
          className={`${FIELD} resize-y leading-relaxed`}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
          <span className={short ? "text-neutral-500" : "text-emerald-400"}>
            {short ? `Cần thêm ${left} ký tự` : "Đủ rồi, gửi được"}
          </span>
          <span className="tabular-nums text-neutral-600">
            {reason.trim().length}/{REASON_MAX}
          </span>
        </div>
      </div>

      <div>
        <span className={LABEL}>Ảnh bằng chứng (không bắt buộc)</span>
        {preview ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
            <Image
              src={preview}
              alt="Ảnh bằng chứng đã chọn"
              width={800}
              height={450}
              unoptimized
              className="max-h-[260px] w-full object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Bỏ ảnh"
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/70 text-neutral-300 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-[var(--menzu-accent)]/50 hover:text-white">
            <ImagePlus className="h-4 w-4" />
            Chọn ảnh từ máy
            <input
              ref={inputRef}
              type="file"
              accept={TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                setFile(picked);
                setError(null);
              }}
            />
          </label>
        )}
        <p className="mt-2 text-[11px] text-neutral-500">
          PNG, JPG hoặc WebP · tối đa 5MB. Ảnh chụp màn hình lỗi hoặc thông báo
          khoá tài khoản giúp shop xử lý nhanh hơn nhiều.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || short}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--menzu-accent)]"
        >
          {busy ? (
            <RotateCcw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {busy ? "Đang gửi…" : "Gửi yêu cầu"}
        </button>
        <span className="text-[11px] text-neutral-500">
          Gửi xong shop sẽ xem và trả lời trong lịch sử mua hàng.
        </span>
      </div>
    </div>
  );
}
