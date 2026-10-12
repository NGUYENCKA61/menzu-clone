"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ImagePlus, Info, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  ANSWER_MAX,
  IMAGES_PER_ANSWER,
  wantsPhoto,
  type DetailQuestion,
} from "@/lib/warrantyDetails";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--menzu-accent)]/60";
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const GHOST =
  "inline-flex h-11 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-white/25 hover:text-white";
const PRIMARY =
  "inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--menzu-accent)]";

/**
 * The second round of a warranty report, one question at a time.
 *
 * Seven questions on one screen read as a wall, so the card holds one
 * question, the counter says where the buyer is, and Tiếp lights up once
 * that question is answered (the owner, 11/10/2026: "khách hàng trả lời
 * từng câu hỏi rồi ấn nút tiếp cho câu hỏi tiếp theo, như này nó đỡ rối
 * mắt"). The first round keeps its single screen ("đợt 1 giữ nguyên vậy").
 *
 * Everything still goes in one post at the end, because a ticket half
 * answered is a ticket the desk cannot act on ("đợt 2 bắt buộc vì cần phải
 * kỹ hơn"), and a question that wants a screenshot takes several at once
 * ("ảnh đính kèm có thể gửi nhiều ảnh 1 lần").
 */
export function WarrantyDetailsForm({
  ticketId,
  questions,
}: {
  ticketId: string;
  /** The set this product asks: its own, its game's, or the default
   *  (resolveQuestions on the server). */
  questions: readonly DetailQuestion[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [previews, setPreviews] = useState<Record<string, string[]>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const live = useRef<Record<string, string[]>>({});

  // Object URLs are revoked when the form goes; live holds the open ones.
  useEffect(() => {
    const open = live.current;
    return () => {
      for (const list of Object.values(open)) {
        for (const url of list) URL.revokeObjectURL(url);
      }
    };
  }, []);

  function add(key: string, picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    const room = IMAGES_PER_ANSWER - (files[key]?.length ?? 0);
    const taken = Array.from(picked).slice(0, Math.max(0, room));
    if (taken.length === 0) {
      setError(`Mỗi câu gửi tối đa ${IMAGES_PER_ANSWER} ảnh.`);
      return;
    }
    const urls = taken.map((file) => URL.createObjectURL(file));
    setFiles((now) => ({ ...now, [key]: [...(now[key] ?? []), ...taken] }));
    setPreviews((now) => {
      const next = { ...now, [key]: [...(now[key] ?? []), ...urls] };
      live.current = next;
      return next;
    });
    setError(null);
  }

  function drop(key: string, index: number) {
    setPreviews((now) => {
      const list = now[key] ?? [];
      const gone = list[index];
      if (gone) URL.revokeObjectURL(gone);
      const next = { ...now, [key]: list.filter((_, i) => i !== index) };
      live.current = next;
      return next;
    });
    setFiles((now) => ({ ...now, [key]: (now[key] ?? []).filter((_, i) => i !== index) }));
    // The input keeps the last pick, so clearing it lets the same file in again.
    const input = inputs.current[key];
    if (input) input.value = "";
    setError(null);
  }

  function answered(question: DetailQuestion): boolean {
    const picked = (values[question.key] ?? "").trim();
    if (!picked) return false;
    if (question.options.length > 0 && !question.options.some((o) => o.value === picked)) {
      return false;
    }
    // A picture only where the answer calls for one.
    if (wantsPhoto(question, picked) && (files[question.key]?.length ?? 0) === 0) return false;
    return true;
  }

  const done = questions.filter(answered).length;
  const ready = done === questions.length;
  const q = questions[step];
  const value = values[q.key] ?? "";
  const shots = previews[q.key] ?? [];
  const last = step === questions.length - 1;
  const canGo = answered(q);

  /** Why Tiếp is still grey, in the buyer's own terms. */
  const hint = !value
    ? q.options.length > 0
      ? "Chọn một câu trả lời để qua câu tiếp theo."
      : "Ghi câu trả lời để qua câu tiếp theo."
    : wantsPhoto(q, value) && shots.length === 0
      ? "Gửi kèm ảnh rồi mới qua được câu sau."
      : last
        ? ready
          ? "Đủ rồi, gửi để shop bắt đầu kiểm tra."
          : `Còn ${questions.length - done} mục chưa trả lời.`
        : "Xong câu này, bấm Tiếp.";

  async function submit() {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("ticket", ticketId);
      for (const question of questions) {
        form.set(`value-${question.key}`, (values[question.key] ?? "").trim());
        for (const file of files[question.key] ?? []) {
          form.append(`image-${question.key}`, file);
        }
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
            Shop chỉ bắt đầu kiểm tra khi đủ các mục dưới đây. Trả lời từng câu
            rồi bấm Tiếp, khỏi phải chờ shop hỏi lại.
          </p>
        </div>
        {/* Where the buyer is, not how much is left: with one question on
            screen, the position is what they want to know. */}
        <span
          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[12px] font-black tabular-nums ${
            ready
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/10 bg-white/[0.04] text-neutral-400"
          }`}
        >
          {step + 1}/{questions.length}
        </span>
      </div>

      <div>
        <div className="mb-3">
          <h2 className="flex flex-wrap items-center gap-1.5 text-[13px] font-black uppercase tracking-widest text-white">
            {step + 1}. {q.label}
            <span aria-hidden className="text-[var(--menzu-accent)]">
              *
            </span>
            <span className="sr-only">(bắt buộc)</span>
          </h2>
        </div>
        <p className="-mt-2 mb-3 text-[13px] text-neutral-400">{q.hint}</p>

        {q.options.length > 0 ? (
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
          <div className="mt-3 flex flex-col gap-2">
            {shots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {shots.map((url, index) => (
                  <div
                    key={url}
                    className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-950"
                  >
                    <Image
                      src={url}
                      alt={`Ảnh ${index + 1} cho ${q.label}`}
                      width={600}
                      height={340}
                      unoptimized
                      className="h-[120px] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => drop(q.key, index)}
                      aria-label={`Bỏ ảnh ${index + 1} của ${q.label}`}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-black/70 text-neutral-300 transition-colors hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {shots.length < IMAGES_PER_ANSWER ? (
              // The first round's panel, so both rounds take a picture the
              // same way, except this one takes a handful at once.
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-white/[0.04]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-neutral-300">
                  <ImagePlus className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-neutral-200">
                    {shots.length === 0
                      ? "Kéo và thả ảnh vào đây, hoặc bấm để chọn ảnh"
                      : `Thêm ảnh nữa (${shots.length}/${IMAGES_PER_ANSWER})`}
                  </span>
                  <span className="block text-[12px] text-neutral-500">
                    PNG, JPG hoặc WebP, tối đa 5MB mỗi ảnh. Chọn nhiều ảnh một
                    lần cũng được, nhiều nhất {IMAGES_PER_ANSWER} ảnh cho một câu.
                  </span>
                </span>
                <input
                  ref={(node) => {
                    inputs.current[q.key] = node;
                  }}
                  type="file"
                  accept={TYPES.join(",")}
                  multiple
                  className="hidden"
                  onChange={(event) => add(q.key, event.target.files)}
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <span className="flex flex-col gap-1">
          <span className="text-[13px] text-neutral-400">{hint}</span>
          <span className="text-[12px] tabular-nums text-neutral-500">
            Đã trả lời {done}/{questions.length}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setStep(step - 1);
                setError(null);
              }}
              className={GHOST}
            >
              <ChevronLeft className="h-4 w-4" />
              Quay lại
            </button>
          ) : null}
          {last ? (
            <button type="button" onClick={submit} disabled={busy || !ready} className={PRIMARY}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {busy ? "Đang gửi…" : "Gửi thông tin bổ sung"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStep(step + 1);
                setError(null);
              }}
              disabled={!canGo}
              className={PRIMARY}
            >
              Tiếp
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
