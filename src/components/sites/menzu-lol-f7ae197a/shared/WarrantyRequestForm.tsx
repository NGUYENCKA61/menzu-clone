"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BadgeCheck,
  Check,
  CircleHelp,
  CloudDownload,
  ImagePlus,
  KeyRound,
  Loader2,
  Send,
  ShieldAlert,
  UserX,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  readVideoUrl,
  VIDEO_URL_MAX,
  WARRANTY_ISSUE,
  WARRANTY_ISSUES_FOR,
  type WarrantyIssue,
  type WarrantyKind,
} from "@/lib/warrantyRequests";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--menzu-accent)]/60";
const TYPES = ["image/png", "image/jpeg", "image/webp"];
/** A numbered section heading, with the red dot that says it is needed. */
function Step({
  n,
  title,
  need = false,
  note,
}: {
  n: number;
  title: string;
  need?: boolean;
  note?: string;
}) {
  return (
    <div className="mb-3">
      {/* The star alone (the owner, 10/10/2026: "bỏ đi"), with the word
          kept for a reader who cannot see it. The one section that is not
          required says so in its own note. */}
      <h2 className="flex flex-wrap items-center gap-1.5 text-[12px] font-black uppercase tracking-widest text-neutral-300">
        {n}. {title}
        {need ? (
          <>
            <span aria-hidden className="text-[var(--menzu-accent)]">
              *
            </span>
            <span className="sr-only">(bắt buộc)</span>
          </>
        ) : null}
        {note ? (
          <span className="font-bold normal-case tracking-normal text-neutral-500">
            ({note})
          </span>
        ) : null}
      </h2>
    </div>
  );
}

/**
 * A glyph per fault, and a colour for it (the owner, 10/10/2026: "mấy icon
 * key tool bị khóa không cài được lỗi khác thêm màu cho nó đi"). Three hues
 * only, each meaning what it means everywhere else on the site: the shop's
 * red for the key, amber where something is blocked, sky where it is a
 * mismatch, and grey for "something else".
 */
const ISSUE_LOOK: Record<string, { icon: LucideIcon; tint: string }> = {
  KEY_INVALID: { icon: KeyRound, tint: "border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/12 text-[var(--menzu-accent)]" },
  DETECTED: { icon: ShieldAlert, tint: "border-amber-500/25 bg-amber-500/12 text-amber-400" },
  INSTALL: { icon: CloudDownload, tint: "border-sky-500/25 bg-sky-500/12 text-sky-400" },
  ACC_WRONG_LOGIN: { icon: KeyRound, tint: "border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/12 text-[var(--menzu-accent)]" },
  ACC_LOCKED: { icon: ShieldAlert, tint: "border-amber-500/25 bg-amber-500/12 text-amber-400" },
  ACC_RECLAIMED: { icon: UserX, tint: "border-amber-500/25 bg-amber-500/12 text-amber-400" },
  ACC_NOT_AS_DESCRIBED: { icon: CircleHelp, tint: "border-sky-500/25 bg-sky-500/12 text-sky-400" },
  OTHER: { icon: CircleHelp, tint: "border-white/10 bg-white/[0.04] text-neutral-400" },
};


/** What the description box suggests, per kind of order. */
const PLACEHOLDER: Record<WarrantyKind, string> = {
  software:
    "Lỗi xuất hiện lúc nào, thông báo hiện ra là gì, đã thử cách gì chưa (cài lại, tắt antivirus, đổi mạng…). Càng rõ shop xử lý càng nhanh.",
  account:
    "Lỗi xuất hiện lúc nào (khi đăng nhập, khi vào game…), game báo gì, đã thử cách gì chưa. Càng rõ shop xử lý càng nhanh.",
};

/**
 * The form on the warranty page: what kind of trouble, what happened, and the
 * picture that shows it. The kind is a row of tiles rather than a select so
 * the choices are read before one is picked. A tool's and an account's
 * choices differ (the owner, 08/10/2026), and an account's report also needs
 * the link to the screen recording its warranty rests on.
 */
