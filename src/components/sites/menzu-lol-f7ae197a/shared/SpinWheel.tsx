"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift, RotateCw, X } from "lucide-react";

import {
  SPIN_COST,
  winFanfare,
  type Prize,
  type PrizeKind,
} from "@/lib/spin";
import { formatVnd } from "./productData";
import { SpinCelebration } from "./SpinCelebration";
import { SpinWheelFace } from "./SpinWheelFace";
import { lockScroll, unlockScroll } from "./modalChrome";
import {
  SHEET,
  SHEET_BUTTON,
  SHEET_BUTTON_QUIET,
  SHEET_TEXT,
  SHEET_TITLE,
} from "./noticeSheet";
import { useLeave } from "./useOverlayPresence";
import { Loader2 } from "lucide-react";

/** Full turns the wheel makes before it starts hunting for its slice. */
const FLOURISH_TURNS = 5;
const SPIN_MS = 4200;
/** With motion reduced: no flourish, straight to the slice, and quickly. A
 *  shorter clock with the same five turns would be a blur — worse, for
 *  exactly the people who asked for less. */
const CALM_SPIN_MS = 400;




interface SpinResult {
  index: number;
  prize: {
    id: string;
    label: string;
    kind: PrizeKind;
    amount: number;
    image: string | null;
    /** The code minted for this win, on a VOUCHER. Null on every other kind. */
    voucherCode: string | null;
  };
  points: number;
  balance: number;
}

/** What the card says about where the prize went. */
const SETTLED: Record<string, string> = {
  BALANCE: "Đã cộng thẳng vào số dư ví của bạn.",
  POINTS: "Đã cộng vào điểm thưởng, quay tiếp được ngay.",
  VOUCHER: "Mã dưới đây là của riêng bạn, dùng được một lần khi thanh toán.",
  ITEM: "Shop đã ghi nhận phần quà này và sẽ liên hệ để gửi cho bạn.",
  NOTHING: "Vẫn còn cơ hội ở lượt sau.",
};


/**
 * The wheel.
 *
 * It does not decide anything. A press asks the server, which takes the points
 * and draws; the answer names a slice, and only then does the wheel turn — it
 * is told where to stop before it starts moving. The animation is a rotation
 * to `FLOURISH_TURNS` whole turns plus whatever brings that slice under the
 * pointer, so every spin looks the same length regardless of the outcome.
 */
