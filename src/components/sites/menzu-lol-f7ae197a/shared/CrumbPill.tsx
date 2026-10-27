"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/**
 * LAB: the desktop breadcrumb's frame, with ?duongdan= picking a dress to
 * set beside the default (the owner, 27/10/2026: "làm 1 bản đường dẫn riêng
 * đi tui coi"): nhe (the default, a light fill), trong (see-through), cu
 * (the dark pill the live site has) and khong (no frame). Read from the
 * address once the page is in the browser, so the server's HTML, a
 * production build and any address without it show the default.
 */
const DRESS: Record<string, string> = {
  nhe: "px-4 py-2.5 bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-full",
  trong: "px-4 py-2.5 border border-white/10 hover:border-white/20 rounded-full",
  cu: "px-4 py-2.5 bg-panel/80 border border-white/10 hover:border-white/20 shadow-lg rounded-full backdrop-blur-md",
  khong: "",
};

/** The address does not change under the trail, so there is nothing to
 *  subscribe to. */
const subscribe = () => () => {};

function readDress(): string {
  if (process.env.NODE_ENV === "production") return "nhe";
  const asked = new URLSearchParams(window.location.search).get("duongdan") ?? "";
  return asked in DRESS ? asked : "nhe";
}

export function CrumbPill({ className, children }: { className: string; children: ReactNode }) {
  const dress = useSyncExternalStore(subscribe, readDress, () => "nhe");
  return (
    <nav aria-label="Breadcrumb" className={`${className} ${DRESS[dress]}`}>
      {children}
    </nav>
  );
}
