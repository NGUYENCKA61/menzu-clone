import type { Metadata } from "next";
import type { ComponentType } from "react";
import { Phone, ShieldAlert } from "lucide-react";

import {
  DiscordGlyph,
  FacebookGlyph,
  TelegramGlyph,
  TiktokGlyph,
  ZaloGlyph,
} from "@/components/sites/menzu-lol-f7ae197a/shared/BrandGlyphs";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { SITE_URL } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = {
  title: "Kênh chính thức & liên hệ",
  description:
    "Toàn bộ kênh liên hệ chính thức của THICHTHIHACK: Telegram, Zalo, Facebook, Discord, TikTok. Ngoài những địa chỉ trong trang này đều là giả mạo.",
  alternates: { canonical: "/lien-he" },
};
export const dynamic = "force-dynamic";

/**
 * One row of the list: what the channel is for, and the address itself.
 *
 * The address is printed in full rather than hidden behind the name. Everything
 * this page exists to prevent turns on a reader being able to compare the
 * address in front of them with the one they were sent, and a link that says
 * only "Telegram" gives them nothing to compare.
 */
interface Channel {
  /** Either a brand mark of the shop's own or a lucide glyph; both take a
   *  className and draw in currentColor. */
  icon: ComponentType<{ className?: string }>;
  label: string;
  note: string;
  href: string;
  /** A phone number is dialled, not opened; it gets a tel: link. */
  phone?: boolean;
}

/** The address as a reader should check it: no scheme, no trailing slash. */
function bare(href: string): string {
  return href.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default async function OfficialChannelsPage() {
  const settings = await getShopSettings();

  const channels: Channel[] = [
    {
      icon: TelegramGlyph,
      label: "Telegram",
      note: "Kênh thông báo và hỗ trợ nhanh nhất",
      href: settings.contactTelegram,
    },
    {
      icon: ZaloGlyph,
      label: "Zalo",
      note: "Nhắn tin trực tiếp với shop",
      href: settings.contactZalo,
    },
    {
      icon: ZaloGlyph,
      label: "Nhóm Zalo",
      note: "Nhóm chung, hỏi đáp và thông báo",
      href: settings.contactZaloGroup,
    },
    {
      icon: FacebookGlyph,
      label: "Facebook",
      note: "Trang chính thức của shop",
      href: settings.contactFacebook,
    },
    {
      icon: FacebookGlyph,
      label: "Nhóm Facebook",
      note: "Cộng đồng người dùng",
      href: settings.contactFacebookGroup,
    },
    {
      icon: DiscordGlyph,
      label: "Discord",
      note: "Máy chủ cộng đồng",
      href: settings.contactDiscord,
    },
    {
      icon: TiktokGlyph,
      label: "TikTok",
      note: "Video hướng dẫn và cập nhật",
      href: settings.contactTiktok,
    },
    {
      icon: Phone,
      label: "Hotline",
      note: "Gọi trong giờ hỗ trợ",
      href: settings.contactHotline,
      phone: true,
    },
  ].filter((channel) => channel.href.trim().length > 0);

  return (
    <SimplePage title="Kênh chính thức & liên hệ" crumb="Liên hệ">
      {/* The warning first, and in the shop's own red: somebody who has just
          been messaged by a fake account is reading this page for one reason,
          and it is not the TikTok link. */}
      <div className="mb-8 flex gap-3.5 rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-5">
        <ShieldAlert size={20} className="mt-0.5 shrink-0 text-rose-400" />
        <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-neutral-300">
          <p className="text-sm font-black text-white">
            Chỉ những địa chỉ trong trang này là của shop
          </p>
          <p>
            Mọi tài khoản khác nhận là nhân viên, đại lý hay &ldquo;shop phụ&rdquo; đều là
            giả mạo. Shop{" "}
            <span className="font-bold text-white">không bao giờ hỏi mật khẩu</span> tài
            khoản của bạn, không hỏi mã OTP, và{" "}
            <span className="font-bold text-white">
              không nhận thanh toán ngoài trang nạp tiền
            </span>{" "}
            trên website.
          </p>
          <p>
            Trước khi nạp, kiểm tra thanh địa chỉ đúng{" "}
            <span className="font-mono font-bold text-white">{bare(SITE_URL)}</span> — một
            chữ khác là một trang khác.
          </p>
        </div>
      </div>

      {channels.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {channels.map((channel) => (
            <a
              key={`${channel.label}-${channel.href}`}
              href={channel.phone ? `tel:${channel.href.replace(/\s/g, "")}` : channel.href}
              {...(channel.phone ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.04]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]">
                <channel.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-black text-white">{channel.label}</span>
                <span className="text-[11px] text-neutral-500">{channel.note}</span>
                {/* The address itself, wrapped rather than cut: half an
                    address is worse than none for checking one against
                    another. */}
                <span className="mt-1 break-all font-mono text-[11px] text-neutral-400 transition-colors group-hover:text-[var(--menzu-accent)]">
                  {channel.phone ? channel.href : bare(channel.href)}
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-neutral-400">
          Shop chưa cập nhật kênh liên hệ nào. Bạn dùng phần hỗ trợ ở góc màn hình nhé.
        </p>
      )}

      <p className="mt-6 max-w-[760px] text-[13px] leading-relaxed text-neutral-500">
        Gặp tài khoản mạo danh shop? Chụp lại màn hình rồi gửi vào kênh Telegram ở trên —
        shop báo cho cả nhóm để không ai bị lừa thêm.
      </p>
    </SimplePage>
  );
}
