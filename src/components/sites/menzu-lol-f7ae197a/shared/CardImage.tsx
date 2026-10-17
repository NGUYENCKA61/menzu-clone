"use client";

import { ImageOff } from "lucide-react";
import Image, { type ImageLoaderProps, type ImageProps } from "next/image";
import { useState } from "react";

type Phase = "settled" | "loading" | "done" | "broken";

/**
 * A card's picture, with the three states a picture actually has.
 *
 * Every card on the site drew its frame flat and let the picture cut in
 * whenever it arrived — twelve cards, twelve different moments, so a grid
 * flickered into being rather than appearing. And a picture that failed
 * printed its alt text across the frame in the site's own typeface, which
 * on a card reads as a caption nobody wrote.
 *
 * This keeps the frame the caller gives it (the aspect box, the colour) and
 * adds: a faint sweep across the frame while the picture is on its way,
 * a 260ms fade when it lands, and a quiet broken-image mark when it does
 * not. Two things it is careful about. The sweep is held back 120ms, so a
 * picture that is already cached never shows it. And a picture that was
 * complete before React ran — which is every picture in the server-rendered
 * HTML on a fast connection — is left exactly as it painted: the fade is
 * only started for a picture that is still loading when the component mounts,
 * so nothing that was visible goes invisible waiting for JavaScript.
 *
 * The fade sits on a wrapper, not on the <img>: the callers put a hover
 * scale on the picture itself and two transforms on one element fight.
 */
export function CardImage({
  className,
  alt,
  onLoad,
  onError,
  maxWidth,
  ...props
}: ImageProps & {
  /**
   * The widest file the browser may be sent, for a picture under a dark veil
   * where the extra pixels cannot be seen (the site backgrounds, lab
   * 17/10/2026). The browser still asks for what its screen needs, up to
   * this width; the stored upload is untouched.
   */
  maxWidth?: number;
}) {
  const [phase, setPhase] = useState<Phase>("settled");
  const capped =
    maxWidth && typeof props.src === "string" && props.src.startsWith("/")
      ? ({ src, width, quality }: ImageLoaderProps) =>
          `/_next/image?url=${encodeURIComponent(src)}&w=${Math.min(width, maxWidth)}&q=${quality ?? 75}`
      : props.loader;

  if (phase === "broken") {
    return (
      <span
        role="img"
        aria-label={typeof alt === "string" ? alt : undefined}
        className="absolute inset-0 grid place-items-center text-neutral-700"
      >
        <ImageOff size={20} aria-hidden />
      </span>
    );
  }

  return (
    <>
      {phase === "loading" ? <span aria-hidden className="card-image-wait" /> : null}
      <span className={`card-image-in absolute inset-0 ${phase === "loading" ? "is-waiting" : ""}`}>
        <Image
          {...props}
          loader={capped}
          alt={alt}
          className={className}
          ref={(img) => {
            // Decided once, at mount: a picture that is already here stays
            // as it painted; one that is not gets the sweep and the fade.
            if (img && !img.complete && phase === "settled") setPhase("loading");
          }}
          onLoad={(event) => {
            setPhase((current) => (current === "loading" ? "done" : current));
            onLoad?.(event);
          }}
          onError={(event) => {
            setPhase("broken");
            onError?.(event);
          }}
        />
      </span>
    </>
  );
}
