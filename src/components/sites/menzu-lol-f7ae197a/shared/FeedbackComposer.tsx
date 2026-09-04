"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  Check,
  ChevronDown,
  CircleCheck,
  CircleCheckBig,
  ImagePlus,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  ShoppingCart,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  ReviewAvatar,
  ServiceChip,
  StarRow,
  VerifiedBadge,
} from "./FeedbackBoard";

/** Who is writing — identity comes from the account, not a Facebook link. */
export interface ComposerUser {
  username: string;
  avatarUrl: string | null;
}

const SERVICES: { value: string; icon: LucideIcon }[] = [
  { value: "MUA KEY", icon: KeyRound },
  { value: "MUA ACC", icon: ShoppingCart },
  { value: "NẠP TIỀN", icon: Banknote },
  { value: "KHÁC", icon: MessageSquare },
];

const LABEL = "block text-xs font-black uppercase tracking-wider text-neutral-500 mb-2";
const FIELD =
  "w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:border-[var(--menzu-accent)] focus:ring-1 focus:ring-[var(--menzu-accent)]/30 outline-none transition-all";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * The write-review screen: form on the left, a live preview of the finished
 * card on the right, the policy box under it. Submissions land in the
 * moderation queue — the success screen says so instead of pretending the
 * review is already up.
 */