export function SpinWheel({
  points,
  canSpin,
  prizes,
}: {
  /** The reader's points at page load; kept current by the server's answer. */
  points: number;
  /** False when the shop's own guard says spinning is off. */
  canSpin: boolean;
  /** The wheel the shop has set, in wheel order. Read on the server so the
   *  picture and the draw can never be two different tables. */
  prizes: Prize[];
}) {
  // Recomputed from the table rather than fixed at nine: the shop can add and
  // remove slices, and every angle on this wheel is a function of how many
  // there are.
  const SLICE = 360 / Math.max(1, prizes.length);
  const router = useRouter();
  const [angle, setAngle] = useState(0);
  const [spinMs, setSpinMs] = useState(SPIN_MS);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  // The card plays its exit before the state that holds it is cleared.
  const { leaving, leave } = useLeave(() => setResult(null));
  const [error, setError] = useState<string | null>(null);
  const [balanceLeft, setBalanceLeft] = useState(points);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const affordable = balanceLeft >= SPIN_COST;
  const won = result !== null && result.prize.kind !== "NOTHING";

  // The wheel's landing is announced by a timer; if the reader leaves before
  // it fires, the callback would set state on a component that is gone.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // While the card is up it owns the keyboard, like every other dialog here.
  // Handed back the moment the exit starts, not when the card is gone.
  useEffect(() => {
    if (!result || leaving) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [result, leaving, leave]);

  async function spin() {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/spin", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as SpinResult & {
        error?: string;
        missing?: number;
      };

      if (!res.ok) {
        setError(
          data.missing !== undefined
            ? `Không đủ điểm, còn thiếu ${formatVnd(data.missing)} điểm.`
            : (data.error ?? "Không quay được, thử lại sau"),
        );
        setSpinning(false);
        return;
      }

      // Land the slice's middle under the pointer at twelve o'clock, then add
      // whole turns on top so the wheel always makes the same show of it —
      // unless the reader asked for less motion, in which case it goes to
      // the slice and stops.
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const turns = calm ? 0 : FLOURISH_TURNS;
      const clock = calm ? CALM_SPIN_MS : SPIN_MS;
      setSpinMs(clock);
      const target = 360 - (data.index * SLICE + SLICE / 2);
      setAngle((current) => {
        const base = Math.ceil(current / 360) * 360;
        return base + turns * 360 + target;
      });

      // The points are already spent server-side; the panel above catches up
      // when the animation does, so the figure never contradicts the wheel.
      timer.current = setTimeout(() => {
        setResult(data);
        setBalanceLeft(data.points);
        setSpinning(false);
        // Every spin costs points and the page above the wheel prints them
        // from the server; refreshing only on a money prize left the two
        // figures disagreeing after every other kind of result.
        router.refresh();
      }, clock);
    } catch {
      setError("Không kết nối được máy chủ");
      setSpinning(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 520 rather than 340: the labels are set in viewBox units, so the only
          way a smaller relative type stays legible is a wider wheel. */}
      <div className="relative w-full max-w-[520px] aspect-square">
        {/* The pointer, outside the rotating group so it stays at twelve. */}
        <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2">
          {/* LAB: a white pointer and no glow round the wheel ("bớt AI bớt rối"). */}
          <div className="h-0 w-0 border-x-[10px] border-t-[18px] border-x-transparent border-t-frost" />
        </div>

        <SpinWheelFace
          prizes={prizes}
          className="h-full w-full rounded-full border-4 border-white/10"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: `transform ${spinMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        />

        {/* The hub IS the button. Outside the rotating svg, or it would spin
            away from under the finger that pressed it. */}
        <button
          type="button"
          disabled={spinning || !affordable || !canSpin}
          onClick={spin}
          // LAB: the hub is the page's one action, so it wears the shop's red.
          className="absolute left-1/2 top-1/2 z-10 grid h-[27%] w-[27%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[#0b0b10] bg-[var(--menzu-accent-dark)] text-white transition-colors hover:bg-[var(--menzu-accent)] disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          <span className="flex items-center justify-center text-[15px] font-semibold leading-none sm:text-[15px]">
            {spinning ? (
              <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-label="Đang quay" />
            ) : affordable ? (
              "Quay"
            ) : (
              "Hết lượt"
            )}
          </span>
          {affordable ? (
            <span className="mt-1 text-[9px] font-bold leading-none text-white/70 sm:text-[10px]">
              {formatVnd(SPIN_COST)} điểm
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        {/* LAB: the one place the points are said; it changes after a spin. */}
        <span className="text-[15px] text-mist">
          Bạn có <span className="font-bold text-frost">{formatVnd(balanceLeft)} điểm</span>, đổi
          được{" "}
          <span className="font-bold text-frost">{Math.floor(balanceLeft / SPIN_COST)} lượt quay</span>
        </span>

        {!affordable && !spinning ? (
          <Link
            href="/categories"
            className="text-[14px] font-semibold text-mist underline-offset-4 transition-colors hover:text-frost hover:underline"
          >
            Mua sắm để tích thêm điểm
          </Link>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="w-full max-w-[420px] rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-[12px] font-semibold text-red-400"
        >
          {error}
        </p>
      ) : null}

      {/* The result arrives as a card over the page rather than as a line under
          the wheel: the reader's eyes are on the pointer when it stops, and a
          sentence appearing below the fold is a result nobody reads. */}
      {result ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={leave}
          inert={leaving}
        >
          <div className={`order-modal-backdrop absolute inset-0 bg-black/75 backdrop-blur-[2px]${leaving ? " order-modal-backdrop-out" : ""}`} />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kết quả vòng quay"
            onClick={(e) => e.stopPropagation()}
            // Rises in; no bounce. The confetti is the celebration, and a
            // card that bounced under "Chưa trúng lần này" would be a joke at
            // the expense of somebody who just spent points.
            // LAB (17/10/2026): the house notice sheet (noticeSheet.ts), as
            // the closed-wheel notice wears it: a small glyph beside the
            // title instead of the violet ring, wash and border, the prize in
            // plain white, red only on the button that acts.
            className={`${SHEET} order-modal-card${leaving ? " order-modal-card-out" : ""} max-w-[400px] overflow-hidden px-6 py-6`}
          >

            {/* Behind everything the card says, and hidden from a screen
                reader: the words below are the result, this is only how it
                feels. How loud it gets is read off the wheel's own weights. */}
            <SpinCelebration
              fanfare={winFanfare(
                { kind: result.prize.kind, weight: prizes[result.index]?.weight ?? 0 },
                prizes,
              )}
            />

            <button
              type="button"
              aria-label="Đóng"
              onClick={leave}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={15} />
            </button>

            {/* The prize's own picture when it has one — a mousepad says more
                as a mousepad than as a gift icon. */}
            {result.prize.image ? (
              <span className="relative mb-4 block h-28 w-28 overflow-hidden rounded-xl border border-line bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.prize.image}
                  alt={result.prize.label}
                  className="h-full w-full object-contain"
                />
              </span>
            ) : null}

            <h2 className={`relative pr-8 ${SHEET_TITLE}`}>
              <Gift
                size={18}
                aria-hidden
                className={`shrink-0 ${won ? "text-emerald-400" : "text-mist"}`}
              />
              {won ? "Chúc mừng!" : "Chưa trúng lần này"}
            </h2>

            <p className="relative mt-3 text-[24px] font-bold leading-tight text-frost">
              {won ? result.prize.label : "Chúc may mắn lần sau"}
            </p>

            <p className={`relative mt-2 ${SHEET_TEXT}`}>
              {SETTLED[result.prize.kind] ?? SETTLED.NOTHING}
            </p>

            {/* The one thing on this card the reader has to keep. Set in mono
                and given its own box, because a code read wrong is a code that
                does not work and nobody can say why. */}
            {result.prize.voucherCode ? (
              <p className="relative mt-4 rounded-xl border border-line bg-raise px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.2em] text-frost">
                {result.prize.voucherCode}
              </p>
            ) : null}

            <p className="relative mt-4 text-[14px] text-mist">
              Còn{" "}
              <span className="font-bold text-white">
                {formatVnd(result.points)} điểm
              </span>
              , đổi được{" "}
              <span className="font-bold text-white">
                {Math.floor(result.points / SPIN_COST)} lượt
              </span>
            </p>

            <div className="relative mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={leave}
                className={`flex-1 ${SHEET_BUTTON_QUIET}`}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={result.points < SPIN_COST || !canSpin}
                onClick={() => {
                  setResult(null);
                  void spin();
                }}
                className={`flex-1 gap-1.5 ${SHEET_BUTTON} disabled:opacity-50`}
              >
                <RotateCw size={13} />
                Quay tiếp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
