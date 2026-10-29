"use client";

import { Headset, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** One line of the conversation as the panel holds it. */
interface Turn {
  role: "user" | "assistant" | "admin";
  content: string;
}

/** The thread's holder, as the server names it. */
type ThreadStatus = "BOT" | "NEED_ADMIN" | "DONE";

/** The server's wire shape for one stored message. */
interface WireMessage {
  role: "CUSTOMER" | "BOT" | "ADMIN";
  body: string;
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

const WIRE_ROLE: Record<WireMessage["role"], Turn["role"]> = {
  CUSTOMER: "user",
  BOT: "assistant",
  ADMIN: "admin",
};

/**
 * The chat half of the support panel, wired to the CRM desk (29/10/2026).
 *
 * The conversation is stored server-side with its thread: reopening the
 * panel restores it, and while it is open a slow poll brings the admin's
 * answers in. When the thread is handed to the admin — the customer pressed
 * "Gặp admin", or the server's rules caught a money question — the bot goes
 * quiet, a banner says who answers next, and the box keeps working so the
 * customer can add detail.
 */
export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<ThreadStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  busyRef.current = busy;

  // Keep the newest line in view as answers arrive.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [turns, busy, status]);

  // Restore on open, then poll while the panel is up. The poll replaces the
  // whole (small) conversation rather than diffing ids, and stands aside
  // while a send is in flight so it cannot eat an optimistic line.
  useEffect(() => {
    let stopped = false;

    async function pull() {
      try {
        const response = await fetch("/api/assistant/thread");
        if (!response.ok) return;
        const data = (await response.json()) as {
          thread: { status: ThreadStatus; messages: WireMessage[] } | null;
        };
        if (stopped || busyRef.current || !data.thread) return;
        // A closed conversation is over: open with a clean slate instead of
        // a transcript nobody can answer into.
        if (data.thread.status === "DONE") {
          setStatus(null);
          setTurns((current) => (current.length > 0 ? [] : current));
          return;
        }
        setStatus(data.thread.status);
        setTurns(
          data.thread.messages.map((m) => ({ role: WIRE_ROLE[m.role], content: m.body })),
        );
      } catch {
        // The poll is a convenience; the next tick tries again.
      }
    }

    void pull();
    const timer = setInterval(() => void pull(), 10_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

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
        body: JSON.stringify({
          // The admin's lines ride as assistant turns: a model answering
          // after them should treat them as the shop's own words.
          messages: next.map((turn) => ({
            role: turn.role === "user" ? "user" : "assistant",
            content: turn.content,
          })),
        }),
      });
      const data = (await response.json()) as {
        reply?: string;
        status?: ThreadStatus;
        error?: string;
      };

      if (data.status) setStatus(data.status);
      if (!response.ok) {
        setError(data.error ?? "Trợ lý đang bận, bạn thử lại sau nhé.");
        return;
      }
      if (data.reply) {
        setTurns((current) => [...current, { role: "assistant", content: data.reply! }]);
      }
      // An ok answer with no reply means the admin holds the thread now: the
      // banner says so, and the customer's line is already stored.
    } catch {
      setError("Không kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  /** The customer asks for a human; the server pings the desk once. */
  async function callAdmin() {
    if (calling || status === "NEED_ADMIN") return;
    setCalling(true);
    setError(null);
    try {
      const response = await fetch("/api/assistant/handoff", { method: "POST" });
      if (response.ok) setStatus("NEED_ADMIN");
      else setError("Chưa gọi được admin, bạn thử lại nhé.");
    } catch {
      setError("Không kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại nhé.");
    } finally {
      setCalling(false);
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
          <span className="inline-flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-white/[0.04] px-3 py-2 text-[13px] text-neutral-400">
            <Loader2 size={13} className="animate-spin" />
            {status === "NEED_ADMIN" ? "Đang gửi…" : "Đang trả lời…"}
          </span>
        ) : null}

        {status === "NEED_ADMIN" ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] leading-relaxed text-amber-200">
            Đã chuyển cho admin, admin sẽ trả lời ngay tại đây. Bạn cứ nhắn thêm
            chi tiết (tên đăng nhập, mã đơn…) trong lúc chờ nhé.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] leading-relaxed text-red-300">
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
                className="self-start rounded-full border border-white/10 px-3 py-1.5 text-left text-[13px] text-neutral-300 transition-colors hover:border-[var(--brand)]/50 hover:text-white"
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
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-[13px] text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--brand)]/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          aria-label="Gửi"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-dark)] text-white transition-colors hover:bg-[var(--brand)] disabled:opacity-40"
        >
          <SendHorizontal size={15} />
        </button>
      </form>

      {/* The way past the machine, always on screen: money, orders and keys
          are the admin's desk, and the server hands over on its own when it
          hears them. */}
      <div className="flex items-start justify-between gap-2 px-3 pb-2.5">
        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-neutral-500">
          <Sparkles size={11} className="mt-[1px] shrink-0" />
          Trợ lý AI tư vấn sản phẩm và cài đặt. Chuyện đơn hàng, nạp tiền thì bấm
          Gặp admin.
        </p>
        {status === "NEED_ADMIN" ? null : (
          <button
            type="button"
            onClick={() => void callAdmin()}
            disabled={calling}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12px] font-bold text-neutral-300 transition-colors hover:border-[var(--brand)]/50 hover:text-white disabled:opacity-50"
          >
            {calling ? <Loader2 size={11} className="animate-spin" /> : <Headset size={11} />}
            Gặp admin
          </button>
        )}
      </div>
    </div>
  );
}

/** One line, sided and coloured by who said it. */
function Bubble({ role, children }: { role: Turn["role"]; children: React.ReactNode }) {
  if (role === "admin") {
    return (
      <div className="flex max-w-[85%] flex-col gap-1 self-start">
        <span className="px-1 text-[11px] font-bold uppercase tracking-wide text-[var(--brand)]">
          Admin
        </span>
        <p className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-2 text-[13px] leading-relaxed text-white">
          {children}
        </p>
      </div>
    );
  }
  const mine = role === "user";
  return (
    <p
      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
        mine
          ? "self-end rounded-br-sm bg-[var(--brand)]/20 text-white"
          : "self-start rounded-bl-sm bg-white/[0.04] text-neutral-200"
      }`}
    >
      {children}
    </p>
  );
}
