import type { Metadata } from "next";
import Link from "next/link";

import { redirect } from "next/navigation";
import { ArrowRight, BadgePercent, Handshake, KeyRound, PackageCheck, Store } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { REFERRAL_PERCENT } from "@/lib/referral";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = {
  title: "Nâng cấp đại lý",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

/**
 * The floor above /affiliate, same skeleton on purpose — a reader comparing
 * the two programmes should only have to compare the words. No discount
 * figures printed: terms are agreed in the conversation with the admin, not
 * on this page.
 */
const PERKS = [
  {
    icon: BadgePercent,
    title: "Chiết khấu mọi gói key",
    body: "Mua key phần mềm thấp hơn giá niêm yết theo mức thỏa thuận riêng với admin — không công khai.",
  },
  {
    icon: KeyRound,
    title: "Dashboard mua sỉ riêng",
    body: "Bàn đại lý riêng trên web: chọn gói, chọn số lượng, trả bằng số dư ví.",
  },
  {
    icon: Handshake,
    title: "Đối tác trực tiếp",
    body: "Làm việc thẳng với admin, đơn đại lý được ưu tiên giao key trước.",
  },
] as const;

const STEPS = [
  "Để được lên đại lý cần nạp tối thiểu 1.000.000đ và mua role đại lý: 500.000đ",
  "Nhắn cho admin kèm UID của bạn — admin xác minh, chốt mức chiết khấu riêng và gắn quyền",
  "Nếu cần làm thêm cả website riêng, liên hệ với admin",
] as const;

export default async function AgencyPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);
  if (!user) redirect("/login?next=%2Fagency");

  const isAgency = user.role === "AGENCY" || user.role === "ADMIN";

  const channels = [
    { label: "Nhắn Zalo cho shop", href: settings.contactZalo },
    { label: "Nhắn Facebook cho shop", href: settings.contactFacebook },
  ].filter((channel) => channel.href);

  return (
    <AccountPageFrame
      title="Nâng cấp đại lý"
      subtitle="Mua key giá sỉ ngay trên web — mức chiết khấu thỏa thuận riêng khi được cấp quyền"
      crumb="Nâng cấp đại lý"
    >
      <div className="flex flex-col gap-6">
        {isAgency ? (
          <Link
            href="/agency/dashboard"
            className="flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 transition-colors hover:border-amber-500/50 hover:bg-amber-500/10"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10">
              <KeyRound size={18} className="text-amber-400" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-black uppercase tracking-wider text-white">
                Tài khoản của bạn là Đại lý
              </span>
              <span className="text-xs text-neutral-400">
                Vào bàn mua key với mức chiết khấu riêng của bạn
              </span>
            </span>
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-400">
              Vào bàn đại lý <ArrowRight size={13} />
            </span>
          </Link>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 flex items-start gap-5">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
            <Store size={22} className="text-[var(--menzu-accent)]" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xl font-black text-white">Trở thành Đại lý</span>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Dành cho người bán có đầu ra ổn định: được admin cấp quyền là mở
              được dashboard mua key riêng — chọn gói, chọn số lượng, trả bằng
              số dư ví với mức chiết khấu thỏa thuận riêng.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PERKS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-2.5"
            >
              <Icon size={18} className="text-[var(--menzu-accent)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                {title}
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 flex flex-col gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Cách đăng ký
          </span>
          <ol className="flex flex-col gap-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full border border-white/15 bg-white/[0.06] text-white text-xs font-black flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-neutral-200">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-neutral-500">
            UID của bạn:{" "}
            <span className="font-bold text-neutral-300">{user.uid}</span> — gửi
            kèm khi nhắn để admin tra tài khoản nhanh.
          </p>

          {channels.length ? (
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              {channels.map((channel) => (
                <a
                  key={channel.label}
                  href={channel.href}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-5 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] transition-colors text-[10px] font-black uppercase tracking-widest text-white inline-flex items-center justify-center"
                >
                  {channel.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              Shop chưa khai kênh liên hệ trong Cấu hình — quay lại sau nhé.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <PackageCheck size={16} className="shrink-0 text-neutral-500" />
          <p className="text-xs leading-relaxed text-neutral-400">
            Đơn đại lý vẫn vào Lịch sử mua như đơn thường; admin giao key sau
            khi đơn được tạo.
          </p>
        </div>

        <p className="text-xs text-neutral-500">
          Muốn kiếm nhẹ nhàng hơn?{" "}
          <Link
            href="/affiliate"
            className="font-black uppercase tracking-wider text-[var(--menzu-accent)] hover:text-white transition-colors"
          >
            Cộng tác viên
          </Link>{" "}
          — chia sẻ liên kết giới thiệu, nhận {REFERRAL_PERCENT}% mỗi giao dịch
          nạp tiền.
        </p>
      </div>
    </AccountPageFrame>
  );
}
