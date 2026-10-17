"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { lockScroll, unlockScroll } from "./modalChrome";
import { SHEET, SHEET_BUTTON, SHEET_TEXT, SHEET_TITLE } from "./noticeSheet";
import { useLeave } from "./useOverlayPresence";

/** Nothing to listen to: the snapshot only tells the server from the browser. */
const subscribeNothing = () => () => {};

/**
 * What /vong-quay shows while the wheel is closed (SPIN_LOCKED): the house
 * notice sheet over an empty page, and one way out — home. Escape and the
 * backdrop take the same way, since there is nothing behind the sheet to
 * stay for.
 *
 * `replace`, not `push`: Back from the home page should not land on this
 * notice again.
 */
export function SpinLockedNotice() {
  const router = useRouter();
  const confirm = useRef<HTMLButtonElement>(null);
  const goHome = useCallback(() => router.replace("/"), [router]);
  const { leaving, leave } = useLeave(goHome);
  // LAB (17/10/2026): the page now sits in the account layout, whose <main>
  // is a stacking context under the header. Once mounted the sheet moves to
  // <body>, so the frost covers the header too ("full mờ", 07/10/2026); the
  // first paint draws it in place so nothing shows unfrosted meanwhile.
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  useEffect(() => {
    confirm.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        leave();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        confirm.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    lockScroll();

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [leave, mounted]);

  const sheet = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" inert={leaving}>
      {/* The whole screen behind frosted, header and wheel alike, with a
          lighter tint so the blur reads as blur rather than black (the
          owner, 07/10/2026: "cho thông báo tạm ngưng sự kiện -> full mờ"). */}
      <div
        className={`error-modal-backdrop absolute inset-0 bg-black/55 backdrop-blur-md${leaving ? " order-modal-backdrop-out" : ""}`}
        onClick={leave}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="spin-locked-title"
        aria-describedby="spin-locked-message"
        // LAB: the house notice sheet (noticeSheet.ts): a small grey lock
        // beside the title instead of the red ring; red stays for the button.
        className={`${SHEET} notice-modal-card max-w-[400px] px-6 py-6${leaving ? " order-modal-card-out" : ""}`}
      >
        <h2 id="spin-locked-title" className={SHEET_TITLE}>
          <Lock size={18} aria-hidden className="shrink-0 text-mist" />
          Vòng quay đang tạm ngưng
        </h2>

        <p id="spin-locked-message" className={`mt-2 ${SHEET_TEXT}`}>
          Điểm thưởng của bạn vẫn được giữ nguyên.
        </p>

        <button
          ref={confirm}
          type="button"
          onClick={leave}
          className={`mt-6 w-full ${SHEET_BUTTON}`}
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );

  return mounted ? createPortal(sheet, document.body) : sheet;
}
