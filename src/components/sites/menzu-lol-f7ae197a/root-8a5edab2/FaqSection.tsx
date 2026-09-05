import Link from "next/link";
import { BookOpen, MessageCircle, MessageSquare, Send, Zap, KeyRound } from "lucide-react";

import { JsonLd, faqJsonLd } from "@/lib/seo";
import type { FaqEntry } from "@/lib/settings";
import { SUPPORT_WINDOW } from "@/lib/supportHours";

import { FaqAccordion } from "./FaqAccordion";
import { RevealGrid } from "./RevealGrid";

/**
 * The five questions a buyer has left after the proof, answered the way this
 * shop actually works: the status board, automatic bank top-ups, VietQR and
 * phone cards, the support hours, free updates within a key's term. Shown
 * until the shop writes its own in Cấu hình → Cấu hình trang chủ → FAQ,
 * which replaces the whole list.
 */
const DEFAULT_FAQ: FaqEntry[] = [
  {
    q: "Dùng tool có an toàn không?",
    a: "Mọi tool trên shop được theo dõi liên tục. Trạng thái từng tool (Undetected, Ổn định, Cập nhật mới, Rủi ro, Đang cập nhật, Detected) hiện ở bảng Trạng thái và đổi ngay khi game vá; tool bị phát hiện sẽ khóa bán tới khi cập nhật xong. Nhiều danh mục có kèm HWID spoofer để bảo vệ thêm. Đọc kỹ hướng dẫn của từng tool trước khi dùng.",
  },
  {
    q: "Giao hàng nhanh không?",
    a: "Nạp qua ngân hàng được cộng tự động 24/7, thường chỉ vài giây sau khi chuyển. Mua xong, key hiện ngay trong Lịch sử mua kèm hướng dẫn, không phải chờ duyệt. Nạp bằng thẻ cào thì gửi ảnh thẻ cho shop kiểm tra rồi cộng tiền.",
  },
  {
    q: "Thanh toán bằng cách nào?",
    a: "Chuyển khoản ngân hàng qua mã VietQR (quét bằng app ngân hàng hoặc ví điện tử bất kỳ) hoặc thẻ cào điện thoại. Tiền nạp vào ví trên shop, mua tool trừ thẳng từ số dư; mua trên bot Telegram cũng dùng chung ví này.",
  },
  {
    q: "Cần hỗ trợ thì liên hệ ở đâu?",
    a: `Nhắn Facebook hoặc Zalo bằng nút hỗ trợ ở góc phải màn hình, hoặc qua kênh Telegram của shop. Giờ hỗ trợ ${SUPPORT_WINDOW} mỗi ngày; ngoài giờ cứ để lại tin nhắn, shop trả lời ngay khi mở lại.`,
  },
  {
    q: "Có được cập nhật miễn phí không?",
    a: "Có. Trong thời hạn của key, mọi bản cập nhật của tool đều miễn phí. Khi game vá, tool chuyển sang Đang cập nhật và mở lại khi xong; theo dõi ở bảng Trạng thái. Tool lỗi trong thời hạn thì xem chính sách bảo hành và hoàn tiền trong Wiki.",
  },
];

export interface FaqContact {
  /** The shop's Facebook page URL, or "" for none. */
  facebook: string;
  /** The shop's Zalo phone number, or "" for none. */
  zalo: string;
  /** The shop's Telegram channel URL, or "" for none. */
  telegram: string;
}

const BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[12px] font-black uppercase tracking-wider transition-colors";

/**
 * "Câu hỏi thường gặp" — the FAQ block lmarket.net closes its home page
 * with, in the shop's own words and colours: the questions stacked on the
 * left, and on the right a card for whoever is still not sure, with the
 * support hours, two facts that matter to a buyer in a hurry, and the doors
 * to the desk (Facebook, Zalo, Telegram — whichever Cấu hình has filled in)
 * and to the guides. The card sticks while the questions scroll on wide
 * screens.
 *
 * It moves as the original does: over a faint pool of the accent, the
 * heading, each question and the card rise in one after another the first
 * time the block scrolls into view (RevealGrid + `.reveal-card`), every
 * question card carries the cursor glow, and the support card is lit from
 * its corner at rest.
 *
 * The questions come from Cấu hình (the same list the SEO block used to
 * print) and fall back to the shop's five stock ones; the FAQPage markup
 * describes whichever is shown.
 */
