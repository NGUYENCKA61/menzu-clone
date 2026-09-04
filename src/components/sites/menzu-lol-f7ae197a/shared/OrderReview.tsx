"use client";

import { Check, Star } from "lucide-react";
import { useState } from "react";

/**
 * The review a buyer leaves on one of their own orders, from the receipt.
 *
 * Lives here rather than on the reviews page because the order is the proof:
 * the shop already knows what was bought, for how much, and that it was paid,
 * so the buyer picks stars and writes a line and nothing else. One review per
 * order, enforced by the API; the reviews page's free-form composer stays for
 * anyone who bought before there were orders to point at.
 */
export function OrderReview({
  orderId,
  reviewed,
}: {
  orderId: string;
  /** A review already exists for this order (approved or still waiting). */
  reviewed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(reviewed);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-[11px] font-black uppercase tracking-wider text-emerald-300">
        <Check className="h-4 w-4" />
        {reviewed ? "Đã đánh giá" : "Đã gửi · chờ duyệt"}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--menzu-accent)]/40 bg-transparent px-4 text-[11px] font-black uppercase tracking-wider text-[#ddd] transition-colors hover:bg-[var(--menzu-accent)]/10 hover:text-white"
      >
        <Star className="h-4 w-4 text-[var(--menzu-accent)]" />
        Đánh giá đơn này
      </button>
    );
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
      const response = await fetch("/api/feedback", { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Không gửi được, thử lại sau.");
        return;
      }
      setDone(true);
    } catch {
      setError("Không gửi được, thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Đánh giá đơn này
        </span>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
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
                className={`h-5 w-5 transition-colors ${
                  n <= (hover || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-neutral-600"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value.slice(0, 1000))}
        rows={3}
        placeholder="Tool dùng thế nào, giao key nhanh không, hỗ trợ ra sao…"
        className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-white/25"
      />
      <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-neutral-400">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(event) => setAnonymous(event.target.checked)}
          className="h-3.5 w-3.5 accent-[var(--menzu-accent)]"
        />
        Ẩn tên của tôi
      </label>
      {error ? (
        <p role="alert" className="text-[11px] font-semibold text-[var(--menzu-accent)]">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || body.trim().length < 5}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Đang gửi…" : "Gửi đánh giá"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-wider text-neutral-300 transition-colors hover:text-white"
        >
          Để sau
        </button>
        <span className="ml-auto text-[10px] text-neutral-600">
          Sau khi admin duyệt sẽ hiện ngoài trang đánh giá.
        </span>
      </div>
    </div>
  );
}
