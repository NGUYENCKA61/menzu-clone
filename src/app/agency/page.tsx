import type { Metadata } from "next";

import { redirect } from "next/navigation";
import { BadgePercent, Handshake, PackageCheck, Store } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { REFERRAL_PERCENT } from "@/lib/referral";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = { title: "Nâng cấp đại lý" };
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
    title: "Chiết khấu sâu nhất",
    body: "Nhập key theo lô với mức giá thỏa thuận riêng cùng admin.",
  },
  {
    icon: PackageCheck,
    title: "Ưu tiên hàng mới",
    body: "Key và tài khoản đợt mới về được giữ phần cho đại lý trước.",
  },
  {
    icon: Handshake,
    title: "Đối tác trực tiếp",
    body: "Làm việc thẳng với admin, đối soát công nợ theo kỳ.",
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

  const channels = [
    { label: "Nhắn Zalo cho shop", href: settings.contactZalo },
    { label: "Nhắn Facebook cho shop", href: settings.contactFacebook },
  ].filter((channel) => channel.href);

  return (
    <AccountPageFrame
      title="Nâng cấp đại lý"
      subtitle="Nhập số lượng lớn với chính sách giá tốt nhất"
      crumb="Nâng cấp đại lý"
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 flex items-start gap-5">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--brand)]/15 border border-[var(--brand)]/30 flex items-center justify-center">
            <Store size={22} className="text-[#a78bfa]" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xl font-black text-white">Trở thành Đại lý</span>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Cấp cao hơn Cộng tác viên, dành cho người bán có đầu ra ổn định:
              nhập key và tài khoản theo lô, hưởng mức chiết khấu sâu nhất của
              shop và luôn được ưu tiên khi hàng mới về.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PERKS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-2.5"
            >
              <Icon size={18} className="text-[#a78bfa]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
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
                <span className="w-7 h-7 shrink-0 rounded-full border border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[#a78bfa] text-xs font-black flex items-center justify-center">
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
                  className="h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[10px] font-black uppercase tracking-widest text-white inline-flex items-center justify-center"
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

        <p className="text-xs text-neutral-500">
          Muốn kiếm nhẹ nhàng hơn?{" "}
          <a
            href="/affiliate"
            className="font-black uppercase tracking-wider text-[#a78bfa] hover:text-white transition-colors"
          >
            Cộng tác viên
          </a>{" "}
          — chia sẻ liên kết giới thiệu, nhận {REFERRAL_PERCENT}% mỗi giao dịch
          nạp tiền.
        </p>
      </div>
    </AccountPageFrame>
  );
}
