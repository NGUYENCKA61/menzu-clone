import { sentenceCase } from "@/lib/displayCase";
import { Lock } from "lucide-react";
import Link from "next/link";

import { DocHtml } from "@/lib/docFormat";
import { featuresOrDefault, type ProductFeature } from "@/lib/productFeatures";
import { DEFAULT_GUIDE, DEFAULT_SETUP_GUIDE } from "@/lib/productGuide";
import {
  requirementsOrDefault,
  type ProductRequirement,
} from "@/lib/productRequirements";
import type { RelatedGuides as RelatedGuidesData } from "@/lib/relatedGuides";

import { RelatedGuides } from "./RelatedGuides";
import { SectionHeading } from "./SectionHeading";

/**
 * Where the "Xem chi tiết" cue lands, and the id this section wears. Shared so
 * the two cannot drift apart into a button that scrolls nowhere.
 */
export const DESCRIPTION_SECTION_ID = "mo-ta-san-pham";

/**
 * Who is reading the setup guide: a buyer of this tool, a signed-in reader
 * who has not bought it, or nobody signed in at all. The route decides; the
 * text itself only arrives for "unlocked".
 */
// "expired": a buyer whose reading window has run out (the owner, 12/10/2026:
// a day key reads two days, a week key a week, a month key a month).
export type SetupGuideAccess = "unlocked" | "locked" | "expired" | "guest";

export interface SoftwareDescriptionProps {
  name: string;
  description: string;
  /** A per-product write-up from the admin's rich editor. When present it
   *  replaces the stock guide and warranty copy below; the requirements panel
   *  and the feature list stay either way, because both are this product's own
   *  data rather than boilerplate the write-up would be repeating. */
  richHtml?: string | null;
  /** The product's own "Tính năng nổi bật"; empty falls back to the default. */
  features: ProductFeature[];
  /** The product's own "Yêu cầu hệ thống"; empty falls back to the default. */
  requirements: ProductRequirement[];
  /** The write-up under that list, as editor HTML. "" draws nothing. */
  featuresNote: string;
  /** "Hướng dẫn cài đặt" as editor HTML; "" prints the default sentence. */
  guideHtml: string;
  /** "Hướng dẫn thiết lập & sử dụng" as editor HTML; "" prints the default.
   *  Only ever non-empty when `setupGuideAccess` is "unlocked". */
  setupGuideHtml: string;
  setupGuideAccess: SetupGuideAccess;
  /** What share of the price the shop gives back when this tool fails, as a
   *  whole percent. Null prints no line — see the warranty block. */
  refundRate: number | null;
  /** Where a guest who has already bought goes to prove it. */
  loginHref: string;
  /** The tool's full documentation (/tai-lieu/<slug>). */
  docsHref: string;
  /** "Hướng dẫn liên quan", between the setup guide and the warranty note;
   *  absent or null draws none (lib/relatedGuides.ts). */
  guides?: RelatedGuidesData | null;
  /** LAB: ?ban=cu, "Hướng dẫn liên quan" headed as it was. */
  old?: boolean;
}

// The write-up set as lmarket sets its own (the owner, 25/10/2026: "làm sao
// cho giống lmarket đi sửa lại", "giờ xử lý phần mô tả sản phẩm đi"): 24px
// over each sub-heading, 8px under it, the text across the column's full
// width, plain bullets and numbers, no panels or boxes round the copy.
const SUB_HEADING =
  "mt-6 font-display text-[19px] font-semibold text-frost";
/**
 * Body text in this section, set to the same values the rich editor's output
 * gets here (`.doc-prose` read even, below): neutral-300 is #d4d4d4 and every
 * line is the one 16px the category page reads at, paragraphs, bullets and
 * the requirements alike, as lmarket keeps one size (the owner, 25/10/2026:
 * "đồng bộ tỷ lệ ấy"; it was 15px here against an 18px lead paragraph).
 *
 * They are written to match on purpose. Half of what this section prints is
 * typed by the shop and half is the shop's default, and the two sit directly
 * against each other — a written guide above a warranty notice, a written
 * note under default bullets. Two greys there read as one of them being less
 * important rather than as one of them being editable.
 */
const BODY = "text-[16px] leading-[1.7] text-neutral-300";

/** The section's lists, lmarket's plain bullets: 24px in, 6px apart. */
const LIST = "mt-2 list-disc space-y-1.5 pl-6";

/** The words the locked panel sets in red: what happens, and what to press. */
function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-bold text-[var(--menzu-accent)]">{children}</span>
  );
}

/**
 * The long-form block under the buy panel.
 *
 * Full width rather than continuing the two-column grid above: prose set to
 * half the page would run about forty characters a line here, which is where
 * a reader starts skipping.
 */
