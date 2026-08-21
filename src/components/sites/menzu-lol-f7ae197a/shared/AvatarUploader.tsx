"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";

import { StatusToast } from "./StatusToast";

export interface AvatarUploaderProps {
  avatarUrl: string | null;
  username: string;
}

/**
 * The profile card's avatar with a working edit badge: the pencil opens the
 * picker, the picked file goes straight to /api/profile/avatar, and a
 * router.refresh() re-renders every server component that draws this picture
 * — header, sidebar, and the card itself — from the updated row. No success
 * toast on purpose: the new face appearing everywhere IS the confirmation.
 */
export function AvatarUploader({ avatarUrl, username }: AvatarUploaderProps) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as {
        avatarUrl?: string;
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

  return (
    <div className="relative shrink-0">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/50">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="text-2xl font-black uppercase text-neutral-500"
          >
            {username.slice(0, 1)}
          </span>
        )}
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
            <Loader2 size={18} className="animate-spin text-white" />
          </span>
        ) : null}
      </div>

      <button
        type="button"
        title="Đổi ảnh đại diện"
        aria-label="Đổi ảnh đại diện"
        disabled={pending}
        onClick={() => input.current?.click()}
        className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0e0f14] bg-[var(--brand)] text-white transition-colors hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Pencil size={10} />
      </button>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handlePick}
      />

      {error ? (
        <StatusToast
          tone="error"
          title="Đổi ảnh thất bại"
          message={error}
          onClose={() => setError(null)}
        />
      ) : null}
    </div>
  );
}
