"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A reviewer's photo laid over the initial drawn under it, and taken away if
 * it fails to load, so the initial shows instead of a broken picture. A
 * review keeps the photo address it was left with, and a photo the reviewer
 * has since replaced is gone from the server (seen on the home page,
 * 18/10/2026: "nhìn vậy xấu quá").
 */
export function AvatarPhoto({ src, size }: { src: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={`${size}px`}
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}