export function FeedbackComposer({ user, today }: { user: ComposerUser; today: string }) {
  const [name, setName] = useState(user.username);
  const [service, setService] = useState("MUA KEY");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [amount, setAmount] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!serviceOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!serviceRef.current?.contains(event.target as Node)) setServiceOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [serviceOpen]);

  // One object URL alive at a time, and none after unmount.
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  function pickFile(next: File | null) {
    setError(null);
    if (next && next.size > 5 * 1024 * 1024) {
      setError(`Ảnh tối đa 5MB. File này ${(next.size / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(next);
    setFilePreview(next ? URL.createObjectURL(next) : null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (!name.trim()) {
      setError("Nhập tên hiển thị");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("service", service);
      form.set("rating", String(rating));
      form.set("amount", amount);
      form.set("body", body.trim());
      form.set("anonymous", anonymous ? "1" : "0");
      if (file) form.set("image", file);

      const response = await fetch("/api/feedback", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Gửi đánh giá thất bại, thử lại nhé");
        return;
      }
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setSubmitting(false);
    }
  }

  const amountNumber = Number(amount || "0");
  const previewName = anonymous ? "Khách hàng ẩn danh" : name.trim() || "Tên của bạn";
  const ServiceIcon = SERVICES.find((s) => s.value === service)?.icon ?? KeyRound;

  const previewCard = (
    <div className="bg-neutral-900/40 border border-neutral-800/60 p-6 rounded-3xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3">
        <div className="bg-neutral-800 border border-neutral-700 text-neutral-400 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">
          Bản nháp
        </div>
      </div>
      <div className="flex gap-4 items-start mb-5">
        <ReviewAvatar name={previewName} avatarUrl={user.avatarUrl} anonymous={anonymous} />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-col gap-1 mb-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white truncate max-w-[150px]">
                {previewName}
              </h3>
              {anonymous ? null : <VerifiedBadge size="w-3 h-3" />}
              <ServiceChip service={service} small />
            </div>
            <span className="text-[10px] text-neutral-600 font-medium">{today} · Mới nhất</span>
          </div>
          <StarRow rating={rating} size={12} />
        </div>
      </div>
      {body.trim() ? (
        <p className="text-neutral-300 leading-relaxed text-sm whitespace-pre-wrap">
          “{body.trim()}”
        </p>
      ) : (
        <p className="text-neutral-600 text-sm italic">
          Nội dung đánh giá của bạn sẽ hiện ở đây...
        </p>
      )}
      {filePreview ? (
        <div className="mt-4 rounded-2xl overflow-hidden border border-neutral-800 w-fit max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={filePreview} alt="" className="w-full h-auto object-cover max-h-[260px]" />
        </div>
      ) : null}
      {amountNumber > 0 ? (
        <div className="mt-4 text-right flex flex-col items-end">
          <span className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.15em] mb-1">
            Trị giá giao dịch
          </span>
          <span className="text-2xl font-black text-[var(--menzu-accent)] tabular-nums leading-none">
            {formatVnd(amountNumber)}&nbsp;₫
          </span>
        </div>
      ) : null}
    </div>
  );

  if (done) {
    return (
      <div className="max-w-xl mx-auto bg-neutral-900/60 border border-neutral-800/60 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--menzu-accent)]/10 border border-[var(--menzu-accent)]/20 flex items-center justify-center">
          <CircleCheckBig size={26} className="text-[var(--menzu-accent)]" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">
          Đã gửi đánh giá
        </h2>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Cảm ơn bạn! Admin sẽ duyệt đánh giá trước khi hiển thị công khai trên trang Đánh
          giá.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/feedback"
            className="h-10 px-6 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white inline-flex items-center justify-center"
          >
            Xem trang đánh giá
          </Link>
          <Link
            href="/"
            className="h-10 px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-[11px] font-black uppercase tracking-widest text-neutral-300 inline-flex items-center justify-center"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-7 bg-neutral-900/60 border border-neutral-800/60 rounded-3xl p-6 sm:p-8">
        <form className="space-y-5" noValidate onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fb-name" className={LABEL}>
                Tên hiển thị <span className="text-red-500">*</span>
              </label>
              <input
                id="fb-name"
                type="text"
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                className={FIELD}
                placeholder="VD: NGUYEN VAN MUOI"
              />
            </div>
            <div className="relative" ref={serviceRef}>
              <label className={LABEL}>
                Dịch vụ <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setServiceOpen((v) => !v)}
                aria-expanded={serviceOpen}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm flex items-center justify-between hover:border-[var(--menzu-accent)]/50 transition-all focus:border-[var(--menzu-accent)]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[var(--menzu-accent)]">
                    <ServiceIcon size={16} />
                  </span>
                  <span className="font-bold tracking-wide">{service}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-neutral-500 transition-transform duration-300 ${serviceOpen ? "rotate-180" : ""}`}
                />
              </button>
              {serviceOpen ? (
                <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden z-20">
                  {SERVICES.map(({ value, icon: Icon }) => {
                    const active = value === service;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setService(value);
                          setServiceOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-all hover:bg-[var(--menzu-accent)]/10 group ${
                          active
                            ? "bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <span
                          className={`transition-colors ${
                            active ? "text-[var(--menzu-accent)]" : "text-neutral-500 group-hover:text-[var(--menzu-accent)]"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="font-bold">{value}</span>
                        {active ? <CircleCheck size={14} className="ml-auto text-[var(--menzu-accent)]" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {/* Where the original asks for a Facebook link to scrape an avatar,
              this shop already knows its reviewer — the picture on the account
              is the picture on the card. */}
          <div>
            <label className={LABEL}>
              Ảnh đại diện{" "}
              <span className="ml-1 font-normal normal-case tracking-normal text-[11px] text-neutral-600">
                (lấy tự động từ tài khoản của bạn)
              </span>
            </label>
            <div className="flex items-center gap-3">
              <div
                className={`shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center bg-neutral-900 transition-all ${
                  user.avatarUrl ? "border-[var(--menzu-accent)]/60" : "border-dashed border-neutral-700"
                }`}
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span aria-hidden className="text-sm font-black uppercase text-neutral-500">
                    {user.username.slice(0, 1)}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Muốn đổi ảnh? Cập nhật ở trang{" "}
                <Link href="/profile" className="text-[var(--menzu-accent)] hover:text-[var(--menzu-accent)] font-bold">
                  Tổng quan
                </Link>{" "}
                trước khi gửi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div>
              <label className={LABEL}>
                Đánh giá <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    title={`${n} sao`}
                    onClick={() => setRating(n)}
                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={28}
                      strokeWidth={1.5}
                      className={`transition-colors duration-200 ${
                        n <= rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-neutral-700 fill-neutral-800/60 hover:text-neutral-500"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="fb-amount" className={LABEL}>
                Trị giá GD
              </label>
              <div className="relative">
                <input
                  id="fb-amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount ? formatVnd(Number(amount)) : ""}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  className={`${FIELD} pr-12`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 text-[11px] font-bold pointer-events-none">
                  VNĐ
                </span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="fb-body" className={LABEL}>
              Lời đánh giá{" "}
              <span className="font-normal normal-case tracking-normal text-neutral-600 text-[11px]">
                (không bắt buộc)
              </span>
            </label>
            <textarea
              id="fb-body"
              rows={4}
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${FIELD} resize-none`}
              placeholder="Chia sẻ trải nghiệm của bạn..."
            />
          </div>

          <div>
            <span className={LABEL}>Ảnh đính kèm</span>
            {file && filePreview ? (
              <div className="relative w-fit">
                <div className="rounded-xl overflow-hidden border border-neutral-700 max-w-[240px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="" className="w-full h-auto object-cover max-h-[180px]" />
                </div>
                <button
                  type="button"
                  onClick={() => pickFile(null)}
                  aria-label="Bỏ ảnh"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-800 border border-neutral-600 text-neutral-300 hover:text-white hover:bg-red-500/80 transition-colors flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2.5 w-fit cursor-pointer bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 hover:border-neutral-600 text-neutral-400 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
                <ImagePlus size={16} />
                Chọn ảnh (max 5MB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                  anonymous
                    ? "bg-[var(--menzu-accent)] border-[var(--menzu-accent)]"
                    : "bg-neutral-900 border-neutral-700 group-hover:border-neutral-500"
                }`}
              >
                {anonymous ? <Check size={13} strokeWidth={3.5} className="text-black" /> : null}
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-neutral-300">Đăng ẩn danh</span>
              <p className="text-xs text-neutral-600 mt-0.5">
                Ẩn tên và ảnh đại diện, chỉ hiện &quot;Khách hàng ẩn danh&quot;
              </p>
            </div>
          </label>

          {error ? (
            <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-70 disabled:cursor-wait text-white font-black py-3.5 rounded-2xl mt-2 flex justify-center items-center gap-2 transition-colors uppercase tracking-wider text-sm"
          >
            {submitting ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </form>
      </div>

      <div className="hidden lg:block lg:col-span-5 sticky top-28">
        <div className="mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--menzu-accent)] animate-pulse" />
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">
            Preview
          </span>
        </div>
        {previewCard}

        <div className="mt-6 bg-neutral-900/40 border border-neutral-800/60 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={15} className="text-[var(--menzu-accent)]" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Chính sách đánh giá
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {[
              "Đánh giá cần trung thực và mang tính xây dựng.",
              "Nghiêm cấm ngôn từ kích động hoặc xúc phạm.",
              "Admin sẽ duyệt đánh giá trước khi hiển thị công khai.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--menzu-accent)] shrink-0 mt-1.5" />
                <span className="text-xs text-neutral-400 leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
