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
 *
 * A third TRIAL the same way (14/10/2026, the owner: "Biến tấu sao cho đẹp
 * hơn đi ở bản sáng", "đẹp hiện đại chuyên nghiệp không có rối"): a calm
 * white and ocean-blue light dress with a near-black navbar, reached by
 * ?giao-dien=moi (data-variant="moi"). ?giao-dien=moi-den is the same dress
 * with the near-black footer instead of the soft band (data-footer="den"), so
 * the owner can compare the two endings.
 */

const KEY = "ttt-theme";
const EVENT = "ttt-theme-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Light, the Nike and moi variants included (they set data-theme="light" too). */
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
    // Either way a variant (nike, moi) is left behind: the link toggles the
    // dark site and the plain light dress, and from a variant it means "back
    // to dark".
    delete root.dataset.variant;
    delete root.dataset.footer;
    window.dispatchEvent(new Event(EVENT));
  }

  // The light dresses are parked (the owner, 16/10/2026: "Làm web đen trước,
  // web trắng tui để sau"): the dark site offers no way into them, so a
  // customer never meets an unfinished look. Whoever is in one (a
  // ?giao-dien= trial link, a stored choice) still gets the way back.
  if (!light) return null;

  return (
    <button type="button" onClick={flip} className={className}>
      Giao diện tối
    </button>
  );
}

/**
 * Runs first in <body>, before anything paints. ?giao-dien=sang|toi|nike|moi|
 * moi-den sets the choice (stored as "light", "dark", "nike", "moi" or
 * "moi-den"); without one, the stored choice is applied. "nike" and "moi" are
 * the light dress plus data-variant="nike" or "moi"; "moi-den" is "moi" plus
 * data-footer="den". sang clears the variant, toi clears both. A query still
 * applies for the page when storage is blocked.
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement,k="${KEY}",v=null;try{var q=new URLSearchParams(location.search).get("giao-dien");v=q==="sang"?"light":q==="toi"?"dark":q==="nike"||q==="moi"||q==="moi-den"?q:null;if(v){try{localStorage.setItem(k,v)}catch(e){}}else{v=localStorage.getItem(k)}}catch(e){}var m=v==="moi"||v==="moi-den";if(v==="light"||v==="nike"||m){d.setAttribute("data-theme","light")}else if(v==="dark"){d.removeAttribute("data-theme")}if(v==="nike"){d.setAttribute("data-variant","nike")}else if(m){d.setAttribute("data-variant","moi")}else{d.removeAttribute("data-variant")}if(v==="moi-den"){d.setAttribute("data-footer","den")}else{d.removeAttribute("data-footer")}
// The ADMIN's own dark switch (30/10/2026), applied before paint the same
// way: ?quan-tri=toi|sang or the stored choice; admin-dark.css does the rest.
try{var aq=new URLSearchParams(location.search).get("quan-tri");var av=aq==="toi"?"dark":aq==="sang"?"light":null;if(av){try{localStorage.setItem("ttt-admin-theme",av)}catch(e){}}else{av=localStorage.getItem("ttt-admin-theme")}if(av==="dark"){d.setAttribute("data-admin-theme","dark")}else{d.removeAttribute("data-admin-theme")}}catch(e){}
// The admin's "Giải thích" switch: field guidance folded away by default.
try{var h=localStorage.getItem("ttt-admin-help");if(h==="on"){d.setAttribute("data-admin-help","on")}else{d.removeAttribute("data-admin-help")}}catch(e){}})();`;
