"use client";

import { ArrowDown, ArrowUp, Plus, Save, X } from "lucide-react";
import { useState } from "react";

import {
  OPTION_HINT_MAX,
  OPTION_MAX,
  OPTIONS_MAX,
  parseQuestionSet,
  PLACEHOLDER_MAX,
  QUESTION_HINT_MAX,
  QUESTION_LABEL_MAX,
  QUESTION_SHORT_MAX,
  QUESTIONS_MAX,
  type DetailQuestion,
} from "@/lib/warrantyDetails";

const CARD =
  "rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col gap-4";
const CARD_HEAD = "text-[15px] font-semibold text-white";
const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL =
  "text-[12px] font-semibold text-neutral-500";
const GHOST =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[11px] font-bold text-neutral-300 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";
const ICON =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-neutral-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

/** A question as the editor holds it: the stored shape, every field a string. */
interface Draft {
  key: string;
  label: string;
  short: string;
  hint: string;
  /** Typed answer (no tiles) when true. */
  typed: boolean;
  placeholder: string;
  options: { value: string; hint: string }[];
  photo: boolean;
  /** "" means whichever answer is picked. */
  photoWhen: string;
}

function toDraft(q: DetailQuestion): Draft {
  return {
    key: q.key,
    label: q.label,
    short: q.short,
    hint: q.hint,
    typed: q.options.length === 0,
    placeholder: q.placeholder ?? "",
    options: q.options.map((o) => ({ value: o.value, hint: o.hint })),
    photo: q.photo === true,
    photoWhen: q.photoWhen ?? "",
  };
}

function toStored(d: Draft): Record<string, unknown> {
  return {
    key: d.key,
    label: d.label,
    short: d.short,
    hint: d.hint,
    options: d.typed ? [] : d.options,
    ...(d.typed && d.placeholder ? { placeholder: d.placeholder } : {}),
    ...(d.photo ? { photo: true } : {}),
    ...(d.photo && !d.typed && d.photoWhen ? { photoWhen: d.photoWhen } : {}),
  };
}

/** A key no question in the list has yet: C1, C2… */
function freshKey(list: Draft[]): string {
  const taken = new Set(list.map((d) => d.key));
  for (let i = 1; ; i += 1) {
    const key = `C${i}`;
    if (!taken.has(key)) return key;
  }
}

/**
 * The second round's questions for one game or one product (the owner,
 * 12/10/2026: "tùy chỉnh câu hỏi cho từng sản phẩm, không phải game nào
 * cũng giống game nào", "mặc định cứ theo mẫu hiện tại").
 *
 * Two positions: inherit (the default set, or the game's where the game has
 * one) and a set of this screen's own, started from the bank so the shop
 * edits rather than types from nothing. Each question is the stored shape
 * laid out as fields; the bank's questions can be added back one at a time.
 * Saves on its own, to the same admin route the rest of the screen uses.
 */
