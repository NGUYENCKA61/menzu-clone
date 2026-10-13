"use client";

import { useSyncExternalStore } from "react";

/**
 * TRIAL (13/10/2026, "làm thử web với giao diện trắng đi"): the footer's switch
 * between the dark site and its light dress (src/app/theme-light.css). The
 * choice lives in this browser only; the layout's first script applies it
 * before the page paints, so a reload never flashes the other one.
 */

const KEY = "ttt-theme";
const EVENT = "ttt-theme-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function isLight(): boolean {
  return document.documentElement.dataset.theme === "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const light = useSyncExternalStore(subscribe, isLight, () => false);

  function flip() {
    const next = !isLight();
    try {
      localStorage.setItem(KEY, next ? "light" : "dark");
    } catch {
      // Private window: the switch still works for this page.
    }
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button type="button" onClick={flip} className={className}>
      {light ? "Giao diện tối" : "Giao diện sáng"}
    </button>
  );
}

/**
 * Runs first in <body>, before anything paints: ?giao-dien=sang|toi sets the
 * choice, then the stored choice is applied.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get("giao-dien");if(q==="sang"||q==="toi"){localStorage.setItem("${KEY}",q==="sang"?"light":"dark")}if(localStorage.getItem("${KEY}")==="light"){document.documentElement.setAttribute("data-theme","light")}}catch(e){}})();`;
