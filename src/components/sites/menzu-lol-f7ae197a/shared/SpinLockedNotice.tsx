"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { lockScroll, unlockScroll } from "./modalChrome";
import { useLeave } from "./useOverlayPresence";

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
  }, [leave]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" inert={leaving}>
      <div
        className={`error-modal-backdrop absolute inset-0 bg-black/75${leaving ? " order-modal-backdrop-out" : ""}`}
        onClick={leave}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="spin-locked-title"
        aria-describedby="spin-locked-message"
        className={`notice-modal-card relative w-full max-w-[380px] rounded-xl border-[1.5px] border-white/10 bg-[#131316] px-7 py-8 text-center shadow-2xl shadow-black/60${
          leaving ? " order-modal-card-out" : ""
        }`}
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)]">
          <Lock size={28} strokeWidth={2.5} />
        </span>

        <h2
          id="spin-locked-title"
          className="mt-5 text-[17px] font-black uppercase tracking-wide text-white"
        >
          Đổi thưởng tạm đóng
        </h2>

        <p id="spin-locked-message" className="mt-3 text-[13px] leading-relaxed text-neutral-300">
          Vòng quay đổi thưởng sẽ sớm được mở. Điểm thưởng của bạn vẫn được giữ nguyên.
        </p>

        <button
          ref={confirm}
          type="button"
          onClick={leave}
          className="mt-6 h-11 w-full rounded-lg bg-[var(--menzu-accent)] text-[13px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
