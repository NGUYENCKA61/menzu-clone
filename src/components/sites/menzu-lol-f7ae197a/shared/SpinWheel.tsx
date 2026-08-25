"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift, RotateCw, Sparkles, X } from "lucide-react";

import { PRIZES, SPIN_COST, WHEEL } from "@/lib/spin";
import { formatVnd } from "./productData";

/** Full turns the wheel makes before it starts hunting for its slice. */
const FLOURISH_TURNS = 5;
const SPIN_MS = 4200;

const SLICE = 360 / PRIZES.length;

/** Alternating wedge fills — the wheel has to read as eight parts at a glance. */
const WEDGE = ["#1c1c22", "#141419"];
/** The rare slices wear the accent so the good outcome is visibly the small one. */
const HIGHLIGHT = "rgb(124 58 237 / 0.45)";

interface SpinResult {
  index: number;
  prize: {
    id: string;
    label: string;
    kind: string;
    amount: number;
    image: string | null;
  };
  points: number;
  balance: number;
}

/** What the card says about where the prize went. */
const SETTLED: Record<string, string> = {
  BALANCE: "Đã cộng thẳng vào số dư ví của bạn.",
  POINTS: "Đã cộng vào điểm thưởng, quay tiếp được ngay.",
  ITEM: "Shop đã ghi nhận phần quà này và sẽ liên hệ để gửi cho bạn.",
  NOTHING: "Vẫn còn cơ hội ở lượt sau.",
};

/** Cartesian point on the wheel for an angle measured from twelve o'clock. */
function pointAt(angle: number, radius: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [50 + radius * Math.cos(radians), 50 + radius * Math.sin(radians)];
}

