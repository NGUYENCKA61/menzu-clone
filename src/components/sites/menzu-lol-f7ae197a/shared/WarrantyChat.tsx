"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Lock, Send, X } from "lucide-react";

import { WarrantyThread, type ThreadOpening } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyThread";
import {
  mergeMessages,
  MESSAGE_MAX,
  POLL_MS,
  readMessage,
  type ChatMessage,
} from "@/lib/warrantyChat";
import { warrantyOpen, type WarrantyStatus } from "@/lib/warrantyRequests";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const IMAGE_MAX = 5 * 1024 * 1024;

/**
 * The buyer's conversation with the shop on one warranty ticket (the owner,
 * 01/10/2026): open until the shop marks it fixed or refunds it, read-only
 * after. While open, the page asks for new messages every few seconds when
 * it is on screen, and reloads itself when the shop has moved the ticket so
 * the status, the refund box and this box all follow.
 */
export function WarrantyChat({
  ticketId,
  status,
  opening,
  initial,
}: {
  ticketId: string;
  status: WarrantyStatus;
  opening: ThreadOpening;
  initial: ChatMessage[];
}) {
  const router = useRouter();
  // What this tab sent or fetched since the page was drawn; shown merged with
  // the server's thread, each message once.
  const [extra, setExtra] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const open = warrantyOpen(status);
  const messages = useMemo(() => mergeMessages(initial, extra), [initial, extra]);

  const cursor = useRef(opening.sentAt);
  useEffect(() => {
    cursor.current = messages.at(-1)?.sentAt ?? opening.sentAt;
  }, [messages, opening.sentAt]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(
          `/api/warranty-requests/messages?ticket=${encodeURIComponent(ticketId)}&after=${encodeURIComponent(cursor.current)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { status?: WarrantyStatus; messages?: ChatMessage[] };
        const fresh = data.messages ?? [];
        if (fresh.length > 0) setExtra((prev) => mergeMessages(prev, fresh));
        if (data.status && data.status !== status) router.refresh();
      } catch {
        // The next tick tries again.
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, ticketId, status, router]);

  function pick(chosen: File | undefined) {
    if (fileInput.current) fileInput.current.value = "";
    if (!chosen) return;
    if (!IMAGE_TYPES.includes(chosen.type)) {
      setError("Ảnh chỉ nhận PNG, JPG hoặc WebP");
      return;
    }
    if (chosen.size > IMAGE_MAX) {
      setError(`Ảnh tối đa 5MB. File này ${(chosen.size / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }
    setError(null);
    setFile(chosen);
  }

  async function send() {
    if (busy) return;
    const said = readMessage(text, file !== null);
    if (!said.ok) {
      setError(said.error);
      return;
    }
    // Cleared at once, so whatever is typed or attached while this one is on
    // its way belongs to the next message — and handed back only if this one
    // failed and nothing new has been written since.
    const sentText = text;
    const sentFile = file;
    const giveBack = () => {
      setText((current) => current || sentText);
      setFile((current) => current ?? sentFile);
    };
    setBusy(true);
    setError(null);
    setText("");
    setFile(null);
    try {
      const form = new FormData();
      form.set("ticket", ticketId);
      form.set("body", said.body);
      if (sentFile) form.set("image", sentFile);
      const res = await fetch("/api/warranty-requests/messages", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { message?: ChatMessage; error?: string };
      if (!res.ok || !data.message) {
        setError(data.error ?? "Không gửi được tin nhắn");
        giveBack();
        return;
      }
      const sent = data.message;
      setExtra((prev) => mergeMessages(prev, [sent]));
    } catch {
      setError("Không kết nối được máy chủ");
      giveBack();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
        Trao đổi với shop
      </span>
      <div className="mt-3">
        <WarrantyThread viewer="buyer" buyerName="Bạn" opening={opening} messages={messages} />
      </div>

      {open ? (
        <div className="mt-4">
          {file ? (
            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11.5px] text-neutral-300">
              <ImagePlus className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Bỏ ảnh"
                className="shrink-0 text-neutral-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              aria-label="Gửi ảnh"
              title="Gửi ảnh"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(event) => pick(event.target.files?.[0])}
            />
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends where there is a keyboard; on a phone it is a
                // new line and the button sends. Never mid-composition — a
                // Vietnamese keyboard is still building the letter.
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  !window.matchMedia("(pointer: coarse)").matches
                ) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={Math.min(5, Math.max(1, text.split("\n").length))}
              maxLength={MESSAGE_MAX}
              placeholder="Nhắn cho shop…"
              aria-label="Nhắn cho shop"
              className="min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm leading-snug text-white placeholder-neutral-600 outline-none transition-colors focus:border-[var(--menzu-accent)]/60"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || (!text.trim() && !file)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-3.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{busy ? "Đang gửi…" : "Gửi"}</span>
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-[12px] font-semibold text-rose-300">{error}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-[12px] text-neutral-500">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Yêu cầu đã xử lý xong nên khung trao đổi đã đóng.
        </p>
      )}
    </div>
  );
}
