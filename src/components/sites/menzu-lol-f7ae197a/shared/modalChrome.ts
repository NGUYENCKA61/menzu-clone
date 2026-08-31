/*
 * What a modal needs beyond its markup: which elements a Tab cycle may
 * land on, a page-scroll lock that survives two dialogs being up at once,
 * and the Tab trap itself. Shared by the order receipt and the buy-confirm
 * dialog so the two behave the same under the keyboard.
 */

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * One lock for however many dialogs are open. Two can be — Tab out of one
 * receipt and press Enter on the next row — and a per-dialog lock would let
 * the second one's cleanup hand the page back its scrollbar while the first
 * is still up, or the first's cleanup restore "hidden" as the value it found.
 */
let scrollLocks = 0;
let savedOverflow = "";

export function lockScroll() {
  if (scrollLocks++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}

export function unlockScroll() {
  if (--scrollLocks === 0) document.body.style.overflow = savedOverflow;
}

/** Keeps a Tab press inside `panel`, wrapping at either end. */
export function trapTab(panel: HTMLElement, event: KeyboardEvent) {
  const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === panel)) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (active === last || !panel.contains(active))
  ) {
    event.preventDefault();
    first.focus();
  }
}
