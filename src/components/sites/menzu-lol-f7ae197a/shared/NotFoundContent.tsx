"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, House, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

const BACKDROP_SRC =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/behance/e4307d166239615.6418bdb0084a4.webp";

/** The live page counts down from 7 before sending you home. */
const REDIRECT_SECONDS = 7;

/**
 * Body of the 404 page, matching the live site's.
 *
 * A client component because of the countdown. `router.push` rather than
 * `location.href` keeps the client-side router's history intact, so Back
 * still returns to wherever the broken link came from.
 */
export function NotFoundContent() {
  const router = useRouter();
  const [remaining, setRemaining] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (remaining <= 0) {
      router.push("/");
      return;
    }
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, router]);

  return (
    <div className="w-full flex-1 flex items-center justify-center py-12 sm:py-24 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-5 scale-105">
          <Image
            src={BACKDROP_SRC}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[var(--menzu-accent)]/5 blur-[120px]" />
      </div>

      <div className="mx-auto px-4 lg:px-6 py-8 lg:py-10 relative z-10 max-w-md w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-[var(--menzu-accent)] mb-2">
          <TriangleAlert className="w-10 h-10" />
        </div>

        <div className="space-y-3">
          <h1 className="text-8xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wider">
            Không tìm thấy trang
          </h2>
          <p className="text-neutral-400 text-sm max-w-sm mx-auto leading-relaxed">
            Đường liên kết bạn vừa truy cập không tồn tại, đã bị thay đổi hoặc
            đã bị gỡ bỏ khỏi hệ thống.
          </p>
        </div>

        <div
          className="p-4 rounded-xl border border-white/5 bg-white/[0.02] max-w-xs mx-auto text-xs text-neutral-400"
          // The number changes every second; announcing each tick would make a
          // screen reader unusable, so only the surrounding text is live.
          aria-live="off"
        >
          Tự động điều hướng về trang chủ sau
          <span className="text-[var(--menzu-accent)] font-extrabold text-sm mx-1">{remaining}</span>
          giây...
        </div>

        <div className="max-w-xs mx-auto">
          <Link
            href="/"
            className="group block relative w-full p-[1.5px] transition-all duration-300 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] bg-[var(--menzu-accent)]/50 hover:bg-[var(--menzu-accent)]"
          >
            <div className="relative w-full bg-[#101114] group-hover:bg-[var(--menzu-accent)] transition-colors duration-300 flex items-center justify-center py-3 [clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)] overflow-hidden">
              <House className="w-4 h-4 text-[var(--menzu-accent)] group-hover:text-white mr-2 transition-colors duration-300" />
              <span className="text-white font-black text-xs uppercase tracking-widest">
                Quay lại trang chủ
              </span>
              <ArrowRight className="w-4 h-4 text-[var(--menzu-accent)] group-hover:text-white ml-2 group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
