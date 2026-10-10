/**
 * Put text on the clipboard, wherever the page is served from.
 *
 * `navigator.clipboard` only exists in a secure context, which the shop's own
 * LAN address (http://192.168.1.26:3100) is not, so every copy button on the
 * site did nothing there: the call threw and the catch quietly gave up
 * (checked 10/10/2026, the owner: "chức năng sao chép có lỗi không vậy").
 * Production is https and keeps the modern path; anywhere else falls back to
 * a hidden textarea and the old command, which has no such rule.
 *
 * Returns whether the text was copied, so a caller can say "Đã chép" only
 * when it was.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Refused even on https (a browser setting, a page without focus); the
    // textarea below is still worth a try.
  }

  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  // Off the page but still focusable: display:none or visibility:hidden would
  // leave nothing to select, and a scroll jump is what position:fixed avoids.
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  document.body.append(area);
  const before = document.activeElement;
  let done = false;
  try {
    area.select();
    area.setSelectionRange(0, value.length);
    done = document.execCommand("copy");
  } catch {
    done = false;
  }
  area.remove();
  if (before instanceof HTMLElement) before.focus();
  return done;
}
