"use client";

import { useId } from "react";

import { Coins, Gift, Star, Ticket, type LucideIcon } from "lucide-react";

import {
  readWedgeColor,
  WEDGE_COLORS,
  WHEEL,
  type Prize,
  type PrizeKind,
} from "@/lib/spin";

/** Alternating wedge fills — the wheel has to read as its parts at a glance. */
const WEDGE = ["#1c1c22", "#141419"];
/** The rare slices wear the accent so the good outcome is visibly the small one. */
const HIGHLIGHT = "rgb(124 58 237 / 0.45)";

/**
 * The glyph a wedge wears when the shop has given it no picture.
 *
 * A wedge with only three words on its rim reads as an unfinished wedge, and
 * the kind is the one thing about a prize that is always known — money, points,
 * a code, a parcel. A losing slice gets none: there is nothing to picture, and
 * a glyph there would be dressing up the outcome nobody wants.
 */
const KIND_GLYPH: Partial<Record<PrizeKind, LucideIcon>> = {
  BALANCE: Coins,
  POINTS: Star,
  VOUCHER: Ticket,
  ITEM: Gift,
};

/** Cartesian point on the wheel for an angle measured from twelve o'clock. */
function pointAt(angle: number, radius: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [50 + radius * Math.cos(radians), 50 + radius * Math.sin(radians)];
}

/**
 * The line a wedge's label is written along: its own stretch of the rim.
 *
 * `reverse` draws the same arc the other way round. A label carried past the
 * horizon would otherwise arrive upside down, and reversing the line it sits
 * on turns the words back over without mirroring them.
 */
