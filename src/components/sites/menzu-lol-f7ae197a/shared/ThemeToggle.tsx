"use client";

import { useSyncExternalStore } from "react";

/**
 * TRIAL (13/10/2026, "làm thử web với giao diện trắng đi"): the footer's switch
 * between the dark site and its light dress (src/app/theme-light.css). The
 * choice lives in this browser only; the layout's first script applies it
 * before the page paints, so a reload never flashes the other one.
 *
 * A second TRIAL rides on the light dress (13/10/2026, "style trắng đen đi làm
 * sao giống nike thử"): black and white after Nike, reached by
 * ?giao-dien=nike only. It is the light dress plus data-variant="nike" on
 * <html>, so this switch reads it as light: the link offers "Giao diện tối",
 * and pressing it goes back to the dark site, variant and all.
 */

const KEY = "ttt-theme";
const EVENT = "ttt-theme-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Light, the Nike variant included (it sets data-theme="light" too). */
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
    const root = document.documentElement;
    if (next) root.dataset.theme = "light";
    else delete root.dataset.theme;
    // Either way the Nike variant is left behind: the link toggles the dark
    // site and the plain light dress, and from Nike it means "back to dark".
    delete root.dataset.variant;
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button type="button" onClick={flip} className={className}>
      {light ? "Giao diện tối" : "Giao diện sáng"}
    </button>
  );
}

/**
 * Runs first in <body>, before anything paints. ?giao-dien=sang|toi|nike sets
 * the choice (stored as "light", "dark" or "nike"); without one, the stored
 * choice is applied. "nike" is the light dress plus data-variant="nike";
 * sang clears the variant, toi clears both. A query still applies for the page
 * when storage is blocked.
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement,k="${KEY}",v=null;try{var q=new URLSearchParams(location.search).get("giao-dien");v=q==="sang"?"light":q==="toi"?"dark":q==="nike"?"nike":null;if(v){try{localStorage.setItem(k,v)}catch(e){}}else{v=localStorage.getItem(k)}}catch(e){}if(v==="light"||v==="nike"){d.setAttribute("data-theme","light")}else if(v==="dark"){d.removeAttribute("data-theme")}if(v==="nike"){d.setAttribute("data-variant","nike")}else{d.removeAttribute("data-variant")}})();`;