export function WarrantyRequestForm({
  code,
  kind,
  onDone,
}: {
  code: string;
  /** The order's kind: which faults to offer, and whether a video is due. */
  kind: WarrantyKind;
  /** Where to send the buyer once it lands. */
  onDone: string;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState<WarrantyIssue | null>(null);
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // One object URL alive at a time, made where the file is picked. Made in
  // render it ran twice under StrictMode and leaked one per pick; set from
  // an effect it was a render for nothing. The unmount effect revokes the
  // last one.
  const pickFile = (next: File | null) => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next);
  };
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
  }, []);

  const short = description.trim().length < DESCRIPTION_MIN;
  const left = DESCRIPTION_MIN - description.trim().length;
  const needsVideo = kind === "account";
  const video = readVideoUrl(videoUrl);
  const ready = issue !== null && !short && (!needsVideo || video.ok);

  async function submit() {
    if (busy || !ready || issue === null) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("code", code);
      form.set("issue", issue);
      form.set("description", description);
      if (needsVideo) form.set("videoUrl", videoUrl.trim());
      if (file) form.set("image", file);
      const res = await fetch("/api/warranty-requests", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Không gửi được yêu cầu");
        setBusy(false);
        return;
      }
      // Only a failure gives the button back. On success the page is about to
      // change; a button that revived first invited a second send.
      router.push(onDone);
      router.refresh();
      // If the page has not changed in eight seconds, something upstream is
      // stuck; give the button back rather than leave it dead.
      window.setTimeout(() => setBusy(false), 8000);
    } catch {
      setError("Không kết nối được máy chủ");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Step n={1} title="Bạn gặp lỗi gì?" need />
        <p className="-mt-2 mb-3 text-[11.5px] text-neutral-500">
          Chọn loại sự cố gần nhất để shop xử lý đúng quy trình.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {WARRANTY_ISSUES_FOR[kind].map((key, index, all) => {
            const on = issue === key;
            // An odd count leaves the last tile half a row wide beside
            // nothing; it spans both columns instead (the owner, 10/10/2026).
            const wide = all.length % 2 === 1 && index === all.length - 1;
            const look = ISSUE_LOOK[key] ?? ISSUE_LOOK.OTHER;
            const Glyph = look.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setIssue(key);
                  setError(null);
                }}
                aria-pressed={on}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  wide ? "sm:col-span-2" : ""
                } ${
                  on
                    ? "border-[var(--menzu-accent)]/60 bg-[var(--menzu-accent)]/10"
                    : "border-white/10 bg-neutral-950/60 hover:border-white/25"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${look.tint}`}
                >
                  <Glyph className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-bold ${on ? "text-white" : "text-neutral-200"}`}>
                    {WARRANTY_ISSUE[key].label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-neutral-500">
                    {WARRANTY_ISSUE[key].hint}
                  </span>
                </span>
                {/* The tick only on the one chosen, so the row reads at a
                    glance which it is. */}
                {on ? (
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--menzu-accent)] text-white">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-5">
        <Step n={2} title="Mô tả chi tiết lỗi" need />
        <label htmlFor="warranty-description" className="sr-only">
          Mô tả lỗi
        </label>
        <textarea
          id="warranty-description"
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, DESCRIPTION_MAX))}
          rows={5}
          placeholder={PLACEHOLDER[kind]}
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

      {needsVideo ? (
        <div className="border-t border-white/[0.06] pt-5">
          <Step n={3} title="Link video quay màn hình" need />
          <label htmlFor="warranty-video" className="sr-only">
            Link video quay màn hình
          </label>
          <div className="relative">
            <Video
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              aria-hidden
            />
            <input
              id="warranty-video"
              type="url"
              inputMode="url"
              value={videoUrl}
              onChange={(event) => {
                setVideoUrl(event.target.value.slice(0, VIDEO_URL_MAX));
                setError(null);
              }}
              placeholder="https://youtube.com/… hoặc https://drive.google.com/…"
              className={`${FIELD} pl-11`}
            />
          </div>
          <p
            className={`mt-2 text-[11px] font-semibold ${
              videoUrl.trim() && !video.ok ? "text-rose-300" : "text-neutral-500"
            }`}
          >
            {videoUrl.trim() && !video.ok
              ? video.error
              : "Video quay liền mạch từ lúc bấm Lấy thông tin đến khi đăng nhập vào game. Thiếu video, shop từ chối bảo hành."}
          </p>
        </div>
      ) : null}

      <div className="border-t border-white/[0.06] pt-5">
        <Step n={needsVideo ? 4 : 3} title="Ảnh chụp màn hình lỗi" note="khuyến dùng để được duyệt nhanh" />
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
                pickFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Bỏ ảnh"
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/70 text-neutral-300 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // A whole panel to aim at, not a small button: the picture is
          // what gets a report approved fastest (the owner, 10/10/2026).
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-white/[0.04]">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="text-[12.5px] font-bold text-neutral-200">
              Kéo và thả ảnh chụp màn hình vào đây, hoặc bấm để chọn ảnh
            </span>
            <span className="text-[11px] text-neutral-500">
              PNG, JPG hoặc WebP, tối đa 5MB.{" "}
              {kind === "account"
                ? "Ảnh màn hình báo lỗi khi đăng nhập giúp shop xử lý nhanh hơn nhiều."
                : "Ảnh thông báo lỗi hoặc màn hình tool giúp shop xử lý nhanh hơn nhiều."}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                pickFile(picked);
                setError(null);
              }}
            />
          </label>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      {/* The promise on the left, the send on the right, parted from the
          form by a rule, as the owner drew it. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <span className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-[11.5px] text-neutral-400">
            <BadgeCheck className="h-4 w-4 shrink-0 text-neutral-500" />
            Shop cam kết đổi key hoặc hoàn tiền nếu lỗi từ phía shop.
          </span>
          <span className="pl-6 text-[11px] text-neutral-500">
            Shop trả lời trên chuông thông báo và trong lịch sử mua hàng.
          </span>
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !ready}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--menzu-accent)]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send className="h-4 w-4" />}
          {busy ? "Đang gửi…" : "Gửi yêu cầu bảo hành"}
        </button>
      </div>
    </div>
  );
}