function titleArc(index: number, slice: number, r: number, reverse: boolean): string {
  // A shade in from each edge so a full-length label does not touch the spoke
  // beside it.
  const pad = slice * 0.06;
  const a1 = index * slice + pad;
  const a2 = (index + 1) * slice - pad;
  const [x1, y1] = pointAt(reverse ? a2 : a1, r);
  const [x2, y2] = pointAt(reverse ? a1 : a2, r);
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 0 ${reverse ? 0 : 1} ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

/** The wedge path for slice `i` of `slice` degrees, drawn from the centre out. */
function wedgePath(index: number, slice: number): string {
  const [x1, y1] = pointAt(index * slice, 50);
  const [x2, y2] = pointAt((index + 1) * slice, 50);
  return `M 50 50 L ${x1.toFixed(3)} ${y1.toFixed(3)} A 50 50 0 0 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
}

/**
 * The wheel's face — wedges, pictures and labels, and nothing that moves.
 *
 * Split out of `SpinWheel` so the desk's preview is not a lookalike but the
 * same drawing, down to the fills: an editor that marked the slice being
 * worked on would be showing a wheel no customer will ever see, and it exists
 * to show exactly the one they will.
 * The spinning, the pointer, the hub button and the server call all stay with
 * `SpinWheel`, which wraps this.
 *
 * A client component only because `useId` needs one: the arcs the labels are
 * written along are referenced by id, and two wheels on a page must not share
 * them. Nothing here holds state.
 */
export function SpinWheelFace({
  prizes,
  className,
  style,
  onSlice,
}: {
  prizes: Prize[];
  className?: string;
  /** Given, every wedge becomes a button. The customer's wheel passes none —
   *  there a press must go through the server, not pick a slice. */
  onSlice?: (prize: Prize, index: number) => void;
  /** The rotation the customer's wheel animates with. The preview passes
   *  none, because a wheel that turned while it was being typed into would be
   *  showing the reader everything except the thing they are changing. */
  style?: React.CSSProperties;
}) {
  // Every angle here is a function of how many slices there are, so the shop
  // adding one re-cuts the whole wheel rather than squeezing a tenth into nine
  // wedges' worth of room.
  const slice = 360 / Math.max(1, prizes.length);
  // SVG ids are global to the document. Two wheels on one page — the customer's
  // and a preview, say — would otherwise write every label along the first
  // wheel's arcs.
  const arcId = useId();

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Vòng quay đổi thưởng"
      className={className}
      style={style}
    >
      {prizes.map((prize, index) => {
        const rare = prize.weight <= 5;
        // The shop's choice first; "auto" is the wheel deciding for itself,
        // which is what it did before there was a picker.
        const chosen = WEDGE_COLORS[readWedgeColor(prize.color)].fill;
        const Glyph = KIND_GLYPH[prize.kind];
        const centre = index * slice + slice / 2;
        // Carried round with its wedge, a label past the horizon arrives
        // upside down. The lower half is flipped about the label's own spot,
        // which lands it the right way up in the same slice.
        const flipped = centre > 90 && centre < 270;
        return (
          <g
            key={`${prize.id}-${index}`}
            {...(onSlice
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": prize.label,
                  className: "cursor-pointer outline-none focus-visible:opacity-80",
                  onClick: () => onSlice(prize, index),
                  // Enter and Space, because a shape with a click handler is
                  // reachable by keyboard or it is not reachable at all.
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSlice(prize, index);
                    }
                  },
                }
              : {})}
          >
            <path
              d={wedgePath(index, slice)}
              fill={chosen ?? (rare ? HIGHLIGHT : WEDGE[index % 2])}
              stroke="rgb(255 255 255 / 0.08)"
              strokeWidth={0.3}
            />
            {/* The label curves along the wedge's own stretch of rim — the
                widest part of a wedge, and the part that was empty. An arc is
                longer than the chord across it at the same radius, so this is
                simply more room for the same words.

                The baseline is drawn the other way round on the lower half:
                carried past the horizon a label arrives upside down, and
                reversing the line it is written on turns it back over. Text
                sits above its baseline either way, so the flipped arc is
                pushed out by one line's height to keep both halves at the
                same distance from the rim. */}
            <path
              id={`${arcId}-${index}`}
              d={titleArc(
                index,
                slice,
                flipped ? WHEEL.titleR + WHEEL.fontSize : WHEEL.titleR,
                flipped,
              )}
              fill="none"
            />
            <text
              fontSize={WHEEL.fontSize}
              fontWeight={700}
              fill={rare || chosen ? "#ffffff" : "#a3a3a3"}
            >
              <textPath
                href={`#${arcId}-${index}`}
                startOffset="50%"
                textAnchor="middle"
              >
                {prize.short}
              </textPath>
            </text>

            {/* The picture keeps the spoke, further in than it used to sit now
                that the words have the rim. Upright whichever half it is in: a
                photograph reads as a photograph at any angle, and turning it
                with the label would only make it harder to recognise. */}
            {/* The kind's glyph, where a picture would go. The shop's own
                picture wins when there is one: it says what the prize actually
                is, and a generic gift box beside it would only be noise.

                Kept upright rather than turned with the wedge — a symbol read
                at an angle is a symbol read slower, and there is no reading
                order here for the rotation to preserve. */}
            {!prize.image && Glyph ? (
              <g transform={`rotate(${centre} 50 50)`}>
                <Glyph
                  x={50 - WHEEL.glyphSize / 2}
                  y={50 - WHEEL.imageR - WHEEL.glyphSize / 2}
                  width={WHEEL.glyphSize}
                  height={WHEEL.glyphSize}
                  strokeWidth={1.8}
                  color={rare || chosen ? "#ffffff" : "#a3a3a3"}
                  opacity={0.75}
                />
              </g>
            ) : null}

            {prize.image ? (
              <image
                transform={`rotate(${centre} 50 50)`}
                href={prize.image}
                x={50 - WHEEL.imageSize / 2}
                y={50 - WHEEL.imageR - WHEEL.imageSize / 2}
                width={WHEEL.imageSize}
                height={WHEEL.imageSize}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : null}
          </g>
        );
      })}
      {/* The socket the button sits in. Drawn inside the wheel so it turns with
          it and the seam never shows. */}
      <circle cx={50} cy={50} r={15} fill="#0b0b10" stroke="rgb(255 255 255 / 0.12)" strokeWidth={0.6} />
    </svg>
  );
}
