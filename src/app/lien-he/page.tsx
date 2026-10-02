import type { Metadata } from "next";
import type { ComponentType } from "react";
import { CircleAlert, Phone, Users } from "lucide-react";

import {
  DiscordGlyph,
  FacebookGlyph,
  TelegramGlyph,
  TiktokGlyph,
  ZaloGlyph,
} from "@/components/sites/menzu-lol-f7ae197a/shared/BrandGlyphs";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import {
  TRUST_NOTE,
  TRUST_NOTE_ICON,
  TRUST_NOTE_LEAD,
  TRUST_NOTE_TEXT,
} from "@/components/sites/menzu-lol-f7ae197a/shared/trustNoteLook";
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
  /** The mark in the brand's own colour and the tile's hover tint — the way
   *  the security page draws Discord and Telegram (the owner, 01/10/2026:
   *  "màu icon logo không đồng bộ với trang bảo mật"). Written out whole,
   *  because Tailwind reads class strings, not templates. */
  tone: { mark: string; tile: string };
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
      tone: { mark: "text-[#29a9eb]", tile: "group-hover:border-[#29a9eb]/30 group-hover:bg-[#29a9eb]/10" },
      label: "Telegram",
      note: "Kênh thông báo và hỗ trợ nhanh nhất",
      href: settings.contactTelegram,
    },
    {
      icon: ZaloGlyph,
      tone: { mark: "text-[#0068FF]", tile: "group-hover:border-[#0068FF]/30 group-hover:bg-[#0068FF]/10" },
      label: "Zalo",
      note: "Nhắn tin trực tiếp với shop",
      href: settings.contactZalo,
    },
    {
      icon: ZaloGlyph,
      tone: { mark: "text-[#0068FF]", tile: "group-hover:border-[#0068FF]/30 group-hover:bg-[#0068FF]/10" },
      label: "Nhóm Zalo",
      note: "Nhóm chung, hỏi đáp và thông báo",
      href: settings.contactZaloGroup,
    },
    {
      icon: FacebookGlyph,
      tone: { mark: "text-[#1877F2]", tile: "group-hover:border-[#1877F2]/30 group-hover:bg-[#1877F2]/10" },
      label: "Facebook",
      note: "Trang chính thức của shop",
      href: settings.contactFacebook,
    },
    {
      icon: FacebookGlyph,
      tone: { mark: "text-[#1877F2]", tile: "group-hover:border-[#1877F2]/30 group-hover:bg-[#1877F2]/10" },
      label: "Nhóm Facebook",
      note: "Cộng đồng người dùng",
      href: settings.contactFacebookGroup,
    },
    {
      icon: DiscordGlyph,
      tone: { mark: "text-[#5865F2]", tile: "group-hover:border-[#5865F2]/30 group-hover:bg-[#5865F2]/10" },
      label: "Discord",
      note: "Máy chủ cộng đồng",
      href: settings.contactDiscord,
    },
    {
      icon: TiktokGlyph,
      tone: { mark: "text-white", tile: "group-hover:border-white/25 group-hover:bg-white/10" },
      label: "TikTok",
      note: "Video hướng dẫn và cập nhật",
      href: settings.contactTiktok,
    },
    {
      icon: Phone,
      tone: { mark: "text-white", tile: "group-hover:border-white/25 group-hover:bg-white/10" },
      label: "Hotline",
      note: "Gọi trong giờ hỗ trợ",
      href: settings.contactHotline,
      phone: true,
    },
  ].filter((channel) => channel.href.trim().length > 0);

  return (
    <SimplePage title="Kênh chính thức & liên hệ" crumb="Liên hệ" icon={Users} ground="home">
      {/* The warning first, and in the shop's own red — somebody who has just
          been messaged by a fake account reads this page for that — but one
          short paragraph now (the owner, 01/10/2026: "thu gọn cái cảnh báo giả
          mạo thay nội dung"). The alert circle rather than the shield (the
          owner, 02/10/2026: "cái khiên ! kia mới đổi thành alert"). The same
          note as the reviews page's "100% đánh giá", colour, size and font,
          from trustNoteLook (the owner, 02/10/2026: "cho màu giống", "coi có
          đồng bộ không vậy", "cỡ chữ kích thước", "font"). */}
      <div className={TRUST_NOTE}>
        <CircleAlert size={16} className={TRUST_NOTE_ICON} />
        <p className={TRUST_NOTE_TEXT}>
          <span className={TRUST_NOTE_LEAD}>Chỉ các kênh dưới đây là của shop.</span>{" "}
          Shop không bao giờ hỏi mật khẩu hay mã OTP, và chỉ nhận tiền qua trang Nạp tiền trên{" "}
          <span className="font-bold text-white">{bare(SITE_URL)}</span>.
        </p>
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
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition-colors ${channel.tone.mark} ${channel.tone.tile}`}
              >
                <channel.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-black text-white">{channel.label}</span>
                <span className="text-[11px] text-neutral-500">{channel.note}</span>
                {/* The address itself, wrapped rather than cut: half an
                    address is worse than none for checking one against
                    another. */}
                <span className="mt-1 break-all font-mono text-[11px] text-neutral-400 transition-colors group-hover:text-white">
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

      {/* The owner, 01/10/2026: "gặp tài khoản mạo danh thì liên hệ shop". */}
      <p className="mt-6 text-[13px] leading-relaxed text-neutral-500">
        Gặp tài khoản mạo danh? Liên hệ ngay với shop qua một trong các kênh trên.
      </p>
    </SimplePage>
  );
}
