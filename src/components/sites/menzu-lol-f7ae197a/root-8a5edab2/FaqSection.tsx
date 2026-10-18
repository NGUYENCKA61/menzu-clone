import Link from "next/link";
import { BookOpen, MessageCircle, MessageSquare, Users, Zap, KeyRound } from "lucide-react";

import { JsonLd, faqJsonLd } from "@/lib/seo";
import type { FaqEntry } from "@/lib/settings";
import { SUPPORT_WINDOW } from "@/lib/supportHours";

import { FaqAccordion } from "./FaqAccordion";
import { RevealGrid } from "./RevealGrid";

/**
 * The five questions a buyer has left after the proof, in the owner's own
 * words (13/10/2026, "sửa lại 5 card cũ faq"): safety, the main account,
 * payment, refunds, support. Shown until the shop writes its own in Cấu
 * hình → Cấu hình trang chủ → FAQ, which replaces the whole list.
 */
export const DEFAULT_FAQ: FaqEntry[] = [
  {
    q: "Dùng tool có an toàn không?",
    a: "Mọi sản phẩm đều được theo dõi liên tục. Trạng thái được cập nhật tại bảng Trạng thái và thông báo ngay khi game cập nhật; sản phẩm bị phát hiện sẽ tạm dừng bán ngay lập tức cho đến khi được cập nhật. Nhiều danh mục có sẵn HWID Spoofer để tăng cường bảo vệ. Tuy nhiên, cũng như bất kỳ phần mềm bên thứ ba nào khác, luôn tồn tại một mức độ rủi ro nhất định.",
  },
  {
    q: "Có thể chơi trên acc chính không?",
    a: "Bạn có thể sử dụng, nhưng shop không bao giờ khuyến nghị mạo hiểm với một tài khoản giá trị cao mà bạn không thể chấp nhận mất. Không phần mềm nào có thể đảm bảo 100% không bị ban.",
  },
  {
    q: "Thanh toán bằng cách nào?",
    a: "Chuyển khoản ngân hàng qua mã VietQR (quét bằng app ngân hàng hoặc ví điện tử bất kỳ) hoặc thẻ cào điện thoại, duyệt tự động 24/7. Bạn cũng có thể mua tự động trên bot Telegram. Mua xong, key hiện ngay trong Lịch sử mua kèm hướng dẫn và tài liệu dành riêng cho khách hàng.",
  },
  {
    q: "Có được hoàn tiền khi sản phẩm gặp vấn đề không?",
    a: "Yêu cầu hoàn tiền được xử lý nếu lỗi phát sinh từ phía shop, nhằm đảm bảo quyền lợi cho khách hàng. Có hai hình thức: hoàn tiền qua ngân hàng hoặc hoàn tiền trực tiếp trên website. Chọn hoàn trực tiếp trên web, bạn được hoàn lên đến 120% giá trị đã nạp ban đầu.",
  },
  {
    q: "Cần hỗ trợ thì liên hệ ở đâu?",
    a: `Nhắn Facebook hoặc Zalo bằng nút hỗ trợ ở góc phải màn hình. Giờ hỗ trợ ${SUPPORT_WINDOW} mỗi ngày; ngoài giờ cứ để lại tin nhắn, shop sẽ phản hồi ngay khi hoạt động trở lại.`,
  },
];

export interface FaqContact {
  /** The shop's Facebook page URL, or "" for none. */
  facebook: string;
  /** The shop's Zalo phone number, or "" for none. */
  zalo: string;
  /** The shop's Zalo group link, or "" for none. */
  zaloGroup: string;
}

const BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[14px] font-semibold transition-colors";

