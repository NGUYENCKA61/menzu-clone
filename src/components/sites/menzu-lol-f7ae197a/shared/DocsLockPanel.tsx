import { Clock, Lock } from "lucide-react";
import Link from "next/link";

import {
  DOCS_RULE_SENTENCE,
  docsUntilLabel,
  type DocsAccess,
} from "@/lib/docsAccess";

const BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[11px] font-black uppercase tracking-widest transition-colors";
const PRIMARY = `${BUTTON} bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]`;
const QUIET = `${BUTTON} border border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/25 hover:text-white`;

/**
 * What stands where a tool's gated documentation would be: who may read
 * it, why this reader may not yet (or may no more), and the way in. The
 * rule is repeated here in one sentence, since it is the whole reason the
 * panel exists.
 */
export function DocsLockPanel({
  access,
  productHref,
  loginHref,
  what = "Phần này",
}: {
  access: DocsAccess;
  /** The tool's own page, where a key is rented. */
  productHref: string;
  /** Sign in and come back here. */
  loginHref: string;
  /** The thing being locked, as the first words of the sentence. */
  what?: string;
}) {
  const expired = access.state === "expired";
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 sm:px-6">
      <span
        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 ${
          expired ? "text-amber-300" : "text-[var(--menzu-accent)]"
        }`}
      >
        {expired ? (
          <Clock className="h-4 w-4" aria-hidden />
        ) : (
          <Lock className="h-4 w-4" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-wider text-white">
          {expired
            ? "Hết hạn xem tài liệu"
            : access.state === "guest"
              ? "Đăng nhập để xem"
              : "Mở khoá sau khi thuê key"}
        </p>
        <p className="mt-1 text-sm leading-[1.65] text-neutral-300">
          {expired ? (
            <>
              Hạn xem theo key của bạn kết thúc lúc{" "}
              <span className="font-bold text-white">
                {access.until ? docsUntilLabel(access.until) : "trước đó"}
              </span>
              . {DOCS_RULE_SENTENCE}
            </>
          ) : access.state === "guest" ? (
            <>
              {what} dành cho khách đã thuê key của tool. Đã thuê rồi thì đăng
              nhập là xem được. {DOCS_RULE_SENTENCE}
            </>
          ) : (
            <>
              {what} chỉ hiện sau khi bạn thuê key của tool này. Chọn gói ở
              trang tool, thanh toán xong quay lại đây là xem được.{" "}
              {DOCS_RULE_SENTENCE}
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {access.state === "guest" ? (
            <Link href={loginHref} className={PRIMARY}>
              Đăng nhập
            </Link>
          ) : null}
          <Link
            href={productHref}
            className={access.state === "guest" ? QUIET : PRIMARY}
          >
            {expired ? "Thuê key mới" : "Thuê key"}
          </Link>
        </div>
      </div>
    </div>
  );
}
