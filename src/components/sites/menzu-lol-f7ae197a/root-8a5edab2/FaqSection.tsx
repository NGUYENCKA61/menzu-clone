import Link from "next/link";
import { BookOpen, MessageCircle, MessageSquare, Users } from "lucide-react";

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
 * LAB 2 trial (18/10/2026, "làm thử"): lmarket's flat version instead, with
 * no card and no boxes; see the comment over the grid.
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

      {/* LAB trial, lmarket.net's questions block (the owner, 18/10/2026:
          "có nên đổi qua faq kiểu lmarket này", "làm thử"): no boxes. On a
          desktop the title, its line, the doors and the support hours sit
          in a narrow column on the left and the questions run down the right
          as a flat list; on a phone the questions follow the title and the
          doors come after them, a buyer looking for the answer before the
          desk. The support card (its heading, its two facts, its tinted
          frame) is gone: the line under the title already says to write to
          the shop. The boxed version, its card level with the first
          question, is 9f8645d1. The second row is 1fr so the questions,
          spanning both rows, stretch it and not the title's. Gaps: 32px
          under the title and 40px over the doors on a phone; 24px between
          the title and the doors and 48px between the columns on a desktop. */}
      <RevealGrid className="grid items-start gap-y-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-6">
        <div className="reveal-card lg:col-span-5 xl:col-span-4" style={{ ["--i" as string]: 0 }}>
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

        <div className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 xl:col-span-8 xl:col-start-5">
          <FaqAccordion items={items} revealFrom={1} flat />
        </div>

        {/* The doors side by side, wrapping and widening to fill each line
            (Facebook and the Zalo group, then the guides under them), and
            the support hours under them in small grey, where lmarket puts
            its reply time; the red dot keeps the pill's pulse. */}
        <div
          className="reveal-card mt-2 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:mt-0 xl:col-span-4"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="flex flex-wrap gap-2.5">
            {doors.map(({ key, href, label, Icon }, index) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BUTTON} grow ${
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
              className={`${BUTTON} grow border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`}
            >
              <BookOpen size={15} aria-hidden />
              Đọc hướng dẫn
            </Link>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-mist">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--menzu-accent)] opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--menzu-accent)]" />
            </span>
            Hỗ trợ {SUPPORT_WINDOW} mỗi ngày
          </p>
        </div>
      </RevealGrid>
    </section>
  );
}
