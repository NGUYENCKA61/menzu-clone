"use client";

import { Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The review a buyer leaves on one of their own orders, from the row it sits
 * on in Lịch sử mua.
 *
 * A small tag on the row ("★ Đánh giá") that opens a small box: stars, a few
 * words, an anonymous switch, nothing else. The order is the proof — the
 * shop already knows what was bought, for how much, and that it was paid —
 * so nothing is asked twice. One review per order, enforced by the API; the
 * reviews page's free-form composer stays for anyone who bought before there
 * were orders to point at.
 *
 * The tag lives inside the receipt's trigger, so its clicks stop there: a
 * press on "Đánh giá" must not also open the receipt behind it.
 */
export function OrderReviewTag({
  orderId,
  reviewed,
}: {
  orderId: string;
  /** A review already exists for this order (approved or still waiting). */
  reviewed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(reviewed);

  if (done) {
    return (
      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
        ★ Đã đánh giá
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        className="text-[10px] font-black uppercase tracking-wider text-[var(--menzu-accent)] transition-colors hover:text-white"
      >
        ★ Đánh giá
      </button>
      {open ? (
        <ReviewDialog orderId={orderId} onClose={() => setOpen(false)} onDone={() => setDone(true)} />
      ) : null}
    </>
  );
}

function ReviewDialog({
  orderId,
  onClose,
  onDone,
}: {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      setSent(true);
      onDone();
    } catch {
      setError("Không gửi được, thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  // Stopped at the card: the dialog is rendered through a portal, but React
  // still bubbles its events up the component tree, into the receipt's
  // trigger this tag sits in.
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        stop(event);
        onClose();
      }}
      onKeyDown={stop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Đánh giá đơn hàng"
        onClick={stop}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-[#0c0d12] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-wider text-white">
            Đánh giá đơn hàng
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1 text-neutral-500 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <p className="text-sm text-neutral-300">
            Cảm ơn bạn! Đánh giá đã gửi, admin duyệt xong sẽ hiện ngoài trang đánh giá.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
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
                    className={`h-7 w-7 transition-colors ${
                      n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-neutral-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 1000))}
              rows={4}
              autoFocus
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
            <button
              type="button"
              onClick={submit}
              disabled={submitting || body.trim().length < 5}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--menzu-accent)] px-5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Đang gửi…" : "Gửi đánh giá"}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