export function FaqSection({ faq, contact }: { faq: FaqEntry[]; contact: FaqContact }) {
  const items = faq.length > 0 ? faq : DEFAULT_FAQ;
  const schema = faqJsonLd(items);
  const zaloDigits = contact.zalo.replace(/\D/g, "");
  const doors = [
    contact.facebook
      ? { key: "facebook", href: contact.facebook, label: "Nhắn Facebook", Icon: MessageCircle }
      : null,
    zaloDigits
      ? { key: "zalo", href: `https://zalo.me/${zaloDigits}`, label: "Chat Zalo", Icon: MessageSquare }
      : null,
    contact.telegram
      ? { key: "telegram", href: contact.telegram, label: "Kênh Telegram", Icon: Send }
      : null,
  ].filter((door) => door !== null);

  return (
    <section aria-labelledby="faq-heading" className="relative w-full">
      {schema ? <JsonLd data={schema} /> : null}

      {/* The original's pool of colour behind the block: wide, blurred far
          and kept faint, so the cards sit on a glow rather than flat black.
          Half what it was — with the support card's own tint beside it the
          two together turned the right of the block red. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[400px] w-[min(800px,100%)] -translate-x-1/2 rounded-full bg-[var(--menzu-accent)]/[0.03] blur-[180px]"
      />

      <RevealGrid className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <div className="reveal-card mb-8" style={{ ["--i" as string]: 0 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              FAQ
            </div>
            <h2
              id="faq-heading"
              className="text-2xl font-black uppercase leading-tight tracking-wider sm:text-3xl"
            >
              <span className="text-white">Câu hỏi </span>
              <span className="text-[var(--menzu-accent)]">thường gặp</span>
            </h2>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-neutral-400">
              Thắc mắc trước khi mua? Câu trả lời ở ngay đây. Không thấy điều cần
              tìm thì nhắn cho shop.
            </p>
          </div>

          <FaqAccordion items={items} revealFrom={1} />
        </div>

        <div className="lg:col-span-5">
          <div
            data-spot
            style={{ ["--i" as string]: 1 }}
            className="reveal-card relative isolate overflow-hidden rounded-2xl border border-[var(--menzu-accent)]/20 bg-gradient-to-b from-[var(--menzu-accent)]/[0.05] to-white/[0.02] p-6 sm:p-7 lg:sticky lg:top-24"
          >
            {/* Lit from the corner at rest, brighter under the pointer's own glow. */}
            <span aria-hidden className="spot-glow spot-glow-on -z-10" />
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--menzu-accent)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--menzu-accent)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--menzu-accent)]" />
              </span>
              Hỗ trợ {SUPPORT_WINDOW} mỗi ngày
            </div>
            <h3 className="text-xl font-black tracking-tight text-white">Vẫn còn thắc mắc?</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Không thấy câu trả lời? Nhắn cho shop, đội hỗ trợ trực trong giờ và trả lời
              ngay khi thấy tin.
            </p>

            <ul className="mt-5 flex flex-col gap-2.5">
              <li className="flex items-center gap-3 text-[13px] text-neutral-300">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--menzu-accent)]">
                  <Zap size={14} aria-hidden />
                </span>
                Nạp tiền ngân hàng cộng tự động 24/7
              </li>
              <li className="flex items-center gap-3 text-[13px] text-neutral-300">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--menzu-accent)]">
                  <KeyRound size={14} aria-hidden />
                </span>
                Key giao ngay sau khi thanh toán
              </li>
            </ul>

            <div className="mt-6 flex flex-col gap-2.5">
              {doors.map(({ key, href, label, Icon }, index) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${BUTTON} ${
                    index === 0
                      ? "bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]"
                      : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon size={15} aria-hidden />
                  {label}
                </a>
              ))}
              <Link
                href="/docs"
                className={`${BUTTON} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`}
              >
                <BookOpen size={15} aria-hidden />
                Đọc hướng dẫn
              </Link>
            </div>
          </div>
        </div>
      </RevealGrid>
    </section>
  );
}
