"use client";

import { Loader2, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** One line of the conversation as the panel holds it. */
interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** Mirrors MAX_QUESTION on the server, so the box stops before the API does. */
const MAX_QUESTION = 1000;

/** What the assistant says before anyone has asked anything. */
const GREETING =
  "Chào bạn 👋 Mình là trợ lý của shop. Bạn cần tư vấn chọn hack cho game nào, " +
  "hay đang gặp lỗi lúc cài đặt?";

/**
 * Openers, so the first message is one tap rather than a blank box. Both are
 * the two jobs this assistant actually has.
 */
const PROMPTS = [
  "Mình chơi CS2, nên mua gói nào?",
  "Mua rồi mà cài không chạy, làm sao?",
];

/**
 * The chat half of the support panel.
 *
 * The whole conversation lives in this component and nowhere else: closing the
 * panel or moving to another page starts a fresh one. That is deliberate for
 * now — a transcript that survives is a transcript that has to be stored, and
 * the shop is not storing what customers type.
 */
export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest line in view as answers arrive.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [turns, busy]);

  async function send(text: string) {
    const question = text.trim().slice(0, MAX_QUESTION);
    if (!question || busy) return;

    const next = [...turns, { role: "user" as const, content: question }];
    setTurns(next);
    setDraft("");
    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        setError(data.error ?? "Trợ lý đang bận, bạn thử lại sau nhé.");
        return;
      }
      setTurns((current) => [...current, { role: "assistant", content: data.reply! }]);
    } catch {
      setError("Không kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div
        ref={scrollRef}
        className="flex max-h-[280px] min-h-[180px] flex-col gap-2.5 overflow-y-auto p-3"
      >
        {/* The greeting is drawn, never sent: it is the shop's own words, and
            paying the model to say hello would be paying for a constant. */}
        <Bubble role="assistant">{GREETING}</Bubble>

        {turns.map((turn, index) => (
          <Bubble key={index} role={turn.role}>
            {turn.content}
          </Bubble>
        ))}

        {busy ? (
          <span className="inline-flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-white/[0.04] px-3 py-2 text-[12px] text-neutral-400">
            <Loader2 size={13} className="animate-spin" />
            Đang trả lời…
          </span>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] leading-relaxed text-red-300">
            {error}
          </p>
        ) : null}

        {/* Only before the first question: once there is a conversation these
            would be answering something the visitor has moved past. */}
        {turns.length === 0 && !busy ? (
          <div className="mt-0.5 flex flex-col gap-1.5">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-[11px] text-neutral-300 transition-colors hover:border-[var(--brand)]/50 hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
        className="flex items-center gap-2 border-t border-white/5 p-2"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_QUESTION}
          disabled={busy}
          placeholder="Nhập câu hỏi…"
          aria-label="Câu hỏi cho trợ lý"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-[12px] text-white outline-none transition-colors placeholder-neutral-600 focus:border-[var(--brand)]/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          aria-label="Gửi"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white transition-colors hover:bg-[var(--brand-dark)] disabled:opacity-40"
        >
          <SendHorizontal size={15} />
        </button>
      </form>

      {/* Said once, quietly, under the box rather than in every answer: the
          thing answering is a machine reading the shop's catalogue, and it
          cannot see anybody's order. A customer who knows that asks the admin
          for the things only the admin can do. */}
      <p className="flex items-start gap-1.5 px-3 pb-2.5 text-[10px] leading-relaxed text-neutral-500">
        <Sparkles size={11} className="mt-[1px] shrink-0" />
        Trợ lý AI tư vấn sản phẩm và hướng dẫn cài đặt. Không xem được đơn hàng hay
        số dư — việc đó bấm &quot;Nhắn admin&quot; ở trên.
      </p>
    </div>
  );
}

/** One line, sided and coloured by who said it. */
function Bubble({ role, children }: { role: Turn["role"]; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <p
      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
        mine
          ? "self-end rounded-br-sm bg-[var(--brand)]/20 text-white"
          : "self-start rounded-bl-sm bg-white/[0.04] text-neutral-200"
      }`}
    >
      {children}
    </p>
  );
}
