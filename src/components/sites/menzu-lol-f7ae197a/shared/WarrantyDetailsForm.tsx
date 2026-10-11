"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Info, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  ANSWER_MAX,
  DETAIL_QUESTIONS,
  wantsPhoto,
  type DetailQuestion,
} from "@/lib/warrantyDetails";
import type { WarrantyKind } from "@/lib/warrantyRequests";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--menzu-accent)]/60";
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * The second round of a warranty report, set exactly as the first one is
 * (the owner, 11/10/2026: "đợt 2 giao diện cũng y chang đợt 1 đi"): numbered
 * sections parted by hairlines, a red star where an answer is due, choices
 * as tiles, and a picture dropped on a panel rather than picked with a
 * small button. It has no description box; the first round already took one.
 *
 * Every question is answered in one go and sent in one post, because a
 * ticket half-answered is a ticket the desk still cannot act on (the owner:
 * "đợt 2 bắt buộc vì cần phải kỹ hơn").
 */
export function WarrantyDetailsForm({
  ticketId,
  kind,
}: {
  ticketId: string;
  /** Which set of questions: a tool's machine, or an account's sign-in. */
  kind: WarrantyKind;
}) {
  const router = useRouter();
  const questions = DETAIL_QUESTIONS[kind];
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Object URLs are revoked when the picture is replaced or the form goes.
  useEffect(() => {
    return () => {
      for (const url of Object.values(previews)) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(key: string, file: File | null) {
    setPreviews((now) => {
      const old = now[key];
      if (old) URL.revokeObjectURL(old);
      const next = { ...now };
      if (file) next[key] = URL.createObjectURL(file);
      else delete next[key];
      return next;
    });
    setFiles((now) => {
      const next = { ...now };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
    setError(null);
  }

  function answered(q: DetailQuestion): boolean {
    const value = (values[q.key] ?? "").trim();
    if (!value) return false;
    if (q.options.length > 0 && !q.options.some((o) => o.value === value)) return false;
    // A picture only where the answer calls for one.
    if (wantsPhoto(q, value) && !files[q.key]) return false;
    return true;
  }

  const done = questions.filter(answered).length;
  const ready = done === questions.length;

  async function submit() {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("ticket", ticketId);
      for (const q of questions) {
        form.set(`value-${q.key}`, (values[q.key] ?? "").trim());
        const file = files[q.key];
        if (file) form.set(`image-${q.key}`, file);
      }
      const res = await fetch("/api/warranty-requests/details", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Không gửi được, thử lại giúp shop.");
        return;
      }
      router.refresh();
    } catch {
      setError("Mất kết nối, thử lại giúp shop.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="flex items-center gap-2.5 text-base font-black uppercase tracking-wider text-white">
            <Info className="h-5 w-5 shrink-0 text-[var(--menzu-accent)]" aria-hidden />
            Bổ sung thông tin
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">
            Shop chỉ bắt đầu kiểm tra khi đủ các mục dưới đây. Trả lời một lần
            rồi gửi, khỏi phải chờ shop hỏi lại từng câu.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[12px] font-black tabular-nums ${
            ready
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/10 bg-white/[0.04] text-neutral-400"
          }`}
        >
          {done}/{questions.length}
        </span>
      </div>

      {questions.map((q, index) => {
        const value = values[q.key] ?? "";
        const preview = previews[q.key];
        return (
          <div
            key={q.key}
            className={index === 0 ? "" : "border-t border-white/[0.06] pt-5"}
          >
            <div className="mb-3">
              <h2 className="flex flex-wrap items-center gap-1.5 text-[13px] font-black uppercase tracking-widest text-white">
                {index + 1}. {q.label}
                <span aria-hidden className="text-[var(--menzu-accent)]">
                  *
                </span>
                <span className="sr-only">(bắt buộc)</span>
              </h2>
            </div>
            <p className="-mt-2 mb-3 text-[13px] text-neutral-400">{q.hint}</p>

            {q.options.length > 0 ? (
              // An answer of one word takes the room of one word (the
              // owner, 11/10/2026: "bớt rối").
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((option) => {
                  const on = value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setValues((now) => ({ ...now, [q.key]: option.value }));
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
                        {option.value}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-neutral-400">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                value={value}
                onChange={(event) => {
                  const next = event.target.value.slice(0, ANSWER_MAX);
                  setValues((now) => ({ ...now, [q.key]: next }));
                  setError(null);
                }}
                placeholder={q.placeholder ?? "Ghi ngắn gọn"}
                className={`${FIELD} max-w-md`}
              />
            )}

            {wantsPhoto(q, value) ? (
              <div className="mt-3">
                {preview ? (
                  <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                    <Image
                      src={preview}
                      alt={`Ảnh cho ${q.label}`}
                      width={800}
                      height={450}
                      unoptimized
                      className="max-h-[220px] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        pick(q.key, null);
                        const input = inputs.current[q.key];
                        if (input) input.value = "";
                      }}
                      aria-label={`Bỏ ảnh của ${q.label}`}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/70 text-neutral-300 transition-colors hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  // The first round's panel, so both rounds take a picture
                  // the same way.
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-white/[0.04]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-neutral-300">
                      <ImagePlus className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-neutral-200">
                        Kéo và thả ảnh vào đây, hoặc bấm để chọn ảnh
                      </span>
                      <span className="block text-[12px] text-neutral-500">
                        PNG, JPG hoặc WebP, tối đa 5MB.
                      </span>
                    </span>
                    <input
                      ref={(node) => {
                        inputs.current[q.key] = node;
                      }}
                      type="file"
                      accept={TYPES.join(",")}
                      className="hidden"
                      onChange={(event) => pick(q.key, event.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
            ) : null}
          </div>
        );
      })}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <span className="flex flex-col gap-1">
          <span className="text-[13px] text-neutral-400">
            {ready
              ? "Đủ rồi, gửi để shop bắt đầu kiểm tra."
              : `Còn ${questions.length - done} mục chưa trả lời.`}
          </span>
          <span className="text-[12px] tabular-nums text-neutral-500">
            Đã trả lời {done}/{questions.length}
          </span>
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !ready}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--menzu-accent)]"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {busy ? "Đang gửi…" : "Gửi thông tin bổ sung"}
        </button>
      </div>
    </div>
  );
}
