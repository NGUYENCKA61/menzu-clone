"use client";

import { ImagePlus, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The tag on an order's row in Lịch sử mua: "★ Đánh giá" leads to the
 * order's own review page, "★ Đã đánh giá" says it is done. It sits inside
 * the receipt's trigger, so its click stops there — a press on the tag must
 * not also open the receipt behind it.
 */
export function OrderReviewTag({ href, reviewed }: { href: string; reviewed: boolean }) {
  if (reviewed) {
    return (
      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
        ★ Đã đánh giá
      </span>
    );
  }
  return (
    <Link
      href={href}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className="text-[10px] font-black uppercase tracking-wider text-[var(--menzu-accent)] transition-colors hover:text-white"
    >
      ★ Đánh giá
    </Link>
  );
}

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * The review itself, on the order's own page. Stars, a few words, a photo if
 * they like (the bill, a screenshot), an anonymous switch. The order is the
 * proof — the shop already knows what was bought, for how much, and that it
 * was paid — so nothing is asked twice. One review per order, enforced by
 * the API.
 */
export function OrderReviewForm({ orderId, onDone }: { orderId: string; onDone: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pick(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    if (next && next.size > MAX_BYTES) {
      setError(`Ảnh tối đa 5MB. File này ${(next.size / 1024 / 1024).toFixed(1)}MB.`);
      setFile(null);
      setPreview(null);
      return;
    }
    setError(null);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("orderId", orderId);
      form.set("rating", String(rating));
      form.set("body", body.trim());
      if (anonymous) form.set("anonymous", "1");
      if (file) form.set("image", file);
      const response = await fetch("/api/feedback", { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Không gửi được, thử lại sau.");
        return;
      }
      router.push(onDone);
      router.refresh();
    } catch {
      setError("Không gửi được, thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";
  const WORDS_MIN = 5;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className={LABEL}>Số sao</span>
        <div className="mt-2 flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} sao`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="p-0.5"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-neutral-600"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-[12px] font-bold text-neutral-400">
            {["", "Tệ", "Không ổn", "Tạm được", "Hài lòng", "Tuyệt vời"][hover || rating]}
          </span>
        </div>
      </div>

      <div>
        <span className={LABEL}>Nhận xét</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, 1000))}
          rows={5}
          placeholder="Tool dùng thế nào, giao key nhanh không, hỗ trợ ra sao…"
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-white/25"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
          <span className="text-neutral-500">Ít nhất {WORDS_MIN} ký tự, tối đa 1000.</span>
          <span className="tabular-nums text-neutral-600">{body.length}/1000</span>
        </div>
      </div>

      <div>
        <span className={LABEL}>Ảnh đính kèm (không bắt buộc)</span>
        {preview ? (
          <div className="relative mt-2 w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="max-h-[260px] w-full object-cover" />
            <button
              type="button"
              onClick={() => pick(null)}
              aria-label="Bỏ ảnh"
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/70 text-neutral-300 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="mt-2 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-wider text-neutral-200 transition-colors hover:bg-white/[0.08]">
            <ImagePlus className="h-4 w-4" />
            Chọn ảnh
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        )}
        <p className="mt-2 text-[11px] text-neutral-500">PNG, JPG hoặc WebP, tối đa 5MB.</p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-neutral-400">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(event) => setAnonymous(event.target.checked)}
          className="h-3.5 w-3.5 accent-[var(--menzu-accent)]"
        />
        Ẩn tên của tôi trên trang đánh giá
      </label>

      {error ? (
        <p role="alert" className="text-[12px] font-semibold text-[var(--menzu-accent)]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || body.trim().length < WORDS_MIN}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--menzu-accent)] px-6 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Đang gửi…" : "Gửi đánh giá"}
        </button>
        <span className="text-[11px] text-neutral-500">
          Admin duyệt xong sẽ hiện ngoài trang đánh giá, kèm dấu đã mua.
        </span>
      </div>
    </div>
  );
}
