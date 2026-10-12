"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { REFUND_BANKS } from "@/lib/bankRefund";

/**
 * The VietQR short code of each bank the refund form offers, for its logo
 * at api.vietqr.io/img/<code>.png: the same set of marks every banking app
 * in Vietnam shows, so a buyer finds theirs by the picture before the name
 * (the owner, 12/10/2026: "chọn ngân hàng thêm icon ngân hàng").
 */
const BANK_CODES: Record<(typeof REFUND_BANKS)[number], string> = {
  Vietcombank: "VCB",
  VietinBank: "ICB",
  BIDV: "BIDV",
  Agribank: "VBA",
  Techcombank: "TCB",
  "MB Bank": "MB",
  ACB: "ACB",
  VPBank: "VPB",
  TPBank: "TPB",
  Sacombank: "STB",
  HDBank: "HDB",
  VIB: "VIB",
  SHB: "SHB",
  SeABank: "SEAB",
  OCB: "OCB",
  MSB: "MSB",
  Eximbank: "EIB",
  LPBank: "LPB",
  "Nam A Bank": "NAB",
  "Bac A Bank": "BAB",
  PVcomBank: "PVCB",
  ABBANK: "ABB",
  "BaoViet Bank": "BVB",
  Kienlongbank: "KLB",
  VietABank: "VAB",
  Saigonbank: "SGICB",
  NCB: "NCB",
  PGBank: "PGB",
  Vietbank: "VIETBANK",
  BVBank: "VCCB",
  SCB: "SCB",
  "CAKE by VPBank": "CAKE",
  Timo: "TIMO",
  "Shinhan Bank": "SHBVN",
  "Woori Bank": "WVN",
  HSBC: "HSBC",
  "Standard Chartered": "SCVN",
  UOB: "UOB",
};

export function bankLogoUrl(name: string): string | null {
  const code = BANK_CODES[name as (typeof REFUND_BANKS)[number]];
  return code ? `https://api.vietqr.io/img/${code}.png` : null;
}

/** The bank's mark, or its initials where the picture does not load. */
export function BankMark({ name, size = 28 }: { name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const url = bankLogoUrl(name);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  return (
    // No white tile under the mark (the owner, 12/10/2026: "trong suốt"):
    // the logos are drawn for any ground, and a white square on the dark
    // page was the one thing that stood out.
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-md"
      style={{ width: Math.round(size * 2.2), height: size }}
    >
      {url && !broken ? (
        // A third-party picture: a plain img, as the top-up invoice draws its
        // QR, rather than adding the host to the image config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={Math.round(size * 2.2)}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-contain p-0.5"
        />
      ) : (
        <span className="rounded-md border border-white/10 px-1 text-[9px] font-black text-neutral-300">
          {initials}
        </span>
      )}
    </span>
  );
}

/**
 * A bank chosen from a list with its mark beside it, searched by name. One
 * button that opens a panel; Escape or a click outside closes it. The value
 * is the bank's name, which is what the route and the ticket store.
 */
export function BankPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement | null>(null);
  const search = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const away = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const needle = query.trim().toLowerCase();
  const shown = REFUND_BANKS.filter(
    (bank) => !needle || bank.toLowerCase().includes(needle),
  );

  return (
    <div ref={root} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((now) => !now)}
        className={`flex h-[46px] w-full items-center gap-2.5 rounded-xl border bg-neutral-950/60 px-3 text-left text-sm outline-none transition-colors ${
          open
            ? "border-[var(--menzu-accent)]/60"
            : "border-white/10 hover:border-white/25"
        }`}
      >
        {value ? (
          <>
            <BankMark name={value} size={26} />
            <span className="min-w-0 flex-1 truncate font-semibold text-white">
              {value}
            </span>
          </>
        ) : (
          <span className="flex-1 text-neutral-500">Chọn ngân hàng</span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-[#121317]/85 shadow-2xl shadow-black/60 backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3">
            <Search
              className="h-3.5 w-3.5 shrink-0 text-neutral-500"
              aria-hidden
            />
            <input
              ref={search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Gõ tên ngân hàng"
              className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder-neutral-600"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {shown.length === 0 ? (
              <li className="px-3 py-3 text-[12px] text-neutral-500">
                Không có ngân hàng nào tên vậy.
              </li>
            ) : null}
            {shown.map((bank) => {
              const on = bank === value;
              return (
                <li key={bank} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(bank);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-white/[0.05] ${
                      on ? "text-white" : "text-neutral-200"
                    }`}
                  >
                    <BankMark name={bank} size={26} />
                    <span className="min-w-0 flex-1 truncate">{bank}</span>
                    {on ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-[var(--menzu-accent)]"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
