"use client";

import { HelpCircle, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

/**
 * The admin's dark switch (the owner, 30/10/2026: "thêm phần chỉnh sang giao
 * diện đen nữa nha / công tắc"). The choice lives in this browser; the
 * layout's first script (THEME_BOOT_SCRIPT) applies it before paint, and
 * src/app/admin-dark.css is the whole dark dress. ?quan-tri=toi|sang in any
 * admin URL sets it too, so a look can be linked.
 */
const KEY = "ttt-admin-theme";
const EVENT = "ttt-admin-theme-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function isDark(): boolean {
  return document.documentElement.dataset.adminTheme === "dark";
}

function flip() {
  const next = !isDark();
  try {
    localStorage.setItem(KEY, next ? "dark" : "light");
  } catch {
    // Private window: the switch still works for this page.
  }
  const root = document.documentElement;
  if (next) root.dataset.adminTheme = "dark";
  else delete root.dataset.adminTheme;
  window.dispatchEvent(new Event(EVENT));
}

/** The sidebar row: a label and a real switch. */
export function AdminThemeSwitch() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={flip}
      className="flex w-full items-center justify-between gap-2 text-[12.5px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
    >
      <span className="inline-flex items-center gap-1.5">
        <Moon size={13} />
        Giao diện tối
      </span>
      <span
        aria-hidden
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          dark ? "bg-zinc-900" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-[2px] h-3.5 w-3.5 rounded-full bg-white transition-[left] ${
            dark ? "left-[16px]" : "left-[2px]"
          }`}
        />
      </span>
    </button>
  );
}

/**
 * "Giải thích": shows or hides every .admin-hint guidance paragraph
 * (src/app/admin-ui.css). Off by default — the screens read like a console;
 * on for setup days. Same storage-and-flag pattern as the theme.
 */
const HELP_KEY = "ttt-admin-help";
const HELP_EVENT = "ttt-admin-help-change";

function helpSubscribe(onChange: () => void): () => void {
  window.addEventListener(HELP_EVENT, onChange);
  return () => window.removeEventListener(HELP_EVENT, onChange);
}

function helpOn(): boolean {
  return document.documentElement.dataset.adminHelp === "on";
}

function flipHelp() {
  const next = !helpOn();
  try {
    localStorage.setItem(HELP_KEY, next ? "on" : "off");
  } catch {
    // Private window: the switch still works for this page.
  }
  const root = document.documentElement;
  if (next) root.dataset.adminHelp = "on";
  else delete root.dataset.adminHelp;
  window.dispatchEvent(new Event(HELP_EVENT));
}

export function AdminHelpSwitch() {
  const on = useSyncExternalStore(helpSubscribe, helpOn, () => false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={flipHelp}
      title="Hiện hoặc ẩn các dòng giải thích dưới từng ô"
      className="flex w-full items-center justify-between gap-2 text-[12.5px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
    >
      <span className="inline-flex items-center gap-1.5">
        <HelpCircle size={13} />
        Giải thích
      </span>
      <span
        aria-hidden
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          on ? "bg-zinc-900" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-[2px] h-3.5 w-3.5 rounded-full bg-white transition-[left] ${
            on ? "left-[16px]" : "left-[2px]"
          }`}
        />
      </span>
    </button>
  );
}

/** The phone bar's version: one icon button. */
export function AdminThemeSwitchIcon() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Về giao diện sáng" : "Chuyển giao diện tối"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:text-zinc-900"
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
