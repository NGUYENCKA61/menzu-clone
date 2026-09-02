import type { WinFanfare } from "@/lib/spin";

/**
 * The colours a piece of confetti can be. The wheel's own violet and the
 * shop's red, plus enough others that a burst reads as a burst rather than as
 * one colour repeated.
 */
const PAPER = ["#a78bfa", "#ff3158", "#f59e0b", "#34d399", "#38bdf8", "#f472b6"];

/**
 * Deterministic pseudo-random in [0, 1).
 *
 * A seeded hash rather than `Math.random`, so the same win draws the same
 * burst on every render — React re-renders this card as the points tick down
 * behind it, and confetti that jumped to new positions each time would flicker
 * rather than fall.
 */
function noise(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * What the card does when a spin lands on something.
 *
 * Decoration only, over a card that already says what was won in words: the
 * whole thing is `aria-hidden`, and a reader who has asked for less motion
 * gets none of it without losing anything. Two strengths, because two outcomes
 * deserve different noise — see `winFanfare` for which is which.
 */
export function SpinCelebration({ fanfare }: { fanfare: WinFanfare }) {
  if (fanfare === "none") return null;

  const big = fanfare === "big";
  const pieces = big ? 34 : 10;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
    >
      {/* A single ring, from behind the prize outward. Once — a pulse that
          repeated would turn the card into an alarm. */}
      <span
        style={{ ["--delay" as string]: "0.05s" }}
        className={`animate-win-ring absolute left-1/2 top-[38%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
          big ? "border-[#a78bfa]" : "border-white/40"
        }`}
      />
      {big ? (
        <span
          style={{ ["--delay" as string]: "0.35s" }}
          className="animate-win-ring absolute left-1/2 top-[38%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#ff3158]"
        />
      ) : null}

      {Array.from({ length: pieces }, (_, i) => {
        const across = noise(i + 1) * 100;
        const drift = (noise(i + 11) - 0.5) * (big ? 160 : 60);
        const delay = noise(i + 21) * (big ? 0.5 : 0.25);
        const fall = (big ? 1.9 : 1.3) + noise(i + 31) * 0.9;
        const size = big ? 5 + noise(i + 41) * 5 : 3 + noise(i + 41) * 2;
        const colour = PAPER[i % PAPER.length];
        const style = {
          left: `${across}%`,
          width: `${size}px`,
          height: `${big ? size * 1.6 : size}px`,
          background: colour,
          ["--drift" as string]: `${drift}px`,
          ["--twist" as string]: `${360 + noise(i + 51) * 540}deg`,
          ["--delay" as string]: `${delay}s`,
          ["--fall" as string]: `${fall}s`,
        };
        return big ? (
          // Paper: rectangles that tumble and leave the bottom of the card.
          <span
            key={i}
            style={style}
            className="animate-confetti absolute top-0 rounded-[1px]"
          />
        ) : (
          // Sparks: small, round, and rising rather than falling — enough to
          // mark the moment without dressing up an ordinary result.
          <span
            key={i}
            style={{ ...style, top: "46%" }}
            className="animate-spark absolute rounded-full"
          />
        );
      })}
    </div>
  );
}