/**
 * "Câu hỏi thường gặp" — the FAQ block lmarket.net closes its home page
 * with, in the shop's own words and colours: the questions stacked on the
 * left, and on the right a card for whoever is still not sure, with the
 * support hours, two facts that matter to a buyer in a hurry, and the doors
 * to the desk (Facebook, a Zalo chat, the Zalo group: whichever Cấu hình has
 * filled in) and to the guides. The Zalo group took the Telegram channel's
 * place (the owner, 18/10/2026: "kênh telegram ở chỗ vẫn còn thắc mắc đổi
 * thành kênh zalo đi"). The card sticks while the questions scroll on wide
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
    contact.zaloGroup
      ? { key: "zalo-group", href: contact.zaloGroup, label: "Kênh Zalo", Icon: Users }
      : null,
  ].filter((door) => door !== null);

  return (
    // The hairline and air above it are the reviews section's own, so the
    // two information blocks after the shop open the same way: a line the
    // width of the window, clipped by the home page's wrapper.
    <section
      aria-labelledby="faq-heading"
      className="relative w-full pt-12 lg:pt-16 before:absolute before:left-1/2 before:top-0 before:h-px before:w-screen before:-translate-x-1/2 before:bg-white/[0.06]"
    >
      {schema ? <JsonLd data={schema} /> : null}

      {/* The original's pool of colour behind the block: wide, blurred far
          and kept faint, so the cards sit on a glow rather than flat black. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[400px] w-[min(800px,100%)] -translate-x-1/2 rounded-full bg-[var(--menzu-accent)]/[0.06] blur-[180px]"
      />

      {/* LAB trial: the support card starts level with the first question
          (the owner, 18/10/2026: "hạ thử"), where it stood beside the title,
          95px higher. The title and its line take the grid's first row, on
          the left; the questions and the card share the second. The gaps are
          the old ones: 32px under the title (its mb-8 before), 40px over the
          card on a phone (32px row gap and mt-2), 48px between the columns. */}
      <RevealGrid className="grid items-start gap-y-8 lg:grid-cols-12 lg:gap-x-12">
        <div className="reveal-card lg:col-span-7" style={{ ["--i" as string]: 0 }}>
          {/* LAB, back for a look with the reviews block (the owner,
              18/10/2026: "quay về bản căn giữa chữ đỏ tui coi thử chiến
              thắng và faq"): the main site's title, capitals with the
              second half in the shop's red and no red bar, at the other
              titles' 20px and 24px from sm; left aligned, the block being
              two columns. The red-bar version is 655590b7. All red and all
              white were tried ("tô full đỏ thử", "chữ trắng thử") before the
              half in red came back, in step with the reviews title ("làm
              đi"), which is 4d415d93. LAB trial: the whole title white
              again, still no red bar (the owner, 18/10/2026: "Câu hỏi
              thường gặp chữ trắng thử"). */}
          <h2
            id="faq-heading"
            className="row-heading text-balance text-xl font-black uppercase tracking-wider text-frost sm:text-2xl"
          >
            Câu hỏi thường gặp
          </h2>
          {/* The reviews block's line under its title: 15px, 8px below the
              title; wider and wrapped with care, so "shop." no longer sits
              alone on a line (the owner, 18/10/2026: "làm đi"). */}
          <p className="mt-2 max-w-2xl text-pretty text-[15px] text-mist">
            Thắc mắc trước khi mua? Câu trả lời ở ngay đây. Không thấy điều cần
            tìm thì nhắn cho shop.
          </p>
        </div>

        <div className="lg:col-span-7 lg:row-start-2">
          <FaqAccordion items={items} revealFrom={1} />
        </div>

        <div className="mt-2 lg:col-span-5 lg:col-start-8 lg:row-start-2 lg:mt-0">
          <div
            data-spot
            style={{ ["--i" as string]: 1 }}
            className="reveal-card relative isolate overflow-hidden rounded-2xl border border-[var(--menzu-accent)]/15 bg-gradient-to-b from-[var(--menzu-accent)]/[0.04] to-white/[0.02] p-6 sm:p-7 lg:sticky lg:top-24"
          >
            {/* LAB trial, a paler red (the owner, 18/10/2026: "cho màu đỏ
                card chỗ faq nhạt lại"): the wash at the top halved (8% to
                4%), the rim from 25% to 15%, and the glow no longer lit at
                rest, only under the pointer as on the question cards; it
                was the strongest red of the three, 14% at the middle. The
                pill and the red Facebook button keep their colour. */}
            <span aria-hidden className="spot-glow -z-10" />
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--menzu-accent)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--menzu-accent)] opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--menzu-accent)]" />
              </span>
              Hỗ trợ {SUPPORT_WINDOW} mỗi ngày
            </div>
            <h3 className="font-display text-xl font-bold text-frost">Vẫn còn thắc mắc?</h3>
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
