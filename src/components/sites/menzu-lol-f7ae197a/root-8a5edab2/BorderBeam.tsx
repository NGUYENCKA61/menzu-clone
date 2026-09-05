import type { CSSProperties } from "react";

/**
 * A spot of light that runs round the border of whatever holds it — the
 * effect the hero search on lmarket.net wears. Drop it inside any element
 * that is `relative` with a border radius: it fills the box, inherits the
 * radius, masks itself down to the border ring and sends a comet along it.
 *
 * The drawing lives in globals.css under `.border-beam`; this only sets the
 * knobs. Sizes are unitless numbers the CSS multiplies into px and seconds.
 * Colours default to the shop's accent pair.
 */
export function BorderBeam({
  size = 120,
  duration = 10,
  anchor = 90,
  borderWidth = 1.5,
  delay = 0,
}: {
  /** Length of the comet, in px. */
  size?: number;
  /** Seconds for one lap. */
  duration?: number;
  /** Where along the comet the path anchors, 0–100. */
  anchor?: number;
  /** Thickness of the lit ring, in px. */
  borderWidth?: number;
  /** Seconds into the lap the comet starts, so two beams need not line up. */
  delay?: number;
}) {
  const knobs = {
    "--beam-size": size,
    "--beam-duration": duration,
    "--beam-anchor": anchor,
    "--beam-border-width": borderWidth,
    "--beam-delay": `${-delay}s`,
  } as CSSProperties;

  return <span aria-hidden className="border-beam" style={knobs} />;
}
