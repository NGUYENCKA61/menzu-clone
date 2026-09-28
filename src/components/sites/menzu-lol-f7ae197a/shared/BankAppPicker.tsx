"use client";

import { Check, Search, X } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { BANK_APPS, bankAppLink } from "./bankApps";
import { lockScroll, unlockScroll } from "./modalChrome";
import { useLeave } from "./useOverlayPresence";

export interface BankAppPickerProps {
  /** VietQR's code for the receiving bank, e.g. "mb". */
  bank: string;
  account: string;
  amount: number;
  note: string;
  holder: string;
  onClose: () => void;
}

/**
 * "Mở nhanh ngân hàng", measured off menzu's invoice: every banking app VietQR
 * can open, the ones that fill in the amount and description first and ticked,
 * with a search box over them. A press opens VietQR's link in a new tab, which
 * hands the phone to the app with the transfer typed in.
 */
export function BankAppPicker({ bank, account, amount, note, holder, onClose }: BankAppPickerProps) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const { leaving, leave } = useLeave(onClose);

  useEffect(() => {
    search.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [leave]);

  const needle = query.trim().toLowerCase();
  const apps = BANK_APPS.filter(
    (app) =>
      app.appName.toLowerCase().includes(needle) ||
      app.bankName.toLowerCase().includes(needle) ||
      app.appId.toLowerCase().includes(needle),
  ).sort((a, b) => Number(b.autofill) - Number(a.autofill));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" inert={leaving}>
      <div
        className={`error-modal-backdrop absolute inset-0 bg-black/60${leaving ? " order-modal-backdrop-out" : ""}`}
        onClick={leave}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-app-title"
        className={`bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-white/[0.08] shadow-none rounded-[24px] w-full max-w-[500px] relative z-10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 max-h-[80vh]${leaving ? " order-modal-card-out" : ""}`}
      >
        <div className="p-5 sm:p-6 pb-3 flex items-start justify-between shrink-0 relative">
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
          />
          <div>
            <h3 id="bank-app-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
              Mở nhanh ngân hàng
            </h3>
            <p className="text-neutral-500 text-[11px] sm:text-xs mt-1">
              Chọn ngân hàng để mở app và điền sẵn thông tin chuyển khoản
            </p>
          </div>
          <button
            type="button"
            onClick={leave}
            aria-label="Đóng"
            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors mt-0.5 shrink-0"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="px-5 sm:px-6 pb-3 shrink-0">
          <label className="relative flex items-center bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 hover:border-white/20 focus-within:border-white/30 transition-colors">
            <Search size={14} className="text-neutral-500 mr-2 shrink-0" aria-hidden />
            <input
              ref={search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm ngân hàng..."
              aria-label="Tìm ngân hàng"
              className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="p-3.5 sm:p-6 pt-3 grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3.5 overflow-y-auto flex-1 max-h-[42vh] border-t border-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {apps.map((app) => (
            <button
              key={app.appId}
              type="button"
              onClick={() =>
                window.open(bankAppLink(app, { bank, account, amount, note, holder }), "_blank", "noopener")
              }
              className="flex flex-col items-center gap-1.5 sm:gap-2.5 p-2 sm:p-3.5 bg-white/[0.02] border border-white/5 hover:bg-emerald-500/5 hover:border-emerald-500/40 rounded-[12px] sm:rounded-[16px] transition-colors duration-200 active:scale-95 group relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-[10px] sm:rounded-[14px] transition-all duration-300 overflow-hidden relative bg-white ring-1 ring-white/10 group-hover:ring-emerald-500/50">
                  {/* Apple's icon, straight from its CDN like the QR is from
                      VietQR's: one picture each, not worth an image
                      allow-list entry. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={app.logo}
                    alt={app.appName}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                {app.autofill ? (
                  <div
                    title="Tự điền số tiền và nội dung"
                    className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-[#1a1a1a] rounded-full p-[1.5px] sm:p-[2px] z-10 shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300"
                  >
                    <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full p-0.5">
                      <Check className="w-1.5 h-1.5 sm:w-2 sm:h-2" strokeWidth={4} aria-hidden />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="h-5 sm:h-6 flex flex-col items-center justify-start w-full mt-1 relative z-10">
                <span className="text-[8px] sm:text-[9.5px] text-neutral-300 font-semibold text-center leading-tight line-clamp-2 px-0.5 group-hover:text-emerald-400 transition-colors">
                  {app.appName}
                </span>
              </div>
            </button>
          ))}
          {apps.length === 0 ? (
            <p className="col-span-full py-6 text-center text-xs text-neutral-500">
              Không tìm thấy ngân hàng nào.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
