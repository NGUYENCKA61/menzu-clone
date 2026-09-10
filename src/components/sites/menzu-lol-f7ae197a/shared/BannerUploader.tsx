"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, MoreHorizontal, Trash2 } from "lucide-react";

import { StatusToast } from "./StatusToast";

export interface BannerUploaderProps {
  /** Whether this member has a cover of their own to remove. */
  hasOwn: boolean;
}

/**
 * The cover picture's edit control, sitting on the banner it changes.
 *
 * One quiet dot button rather than a row of them: a bare ✕ parked on a
 * member's own photograph reads as "close this", and every cover control the
 * big shops ship hides behind a single corner button. The menu names what
 * each choice does, which two icons never could.
 *
 * The picture appearing IS the confirmation — the same reason the avatar's
 * pencil shows no success toast. "Gỡ ảnh bìa" only exists once there is
 * something of the member's own to remove, and removing puts the shop's own
 * banner back rather than leaving a hole.
 */
export function BannerUploader({ hasOwn }: BannerUploaderProps) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A menu that outlives a click elsewhere is a menu in the way.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared now so picking the same file again still fires onChange.
    event.target.value = "";
    if (!file || pending) return;

    setError(null);
    setPending(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/profile/banner", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as {
        bannerUrl?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Không tải được ảnh lên, thử lại sau");
        return;
      }
      router.refresh();
    } catch {
      setError("Không tải được ảnh lên, thử lại sau");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/profile/banner", { method: "DELETE" });
      if (!response.ok) {
        setError("Không gỡ được ảnh, thử lại sau");
        return;
      }
      router.refresh();
    } catch {
      setError("Không gỡ được ảnh, thử lại sau");
    } finally {
      setPending(false);
    }
  }

  const ITEM =
    "flex h-9 w-full items-center gap-2.5 px-3 text-left text-[12.5px] font-semibold text-neutral-200 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-60";

  return (
    <div ref={wrap} className="absolute right-3 top-3 z-10">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tuỳ chọn ảnh bìa"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/40 text-neutral-200 backdrop-blur-md transition-colors hover:border-white/35 hover:bg-black/60 hover:text-white disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
        ) : (
          <MoreHorizontal size={16} />
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="drop-in absolute right-0 top-10 w-48 overflow-hidden rounded-xl border border-white/12 bg-[#14141a]/95 py-1 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              input.current?.click();
            }}
            className={ITEM}
          >
            <ImagePlus size={14} className="shrink-0 text-neutral-400" />
            {hasOwn ? "Đổi ảnh bìa" : "Tải ảnh bìa lên"}
          </button>
          {hasOwn ? (
            <button type="button" role="menuitem" onClick={handleRemove} className={ITEM}>
              <Trash2 size={14} className="shrink-0 text-neutral-400" />
              Gỡ ảnh bìa
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handlePick}
        className="hidden"
      />

      {error ? (
        <StatusToast
          tone="error"
          title="Không đổi được ảnh bìa"
          message={error}
          onClose={() => setError(null)}
        />
      ) : null}
    </div>
  );
}