export function SoftwareDescription({
  name,
  description,
  richHtml,
  features,
  requirements,
  featuresNote,
  guideHtml,
  setupGuideHtml,
  setupGuideAccess,
  refundRate,
  loginHref,
  docsHref,
  guides = null,
  old = false,
}: SoftwareDescriptionProps) {
  /**
   * The product's own highlights, or the shop's default list where it has none.
   *
   * Drawn in both branches, like the requirements panel: a write-up in the rich
   * editor is prose, and dropping a structured list because somebody wrote a
   * paragraph would lose the half a skimming reader actually reads.
   */
  const featuresBlock = (
    <>
      <h3 className={SUB_HEADING}>Tính năng nổi bật</h3>
      <ul className={LIST}>
        {featuresOrDefault(features).map((f) => (
          <li key={f.title} className={BODY}>
            {/* The colon belongs to the sentence, so it only appears when
                there is a sentence: "Aimbot" on its own is a feature. */}
            <span className="font-bold text-white">{f.title}</span>
            {f.body ? `: ${f.body}` : ""}
          </li>
        ))}
      </ul>

      {/* The write-up under the list, where there is one. Printed through the
          same renderer the description uses, so a heading, a bold line or a
          screenshot typed into the editor arrives caged to one allowlist. */}
      {featuresNote ? (
        <div className="mt-3">
          <DocHtml body={featuresNote} even />
        </div>
      ) : null}
    </>
  );

  /**
   * How to use it, as the shop wrote it — or the one sentence every tool
   * printed before this could be written.
   *
   * Drawn in both branches now, like the requirements and the features: it is
   * this product's own answer, and a shop that wrote a guide should not lose
   * it by also writing a description.
   */
  const guideBlock = (
    <>
      <h3 className={SUB_HEADING}>Hướng dẫn cài đặt</h3>
      {guideHtml ? (
        <div className="mt-2">
          <DocHtml body={guideHtml} even />
        </div>
      ) : (
        <p className={`mt-2 ${BODY}`}>{DEFAULT_GUIDE}</p>
      )}
    </>
  );

  /**
   * What to do once it is installed — sign in with the key, which switches
   * to set, how to play with it. Its own heading under the install guide
   * because a buyer reads the two at different moments: one before the
   * download, the other with the tool already open.
   *
   * Only a buyer of this tool gets the text; everyone else gets the heading
   * and a locked panel saying so, with the way to unlock it. The heading
   * stays for them on purpose — knowing a guide exists is part of what is
   * being bought.
   */
  const setupGuideBlock = (
    <>
      <h3 className={SUB_HEADING}>Hướng dẫn thiết lập &amp; sử dụng</h3>
      <p className="mt-2 text-[12px] text-neutral-500">
        Tài liệu đầy đủ của tool (cài đặt, tải về, thiết lập, lỗi thường gặp) ở{" "}
        <Link
          href={docsHref}
          className="font-bold text-neutral-300 underline underline-offset-2 hover:text-white"
        >
          trang tài liệu
        </Link>
        .
      </p>
      {setupGuideAccess !== "unlocked" ? (
        // The one panel the section keeps: it is a door (what unlocks the
        // guide and how), not copy.
        <div className="mt-3 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 sm:px-6">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[var(--menzu-accent)]">
            <Lock className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-frost">
              {setupGuideAccess === "expired"
                ? "Hết hạn xem theo key"
                : "Mở khoá sau khi thuê key"}
            </p>
            <p className={`mt-1 ${BODY}`}>
              {setupGuideAccess === "expired" ? (
                <>
                  Thời hạn xem theo key của bạn đã hết: <Hi>key ngày</Hi> xem
                  được <Hi>2 ngày</Hi>, <Hi>key tuần</Hi> 1 tuần,{" "}
                  <Hi>key tháng</Hi> 1 tháng. <Hi>Thuê key mới</Hi> là mở lại
                  ngay.
                </>
              ) : (
                <>
                  <Hi>Nội dung chỉ hiển thị</Hi> sau khi bạn đã{" "}
                  <Hi>thuê key</Hi> của tool này. <Hi>Chọn gói</Hi> ở trên và
                  bấm <Hi>Mua ngay</Hi> - <Hi>thanh toán xong</Hi>, quay lại
                  trang này là xem được.
                </>
              )}
              {setupGuideAccess === "guest" ? (
                <>
                  {" "}
                  Đã mua rồi?{" "}
                  <Link
                    href={loginHref}
                    className="font-bold text-white underline underline-offset-2 hover:text-[var(--menzu-accent)]"
                  >
                    Đăng nhập
                  </Link>{" "}
                  để xem.
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : setupGuideHtml ? (
        <div className="mt-2">
          <DocHtml body={setupGuideHtml} even />
        </div>
      ) : (
        <p className={`mt-2 ${BODY}`}>{DEFAULT_SETUP_GUIDE}</p>
      )}
    </>
  );

  /**
   * What a machine has to be for this tool to run — the product's own list,
   * or the shop's default where it has none, like the features above.
   *
   * A plain list, label then answer on one line, as lmarket sets its
   * "Requirements" (25/10/2026); it was a framed table capped at 720px, gone
   * with the section's other boxes.
   */
  const factsCard = (
    <ul className={LIST}>
      {requirementsOrDefault(requirements).map((f) => (
        <li key={f.label} className={BODY}>
          {f.label}: <span className="font-bold text-white">{f.value}</span>
        </li>
      ))}
    </ul>
  );

  /**
   * The guides a buyer of this tool reads next: its own docs, the shelf's
   * articles and the setup pages. Between the setup guide and the warranty
   * note in both branches, headed as the h3 siblings around it are, so the
   * money page finally links the wiki (the SEO review, round 2, O12).
   */
  const guidesBlock = <RelatedGuides guides={guides} heading="sub" old={old} />;

  /**
   * The warranty note that closes the section.
   *
   * Drawn in both branches. It used to sit only in the default one, so writing
   * a description for a product silently took the shop's warranty notice off
   * its page — the one block on here that is a promise to the buyer, and the
   * one that must not disappear because somebody edited something else.
   *
   * mb-4 keeps it off the footer: this is the last thing in the section, and
   * the page's own bottom padding was measured when the section ended in a
   * paragraph rather than in a bordered box sitting flush against the rule.
   */
  const warrantyBlock = (
    <>
      <h3 className={SUB_HEADING}>Chính sách bảo hành &amp; hoàn tiền</h3>
      {/* Plain copy like the rest of the section, as lmarket sets its "Before
          you buy"; it was a box with a red left rule. */}
      <div className="mt-2 mb-4">
        <p className={BODY}>
          <span className="font-bold text-white">Lưu ý:</span> Chính sách bảo
          hành và hoàn tiền được áp dụng theo từng sản phẩm và gói dịch vụ. Vui
          lòng xem đầy đủ chính sách trước khi mua.
        </p>
        {/* The figure the sentence above stops short of. Printed only when the
            shop has set one: a made-up number here is a promise a buyer would
            hold them to. Set in the accent so a skimming reader finds it — it
            is the one thing in this block anybody is looking for. */}
        {typeof refundRate === "number" ? (
          <p className={`${BODY} mt-2.5`}>
            <span className="font-bold text-white">Tỷ lệ hoàn trả:</span>{" "}
            <span className="font-black text-[var(--menzu-accent)]">
              {refundRate}%
            </span>{" "}
            , mức bảo hành và hoàn trả khách hàng được nhận nếu sản phẩm xảy ra
            sự cố, lỗi ngoài ý muốn.
          </p>
        ) : null}
      </div>
    </>
  );

  // The admin wrote this product its own story — print it in full, in place of
  // the stock opening paragraph. Everything below it is this product's own
  // data or the shop's promise, so all of it stays either way.
  if (richHtml) {
    return (
      <section
        id={DESCRIPTION_SECTION_ID}
        className="product-copy mt-14 scroll-mt-[120px] border-t border-line pt-12 pb-14"
      >
        <SectionHeading>Mô tả sản phẩm</SectionHeading>
        <div className="mt-3">
          <DocHtml body={richHtml} even />
        </div>

        <h3 className={SUB_HEADING}>Yêu cầu hệ thống</h3>
        {factsCard}

        {featuresBlock}

        {guideBlock}

        {setupGuideBlock}

        {guidesBlock}

        {warrantyBlock}
      </section>
    );
  }

  return (
    // scroll-mt keeps the heading clear of the fixed header when the cue above
    // scrolls here — without it the browser stops with "Mô tả sản phẩm" tucked
    // underneath the navigation bar.
    <section
      id={DESCRIPTION_SECTION_ID}
      className="product-copy mt-14 scroll-mt-[120px] border-t border-line pt-12 pb-14"
    >
      {/* The red bar the home rows open with, as "Sản phẩm tương tự" below
          now wears too; the accent glyph stays with the page titles (the
          owner, 13/10/2026, UI consistency review). */}
      <SectionHeading>Mô tả sản phẩm</SectionHeading>

      {/* The name opens the paragraph in bold, as the brief's sample does, but
          joined by a dash rather than run straight on: the same `description`
          stands alone under the title in the buy panel, so it is written as a
          whole sentence and cannot double as this one's predicate. */}
      <p className={`mt-3 ${BODY}`}>
        <span className="font-semibold text-frost">{sentenceCase(name)}</span>
        {description ? ` - ${description}` : ""}
      </p>

      <h3 className={SUB_HEADING}>Yêu cầu hệ thống</h3>
      {factsCard}

      {featuresBlock}

      {guideBlock}

      {setupGuideBlock}

      {guidesBlock}

      {warrantyBlock}
    </section>
  );
}
