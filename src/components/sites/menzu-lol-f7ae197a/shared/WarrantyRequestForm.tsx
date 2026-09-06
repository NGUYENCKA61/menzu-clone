"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  WARRANTY_ISSUE,
  WARRANTY_ISSUE_KEYS,
  type WarrantyIssue,
} from "@/lib/warrantyRequests";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-600 focus:border-[var(--menzu-accent)]/60";
const LABEL =
  "mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500";
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * The form on the warranty page: what kind of trouble, what happened, and the
 * picture that shows it. The kind is a row of tiles rather than a select so
 * the four choices are read before one is picked.
 */
export function WarrantyRequestForm({
  code,
  onDone,
}: {
  code: string;
  /** Where to send the buyer once it lands. */
  onDone: string;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState<WarrantyIssue | null>(null);
  const [description, setDescription] = useState("");
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

  const short = description.trim().length < DESCRIPTION_MIN;
  const left = DESCRIPTION_MIN - description.trim().length;
  const ready = issue !== null && !short;

  async function submit() {
    if (busy || !ready || issue === null) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("code", code);
      form.set("issue", issue);
      form.set("description", description);
      if (file) form.set("image", file);
      const res = await fetch("/api/warranty-requests", { method: "POST", body: form });
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
        <span className={LABEL}>Bạn gặp lỗi gì?</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {WARRANTY_ISSUE_KEYS.map((key) => {
            const on = issue === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setIssue(key);
                  setError(null);
                }}
                aria-pressed={on}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  on
                    ? "border-[var(--menzu-accent)]/60 bg-[var(--menzu-accent)]/10"
                    : "border-white/10 bg-neutral-950/60 hover:border-white/25"
                }`}
              >
                <span className={`block text-[13px] font-bold ${on ? "text-white" : "text-neutral-200"}`}>
                  {WARRANTY_ISSUE[key].label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-neutral-500">
                  {WARRANTY_ISSUE[key].hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="warranty-description" className={LABEL}>
          Mô tả lỗi
        </label>
        <textarea
          id="warranty-description"
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, DESCRIPTION_MAX))}
          rows={6}
          placeholder="Lỗi xuất hiện lúc nào, thông báo hiện ra là gì, đã thử cách gì chưa (cài lại, tắt antivirus, đổi mạng…). Càng rõ shop xử lý càng nhanh."
          className={`${FIELD} resize-y leading-relaxed`}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
          <span className={short ? "text-neutral-500" : "text-emerald-400"}>
            {short ? `Cần thêm ${left} ký tự` : "Đủ rồi, gửi được"}
          </span>
          <span className="tabular-nums text-neutral-600">
            {description.trim().length}/{DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      <div>
        <span className={LABEL}>Ảnh chụp lỗi (không bắt buộc)</span>
        {preview ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
            <Image
              src={preview}
              alt="Ảnh lỗi đã chọn"
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
          PNG, JPG hoặc WebP · tối đa 5MB. Ảnh thông báo lỗi hoặc màn hình tool
          giúp shop xử lý nhanh hơn nhiều.
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
          disabled={busy || !ready}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--menzu-accent)]"
        >
          {busy ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy ? "Đang gửi…" : "Gửi yêu cầu bảo hành"}
        </button>
        <span className="text-[11px] text-neutral-500">
          Shop trả lời trên chuông thông báo và trong lịch sử mua hàng.
        </span>
      </div>
    </div>
  );
}