/** The wedge path for slice `i`, drawn from the centre out. */
function wedgePath(index: number): string {
  const [x1, y1] = pointAt(index * SLICE, 50);
  const [x2, y2] = pointAt((index + 1) * SLICE, 50);
  return `M 50 50 L ${x1.toFixed(3)} ${y1.toFixed(3)} A 50 50 0 0 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
}

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
}: {
  /** The reader's points at page load; kept current by the server's answer. */
  points: number;
  /** False when the shop's own guard says spinning is off. */
  canSpin: boolean;
}) {
  const router = useRouter();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
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
  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setResult(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result]);

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
            ? `Không đủ điểm — còn thiếu ${formatVnd(data.missing)} điểm.`
            : (data.error ?? "Không quay được, thử lại sau"),
        );
        setSpinning(false);
        return;
      }

      // Land the slice's middle under the pointer at twelve o'clock, then add
      // whole turns on top so the wheel always makes the same show of it.
      const target = 360 - (data.index * SLICE + SLICE / 2);
      setAngle((current) => {
        const base = Math.ceil(current / 360) * 360;
        return base + FLOURISH_TURNS * 360 + target;
      });

      // The points are already spent server-side; the panel above catches up
      // when the animation does, so the figure never contradicts the wheel.
      timer.current = setTimeout(() => {
        setResult(data);
        setBalanceLeft(data.points);
        setSpinning(false);
        // A money prize lands in the wallet, which the header prints.
        if (data.prize.kind === "BALANCE") router.refresh();
      }, SPIN_MS);
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
          <div className="h-0 w-0 border-x-[10px] border-t-[18px] border-x-transparent border-t-[var(--brand)]" />
        </div>

        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label="Vòng quay đổi thưởng"
          className="h-full w-full rounded-full border-4 border-white/10 shadow-[0_0_60px_-15px_rgb(124_58_237_/_0.5)]"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        >
          {PRIZES.map((prize, index) => {
            const rare = prize.weight <= 5;
            const centre = index * SLICE + SLICE / 2;
            // Carried round with its wedge, a label past the horizon arrives
            // upside down. The lower half is flipped about the label's own
            // spot, which lands it the right way up in the same slice.
            const flipped = centre > 90 && centre < 270;
            return (
              <g key={prize.id}>
                <path
                  d={wedgePath(index)}
                  fill={rare ? HIGHLIGHT : WEDGE[index % 2]}
                  stroke="rgb(255 255 255 / 0.08)"
                  strokeWidth={0.3}
                />
                {/* Picture and label ride the wedge as one group, flipped
                    about their own middle in the lower half so neither
                    arrives upside down. */}
                {/* Picture and label ride the wedge as one group, flipped
                    about their own middle in the lower half so neither
                    arrives upside down. Both sit as far out as they fit: a
                    wedge is 2·r·sin(180°/n) wide, so every unit closer to the
                    hub is width the label does not have. */}
                <g
                  transform={`rotate(${centre} 50 50)${
                    flipped
                      ? ` rotate(180 50 ${
                          prize.image
                            ? (WHEEL.imageY + WHEEL.labelYWithImage) / 2
                            : WHEEL.labelY
                        })`
                      : ""
                  }`}
                >
                  {prize.image ? (
                    <image
                      href={prize.image}
                      x={50 - WHEEL.imageSize / 2}
                      y={WHEEL.imageY}
                      width={WHEEL.imageSize}
                      height={WHEEL.imageSize}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : null}
                  <text
                    x={50}
                    y={prize.image ? WHEEL.labelYWithImage : WHEEL.labelY}
                    textAnchor="middle"
                    fontSize={WHEEL.fontSize}
                    fontWeight={700}
                    fill={rare ? "#ffffff" : "#a3a3a3"}
                  >
                    {prize.short}
                  </text>
                </g>
              </g>
            );
          })}
          {/* The socket the button sits in. Drawn inside the wheel so it turns
              with it and the seam never shows. */}
          <circle cx={50} cy={50} r={15} fill="#0b0b10" stroke="rgb(255 255 255 / 0.12)" strokeWidth={0.6} />
        </svg>

        {/* The hub IS the button. Outside the rotating svg, or it would spin
            away from under the finger that pressed it. */}
        <button
          type="button"
          disabled={spinning || !affordable || !canSpin}
          onClick={spin}
          className="absolute left-1/2 top-1/2 z-10 grid h-[27%] w-[27%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[#0b0b10] bg-[var(--brand)] text-white shadow-[0_0_30px_-4px_rgb(124_58_237_/_0.8)] transition-colors hover:bg-[var(--brand-dark)] disabled:bg-neutral-700 disabled:text-neutral-400 disabled:shadow-none"
        >
          <span className="text-[13px] font-black uppercase tracking-widest leading-none sm:text-[15px]">
            {spinning ? "…" : affordable ? "Quay" : "Hết lượt"}
          </span>
          {!spinning && affordable ? (
            <span className="mt-1 text-[9px] font-bold leading-none text-white/70 sm:text-[10px]">
              {formatVnd(SPIN_COST)} điểm
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-[12px] text-neutral-400">
          Còn lại{" "}
          <span className="font-bold text-white">{formatVnd(balanceLeft)} điểm</span> ·
          đổi được{" "}
          <span className="font-bold text-white">
            {Math.floor(balanceLeft / SPIN_COST)} lượt
          </span>
        </span>

        {!affordable && !spinning ? (
          <Link
            href="/categories"
            className="text-[11px] font-bold text-[var(--brand)] hover:text-white transition-colors"
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
          onClick={() => setResult(null)}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kết quả vòng quay"
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-[380px] overflow-hidden rounded-2xl border bg-[#0e0e11] p-7 text-center shadow-2xl ${
              won ? "border-[var(--brand)]/40" : "border-white/10"
            }`}
          >
            {/* A wash behind the icon, only when there is something to celebrate. */}
            {won ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_rgb(124_58_237_/_0.35),_transparent_70%)]"
              />
            ) : null}

            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setResult(null)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={15} />
            </button>

            {/* The prize's own picture when it has one — a mousepad says more
                as a mousepad than as a gift icon. */}
            {result.prize.image ? (
              <span className="relative mx-auto block h-28 w-28 overflow-hidden rounded-xl border border-[var(--brand)]/30 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.prize.image}
                  alt={result.prize.label}
                  className="h-full w-full object-contain"
                />
              </span>
            ) : (
              <span
                className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${
                  won
                    ? "border-[var(--brand)]/40 bg-[var(--brand)]/15"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <Gift size={26} className={won ? "text-[#a78bfa]" : "text-neutral-500"} />
                {won ? (
                  <Sparkles
                    size={14}
                    aria-hidden
                    className="absolute -right-1 -top-1 text-[var(--brand)]"
                  />
                ) : null}
              </span>
            )}

            <h2 className="relative mt-4 text-[15px] font-black uppercase tracking-wider text-white">
              {won ? "Chúc mừng!" : "Chưa trúng lần này"}
            </h2>

            <p
              className={`relative mt-2 text-2xl font-black leading-tight ${
                won ? "text-[#a78bfa]" : "text-neutral-400"
              }`}
            >
              {won ? result.prize.label : "Chúc may mắn lần sau"}
            </p>

            <p className="relative mt-2.5 text-[12px] leading-relaxed text-neutral-500">
              {SETTLED[result.prize.kind] ?? SETTLED.NOTHING}
            </p>

            <p className="relative mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12px] text-neutral-400">
              Còn{" "}
              <span className="font-bold text-white">
                {formatVnd(result.points)} điểm
              </span>{" "}
              · đổi được{" "}
              <span className="font-bold text-white">
                {Math.floor(result.points / SPIN_COST)} lượt
              </span>
            </p>

            <div className="relative mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="h-11 flex-1 rounded-xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/5"
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
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--brand-dark)] disabled:opacity-50"
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
