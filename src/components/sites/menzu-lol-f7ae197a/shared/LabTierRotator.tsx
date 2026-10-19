"use client";

import { useEffect, useState } from "react";

/**
 * LAB, dev only: the owner compares three tier mark versions on /cap-bac
 * itself ("e1 e2 e3 thử hết 20s đổi 1 cái"). TierEmblem draws all three in
 * dev, classed lab-tv-e1/e2/e3; this shows one at a time, moving on every
 * 20 seconds, and says which one is up. Comes out with the versions once
 * one is picked.
 */
const VERSIONS = [
  { key: "e1", label: "E1 · không khung, vương miện đặc" },
  { key: "e2", label: "E2 · không khung, vương miện nét viền" },
  { key: "e3", label: "E3 · khung tròn" },
] as const;

const SECONDS = 20;

export function LabTierRotator() {
  const [tick, setTick] = useState(0);
  const version = VERSIONS[Math.floor(tick / SECONDS) % VERSIONS.length];

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.tierV = version.key;
  }, [version.key]);

  useEffect(() => () => {
    delete document.documentElement.dataset.tierV;
  }, []);

  return (
    <>
      <style>
        {
          '.lab-tv{display:none}html[data-tier-v="e1"] .lab-tv-e1,html[data-tier-v="e2"] .lab-tv-e2,html[data-tier-v="e3"] .lab-tv-e3,html:not([data-tier-v]) .lab-tv-e1{display:block}'
        }
      </style>
      <div className="fixed bottom-20 left-4 z-50 rounded-lg border border-white/15 bg-black/85 px-3 py-2 text-[12px] font-semibold text-white lg:bottom-6">
        {version.label} · đổi sau {SECONDS - (tick % SECONDS)}s
      </div>
    </>
  );
}
