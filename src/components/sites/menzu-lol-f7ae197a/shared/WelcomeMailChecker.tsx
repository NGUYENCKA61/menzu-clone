"use client";

import { CheckCircle2, Mail, Monitor, ShieldAlert, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { useState } from "react";

import { checkWelcomeMail, type CheckResult } from "@/lib/welcomeMail";

const VERDICT = {
  genuine: {
    icon: ShieldCheck,
    title: "Thư gốc hợp lệ",
    body: "Thư này thật sự do Riot Games gửi và chữ ký đã được xác minh.",
    className: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400",
  },
  suspicious: {
    icon: ShieldAlert,
    title: "Không xác minh được",
    body: "Thư không đạt các kiểm tra bắt buộc. Có thể đã bị chỉnh sửa hoặc không do Riot gửi.",
    className: "border-red-500/30 bg-red-500/[0.06] text-red-400",
  },
  unreadable: {
    icon: ShieldAlert,
    title: "Không đọc được",
    body: "Nội dung dán vào không phải mã nguồn email. Xem hướng dẫn lấy mã nguồn bên dưới.",
    className: "border-amber-500/30 bg-amber-500/[0.06] text-amber-400",
  },
} as const;

const GUIDES = [
  {
    icon: Monitor,
    title: "Máy tính",
    steps: [
      "Mở thư, bấm nút 3 chấm ở góc phải của thư.",
      'Chọn "Hiển thị thư gốc" (Show original).',
      "Copy toàn bộ nội dung hiện ra và dán vào ô trên.",
    ],
  },
  {
    icon: Smartphone,
    title: "Điện thoại (không dùng app)",
    steps: [
      "Mở Chrome hoặc Safari, truy cập Gmail bản web.",
      'Bật menu trình duyệt, chọn "Trang cho máy tính".',
      "Làm các bước copy thư gốc giống như trên máy tính.",
    ],
  },
];

/**
 * Pastes-in-source checker for Riot welcome mail.
 *
 * Runs entirely in the browser: the pasted source carries the buyer's own
 * email address and full delivery headers, and there is no reason for any of
 * that to reach a server just to run a handful of regexes.
 */
export function WelcomeMailChecker() {
  const [source, setSource] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setResult(checkWelcomeMail(source));
  }

  const verdict = result ? VERDICT[result.verdict] : null;
  const VerdictIcon = verdict?.icon;

  return (
    <div className="w-full max-w-[720px] mx-auto space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[#121216] p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Mail size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-white">
              Check Thư Welcome
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Riot Mail Checker
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label
            htmlFor="mail-source"
            className="block text-[11px] font-black uppercase tracking-widest text-neutral-400"
          >
            Dán mã nguồn email
          </label>
          <textarea
            id="mail-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={9}
            spellCheck={false}
            placeholder="Delivered-To: ...&#10;Authentication-Results: ...&#10;From: Riot Games <noreply@riotgames.com>"
            className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-[12px] font-mono text-white outline-none focus:border-indigo-500/60 transition-colors placeholder-neutral-600 resize-y"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 uppercase tracking-widest text-xs transition-colors"
          >
            Kiểm tra ngay
          </button>
        </form>

        {result && verdict && VerdictIcon ? (
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div className={`rounded-2xl border p-4 flex gap-3 ${verdict.className}`} role="status">
              <VerdictIcon size={20} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-wider">{verdict.title}</p>
                <p className="text-xs text-neutral-400 leading-relaxed">{verdict.body}</p>
              </div>
            </div>

            {result.checks.length > 0 ? (
              <ul className="space-y-2">
                {result.checks.map((check) => (
                  <li
                    key={check.label}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
                  >
                    {check.passed ? (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-red-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-neutral-200 flex-1">{check.label}</span>
                    <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[45%]">
                      {check.detail}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {result.verdict !== "unreadable" ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {(
                  [
                    ["Người gửi", result.from],
                    ["Người nhận", result.to],
                    ["Tiêu đề", result.subject],
                    ["Thời gian", result.date],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                    <dt className="text-neutral-500 font-bold uppercase tracking-wider text-[9px]">
                      {label}
                    </dt>
                    <dd className="text-neutral-200 font-mono truncate">{value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-white text-center">
          Hướng dẫn lấy mã nguồn email
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GUIDES.map(({ icon: Icon, title, steps }) => (
            <div key={title} className="rounded-2xl border border-zinc-800/80 bg-[#121216] p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <Icon size={16} className="text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">{title}</h3>
              </div>
              <ol className="space-y-2">
                {steps.map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="w-5 h-5 shrink-0 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-[11px] text-neutral-400 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-neutral-500 leading-relaxed text-center px-4">
        Nội dung email được xử lý ngay trên trình duyệt của bạn — không gửi lên
        máy chủ và không được lưu lại.
      </p>
    </div>
  );
}
