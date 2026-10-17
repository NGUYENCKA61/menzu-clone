import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { completeFreeClaim } from "@/lib/freeKey";
import { freeWaitWording } from "@/lib/freeKeyRules";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * A one-time ticket, not a page for an index: each claim has its own random
 * address, and opening it spends the claim. Without this it carried the home
 * page's title and "index, follow" (the owner's SEO review, 13/10/2026).
 * robots.txt also keeps compliant crawlers off /free-key altogether; this
 * covers the ones that arrive anyway.
 */
export const metadata: Metadata = {
  title: "Key miễn phí",
  robots: { index: false, follow: false },
};

/**
 * Where the shop's shortlink lands: the ticket in the address is spent on a
 * key, which is shown here and sits in Lịch sử mua from now on. The address
 * is only ever reached through the shortlink, which is the whole point.
 */
export default async function FreeKeyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, outcome] = await Promise.all([
    getCurrentUser(),
    completeFreeClaim(id),
  ]);

  const BUTTON =
    "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold transition-colors";
  const PRIMARY = `${BUTTON} bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]`;
  const QUIET = `${BUTTON} border border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/25 hover:text-white`;

  return (
    <SimplePage title="Key miễn phí" crumb="Key miễn phí" icon={KeyRound}>
      <div className="mx-auto max-w-[560px] rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        {outcome.state === "missing" ? (
          <>
            <h2 className="text-[18px] font-bold text-white">Link không hợp lệ</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
              Link này không thuộc lượt lấy key nào. Vào trang tool và bấm Lấy
              key miễn phí để có link mới.
            </p>
          </>
        ) : outcome.state === "expired" ? (
          <>
            <h2 className="text-[18px] font-bold text-white">Link đã hết hạn</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
              Mỗi link chỉ dùng được trong 2 giờ. Quay lại trang tool và bấm Lấy
              key miễn phí lần nữa.
            </p>
            {outcome.productHref ? (
              <Link href={outcome.productHref} className={`${PRIMARY} mt-5`}>
                Về trang tool
              </Link>
            ) : null}
          </>
        ) : outcome.state === "claimed" && user?.id === outcome.userId ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[12px] font-semibold text-emerald-300">
              Đã nhận key
            </span>
            <h2 className="mt-3 text-[18px] font-bold text-white">
              {outcome.productName}
            </h2>
            <p className="mt-1 text-[13px] text-neutral-400">
              Đơn{" "}
              <span className="font-bold text-neutral-200">
                {outcome.orderCode}
              </span>
              . Key của bạn:
            </p>
            <code className="mt-3 block rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 font-mono text-base font-bold tracking-wider text-white break-all">
              {outcome.key ??
                "Key đang được shop giao, xem lại trong Lịch sử mua"}
            </code>
            <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
              Key, link tải và tài liệu của tool nằm trong Lịch sử mua hàng, mở
              lại bất cứ lúc nào.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/orders" className={PRIMARY}>
                Xem trong Lịch sử mua
              </Link>
              <Link href={outcome.productHref} className={QUIET}>
                Về trang tool
              </Link>
            </div>
          </>
        ) : outcome.state === "claimed" ? (
          <>
            <h2 className="text-[18px] font-bold text-white">
              Key đã vào tài khoản khác
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
              Lượt lấy key này thuộc tài khoản đã bấm Lấy key. Đăng nhập đúng
              tài khoản đó và mở Lịch sử mua hàng để xem key.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/login?next=%2Forders" className={PRIMARY}>
                Đăng nhập
              </Link>
              <Link href={outcome.productHref} className={QUIET}>
                Về trang tool
              </Link>
            </div>
          </>
        ) : outcome.state === "wait" ? (
          <>
            <h2 className="text-[18px] font-bold text-white">
              Hôm nay bạn đã nhận key tool này
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
              {freeWaitWording(new Date(outcome.until))} Key hôm nay đang nằm
              trong Lịch sử mua hàng.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/orders" className={PRIMARY}>
                Xem trong Lịch sử mua
              </Link>
              <Link href={outcome.productHref} className={QUIET}>
                Về trang tool
              </Link>
            </div>
          </>
        ) : outcome.state === "closed" ? (
          <>
            <h2 className="text-[18px] font-bold text-white">
              Chưa phát key được
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
              {outcome.reason}. Theo dõi kênh thông báo của shop để biết khi
              tool phát key lại.
            </p>
            <Link href={outcome.productHref} className={`${PRIMARY} mt-5`}>
              Về trang tool
            </Link>
          </>
        ) : (
          <>
            <h2 className="text-[18px] font-bold text-white">Chưa lấy được key</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
              Lượt này chưa hoàn tất. Quay lại trang tool và bấm Lấy key miễn
              phí để thử lại.
            </p>
          </>
        )}
      </div>
    </SimplePage>
  );
}