export function WarrantyQuestionsEditor({
  endpoint,
  ident,
  initial,
  bank,
  inheritName,
}: {
  /** The admin route that takes "warrantyQuestions" beside `ident`. */
  endpoint: string;
  /** How that route names the row: { id } for a category, { code } for a product. */
  ident: Record<string, string>;
  /** What is stored now; anything unreadable means inherit. */
  initial: unknown;
  /** The questions to start from and to add back: the set this screen
   *  would inherit. */
  bank: readonly DetailQuestion[];
  /** "bộ mặc định" or "bộ của game Valorant", for the inherit option. */
  inheritName: string;
}) {
  const stored = parseQuestionSet(initial);
  const [custom, setCustom] = useState(stored !== null);
  const [list, setList] = useState<Draft[]>((stored ?? bank).map(toDraft));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (index: number, patch: Partial<Draft>) =>
    setList((now) => now.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const move = (index: number, by: number) =>
    setList((now) => {
      const next = [...now];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });
  const missing = bank.filter((q) => !list.some((d) => d.key === q.key));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const payload = custom ? list.map(toStored) : null;
      // Checked here first, so the message names the problem before the
      // round trip.
      if (payload && !parseQuestionSet(payload)) {
        setMsg({
          ok: false,
          text: "Mỗi câu cần tiêu đề, và hoặc không có đáp án (khách tự ghi), hoặc từ 2 đến 6 đáp án khác nhau.",
        });
        return;
      }
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ident, warrantyQuestions: payload }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error ?? "Không lưu được" });
        return;
      }
      setMsg({
        ok: true,
        text: custom
          ? `Đã lưu ${list.length} câu hỏi riêng.`
          : `Đã lưu: dùng ${inheritName}.`,
      });
    } catch {
      setMsg({ ok: false, text: "Mất kết nối, thử lại." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={CARD_HEAD}>Câu hỏi bổ sung bảo hành</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">
            Đợt 2 của yêu cầu bảo hành: khách trả lời từng câu, mỗi câu 2 đến 6
            đáp án hoặc tự ghi, có thể kèm ảnh. Không đặt thì dùng {inheritName}
            .
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5 text-[11px] font-bold">
          {[
            { on: false, label: `Dùng ${inheritName}` },
            { on: true, label: "Tuỳ chỉnh riêng" },
          ].map((tab) => (
            <button
              key={String(tab.on)}
              type="button"
              onClick={() => setCustom(tab.on)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                custom === tab.on
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {custom ? (
        <ol className="flex flex-col gap-4">
          {list.map((d, index) => (
            <li
              key={d.key}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={LABEL}>
                  Câu {index + 1}
                  <span className="ml-2 font-semibold normal-case tracking-normal text-neutral-600">
                    {d.key}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Lên"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className={ICON}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Xuống"
                    disabled={index === list.length - 1}
                    onClick={() => move(index, 1)}
                    className={ICON}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Bỏ câu này"
                    onClick={() =>
                      setList((now) => now.filter((_, i) => i !== index))
                    }
                    className={ICON}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Câu hỏi</span>
                  <input
                    value={d.label}
                    maxLength={QUESTION_LABEL_MAX}
                    onChange={(e) => update(index, { label: e.target.value })}
                    placeholder="Đã tắt diệt virus chưa"
                    className={FIELD}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Tên ngắn</span>
                  <input
                    value={d.short}
                    maxLength={QUESTION_SHORT_MAX}
                    onChange={(e) => update(index, { short: e.target.value })}
                    placeholder="Diệt virus"
                    className={FIELD}
                  />
                </label>
              </div>
              <label className="mt-3 flex flex-col gap-1">
                <span className={LABEL}>Gợi ý dưới câu hỏi</span>
                <input
                  value={d.hint}
                  maxLength={QUESTION_HINT_MAX}
                  onChange={(e) => update(index, { hint: e.target.value })}
                  placeholder="Cả Windows Defender lẫn phần mềm diệt virus ngoài."
                  className={FIELD}
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-neutral-300">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.typed}
                    onChange={(e) => update(index, { typed: e.target.checked })}
                    className="h-3.5 w-3.5 accent-[var(--brand)]"
                  />
                  Khách tự ghi câu trả lời
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.photo}
                    onChange={(e) => update(index, { photo: e.target.checked })}
                    className="h-3.5 w-3.5 accent-[var(--brand)]"
                  />
                  Cần ảnh chụp
                </label>
                {d.photo && !d.typed ? (
                  <label className="inline-flex items-center gap-2">
                    khi chọn
                    <select
                      value={d.photoWhen}
                      onChange={(e) =>
                        update(index, { photoWhen: e.target.value })
                      }
                      className="rounded-lg border border-white/10 bg-neutral-950/60 px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value="">bất kỳ đáp án nào</option>
                      {d.options
                        .filter((o) => o.value.trim())
                        .map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.value}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {d.typed ? (
                <label className="mt-3 flex flex-col gap-1">
                  <span className={LABEL}>Ví dụ trong ô ghi</span>
                  <input
                    value={d.placeholder}
                    maxLength={PLACEHOLDER_MAX}
                    onChange={(e) =>
                      update(index, { placeholder: e.target.value })
                    }
                    placeholder="Ví dụ: sai mật khẩu, tài khoản bị khóa"
                    className={`${FIELD} max-w-md`}
                  />
                </label>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <span className={LABEL}>
                    Đáp án ({d.options.length}/{OPTIONS_MAX})
                  </span>
                  {d.options.map((o, oi) => (
                    <div
                      key={oi}
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_28px]"
                    >
                      <input
                        value={o.value}
                        maxLength={OPTION_MAX}
                        onChange={(e) =>
                          update(index, {
                            options: d.options.map((x, i) =>
                              i === oi ? { ...x, value: e.target.value } : x,
                            ),
                          })
                        }
                        placeholder="Tôi đã tắt diệt virus rồi"
                        className={FIELD}
                      />
                      <input
                        value={o.hint}
                        maxLength={OPTION_HINT_MAX}
                        onChange={(e) =>
                          update(index, {
                            options: d.options.map((x, i) =>
                              i === oi ? { ...x, hint: e.target.value } : x,
                            ),
                          })
                        }
                        placeholder="Dòng nhỏ dưới đáp án"
                        className={FIELD}
                      />
                      <button
                        type="button"
                        aria-label="Bỏ đáp án"
                        disabled={d.options.length <= 2}
                        onClick={() =>
                          update(index, {
                            options: d.options.filter((_, i) => i !== oi),
                          })
                        }
                        className={ICON}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={d.options.length >= OPTIONS_MAX}
                    onClick={() =>
                      update(index, {
                        options: [...d.options, { value: "", hint: "" }],
                      })
                    }
                    className={`${GHOST} self-start`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm đáp án
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[12px] text-neutral-500">
          Đang dùng {inheritName}. Chọn &ldquo;Tuỳ chỉnh riêng&rdquo; để sửa từng
          câu cho riêng đây.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {custom ? (
            <>
              <button
                type="button"
                disabled={list.length >= QUESTIONS_MAX}
                onClick={() =>
                  setList((now) => [
                    ...now,
                    {
                      key: freshKey(now),
                      label: "",
                      short: "",
                      hint: "",
                      typed: false,
                      placeholder: "",
                      options: [
                        { value: "", hint: "" },
                        { value: "", hint: "" },
                      ],
                      photo: false,
                      photoWhen: "",
                    },
                  ])
                }
                className={GHOST}
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm câu mới
              </button>
              {missing.length > 0 ? (
                <select
                  value=""
                  disabled={list.length >= QUESTIONS_MAX}
                  onChange={(e) => {
                    const q = bank.find((b) => b.key === e.target.value);
                    if (q) setList((now) => [...now, toDraft(q)]);
                  }}
                  className="h-8 rounded-lg border border-white/10 bg-neutral-950/60 px-2 text-[11px] font-bold text-neutral-300 outline-none"
                >
                  <option value="">Thêm lại câu từ {inheritName}…</option>
                  {missing.map((q) => (
                    <option key={q.key} value={q.key}>
                      {q.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <span className="text-[11px] text-neutral-500">
                {list.length}/{QUESTIONS_MAX} câu
              </span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {msg ? (
            <span
              className={`text-[12px] font-semibold ${msg.ok ? "text-emerald-400" : "text-rose-300"}`}
            >
              {msg.text}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--brand)] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {busy ? "Đang lưu…" : "Lưu câu hỏi"}
          </button>
        </div>
      </div>
    </section>
  );
}
