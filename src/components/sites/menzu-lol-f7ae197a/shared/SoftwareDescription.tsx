import {
  Cpu,
  Download,
  FileText,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { DocHtml } from "@/lib/docFormat";
import { featuresOrDefault, type ProductFeature } from "@/lib/productFeatures";
import { DEFAULT_GUIDE, DEFAULT_SETUP_GUIDE } from "@/lib/productGuide";
import {
  requirementsOrDefault,
  type ProductRequirement,
} from "@/lib/productRequirements";

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
export type SetupGuideAccess = "unlocked" | "locked" | "guest";

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
}

/**
 * One framed part of the section, in the recipe the page's other boxes
 * already use — the trust strip under the buttons, the warranty link under
 * the gallery — so the frames read as the page's own rather than a new idea.
 *
 * Framed, as menzu frames the parts of its product page, because the section
 * is six different things one after another: a description, a spec list, a
 * feature list, two guides and a promise. Run on as bare headings they read
 * as one long document; each in its own box, a reader sees at a glance where
 * one stops, and finds the one they came for.
 */
const PANEL = "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7";
/**
 * Body text in this section, set to the same values `.doc-prose` gives the
 * rich editor's output: neutral-300 is #d4d4d4, text-sm is its 0.875rem, and
 * 1.65 is its line height.
 *
 * They are written to match on purpose. Half of what this section prints is
 * typed by the shop and half is the shop's default, and the two sit directly
 * against each other — a written guide above a warranty notice, a written
 * note under default bullets. Two greys there read as one of them being less
 * important rather than as one of them being editable.
 */
const BODY = "text-sm leading-[1.65] text-neutral-300";

/**
 * A panel's own title, in the page's section-heading recipe — the accent icon
 * and black caps "Đánh giá sản phẩm" and "Sản phẩm tương tự" wear — one step
 * smaller, since it names a part of this section rather than a section.
 */
function PanelHeading({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2.5 text-[15px] font-black uppercase tracking-wider text-white">
      <Icon size={18} aria-hidden className="shrink-0 text-[var(--menzu-accent)]" />
      {children}
    </h3>
  );
}

/** The words the locked panel sets in red: what happens, and what to press. */
function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-bold text-[var(--menzu-accent)]">{children}</span>
  );
}

/**
 * The long-form block under the buy panel.
 *
 * Full width, with its parts in a grid of their own: from lg up the two lists
 * sit side by side and so do the two guides, while the description and the
 * warranty run across both columns. Half the width is about eighty characters
 * of this text a line, which reads comfortably, where the whole of it ran to
 * some hundred and seventy. Below lg every panel takes the full width.
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
}: SoftwareDescriptionProps) {
  /**
   * What a machine has to be for this tool to run — the product's own list,
   * or the shop's default where it has none, like the features beside it.
   *
   * One list ruled off inside its panel rather than a tile per line: label on
   * the left, answer on the right, each on its own row. It grows downwards as
   * lines are added instead of breaking a grid into an orphan tile.
   *
   * Half the width from lg up, which is the width the 720px cap it carried
   * when it ran across the page was there to give it: nothing here wraps, and
   * a wider list only pushes the answers away from the labels they belong to.
   */
  const requirementsBlock = (
    <>
      <PanelHeading icon={Cpu}>Yêu cầu hệ thống</PanelHeading>
      {/* -mb-3.5 hands the last row's own padding back to the panel, so the
          list closes on the panel's edge as it opens under the heading. */}
      <dl className="mt-1.5 -mb-3.5">
        {requirementsOrDefault(requirements).map((f, index) => (
          <div
            key={f.label}
            className={`grid grid-cols-1 gap-x-6 gap-y-1 py-3.5 sm:grid-cols-[minmax(120px,38%)_1fr] ${
              // A rule between rows, never under the last one: the panel's own
              // edge already closes the list.
              index > 0 ? "border-t border-white/[0.07]" : ""
            }`}
          >
            <dt className={BODY}>{f.label}</dt>
            <dd className="text-sm font-bold leading-[1.65] text-white">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );

  /**
   * The product's own highlights, or the shop's default list where it has none.
   *
   * Drawn whatever the description is, like the requirements: a write-up in
   * the rich editor is prose, and dropping a structured list because somebody
   * wrote a paragraph would lose the half a skimming reader actually reads.
   */
  const featuresBlock = (
    <>
      <PanelHeading icon={Sparkles}>Tính năng nổi bật</PanelHeading>
      <ul className="mt-5 flex flex-col gap-4">
        {featuresOrDefault(features).map((f) => (
          <li key={f.title} className="flex gap-3">
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--menzu-accent)]"
            />
            <span className={BODY}>
              {/* The colon belongs to the sentence, so it only appears when
                  there is a sentence: "Aimbot" on its own is a feature. */}
              <span className="font-bold text-white">{f.title}</span>
              {f.body ? `: ${f.body}` : ""}
            </span>
          </li>
        ))}
      </ul>

      {/* The write-up under the list, where there is one. Printed through the
          same renderer the description uses, so a heading, a bold line or a
          screenshot typed into the editor arrives caged to one allowlist. */}
      {featuresNote ? (
        <div className="mt-5">
          <DocHtml body={featuresNote} />
        </div>
      ) : null}
    </>
  );

  /**
   * How to use it, as the shop wrote it — or the one sentence every tool
   * printed before this could be written.
   *
   * Drawn whatever the description is, like the requirements and the
   * features: it is this product's own answer, and a shop that wrote a guide
   * should not lose it by also writing a description.
   */
  const guideBlock = (
    <>
      <PanelHeading icon={Download}>Hướng dẫn cài đặt</PanelHeading>
      {guideHtml ? (
        <div className="mt-4">
          <DocHtml body={guideHtml} />
        </div>
      ) : (
        <p className={`mt-4 ${BODY}`}>{DEFAULT_GUIDE}</p>
      )}
    </>
  );

  /**
   * What to do once it is installed — sign in with the key, which switches
   * to set, how to play with it. Its own panel beside the install guide
   * because a buyer reads the two at different moments: one before the
   * download, the other with the tool already open.
   *
   * Only a buyer of this tool gets the text; everyone else gets the heading
   * and a locked notice saying so, with the way to unlock it. The heading
   * stays for them on purpose — knowing a guide exists is part of what is
   * being bought.
   */
  const setupGuideBlock = (
    <>
      <PanelHeading icon={SlidersHorizontal}>
        Hướng dẫn thiết lập &amp; sử dụng
      </PanelHeading>
      {setupGuideAccess !== "unlocked" ? (
        // No frame of its own: the panel is the frame, and a box inside it
        // would only be a second border saying the same thing.
        <div className="mt-4 flex items-start gap-4">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[var(--menzu-accent)]">
            <Lock className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wider text-white">
              Mở khoá sau khi thuê key
            </p>
            <p className={`mt-1 ${BODY}`}>
              <Hi>Nội dung chỉ hiển thị</Hi> sau khi bạn đã <Hi>thuê key</Hi> của
              tool này. <Hi>Chọn gói</Hi> ở trên và bấm <Hi>Mua ngay</Hi> —{" "}
              <Hi>thanh toán xong</Hi>, quay lại trang này là xem được.
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
        <div className="mt-4">
          <DocHtml body={setupGuideHtml} />
        </div>
      ) : (
        <p className={`mt-4 ${BODY}`}>{DEFAULT_SETUP_GUIDE}</p>
      )}
    </>
  );

  /**
   * The warranty note that closes the section.
   *
   * Drawn whatever the description is. It once sat only under the stock one,
   * so writing a description for a product silently took the shop's warranty
   * notice off its page — the one block on here that is a promise to the
   * buyer, and the one that must not disappear because somebody edited
   * something else.
   */
  const warrantyBlock = (
    <>
      <PanelHeading icon={ShieldCheck}>
        Chính sách bảo hành &amp; hoàn tiền
      </PanelHeading>
      <p className={`mt-4 ${BODY}`}>
        <span className="font-bold text-white">Lưu ý:</span> Chính sách bảo hành
        và hoàn tiền được áp dụng theo từng sản phẩm và gói dịch vụ. Vui lòng
        xem đầy đủ chính sách trước khi mua.
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
          — mức bảo hành và hoàn trả khách hàng được nhận nếu sản phẩm xảy ra
          sự cố, lỗi ngoài ý muốn.
        </p>
      ) : null}
    </>
  );

  return (
    // scroll-mt keeps the heading clear of the fixed header when the cue above
    // scrolls here — without it the browser stops with "Mô tả sản phẩm" tucked
    // underneath the navigation bar.
    <section
      id={DESCRIPTION_SECTION_ID}
      className="mt-14 scroll-mt-[120px] border-t border-white/10 pt-12 pb-14"
    >
      {/* Titled like the two sections under it, "Đánh giá sản phẩm" and "Sản
          phẩm tương tự": the page's three sections under the fold now read as
          one set. */}
      <h2 className="flex items-center gap-2.5 text-lg font-black uppercase tracking-wider text-white sm:text-xl">
        <FileText size={22} aria-hidden className="shrink-0 text-[var(--menzu-accent)]" />
        Mô tả sản phẩm
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${PANEL} lg:col-span-2`}>
          {richHtml ? (
            // The admin wrote this product its own story — print it in full,
            // in place of the stock opening paragraph. Every panel below it is
            // this product's own data or the shop's promise, so all of them
            // stay either way.
            <DocHtml body={richHtml} />
          ) : (
            // The name opens the paragraph in bold, as the brief's sample
            // does, but joined by a dash rather than run straight on: the same
            // `description` stands alone under the title in the buy panel, so
            // it is written as a whole sentence and cannot double as this
            // one's predicate.
            <p className={BODY}>
              <span className="font-bold text-white">{name}</span>
              {description ? ` — ${description}` : ""}
            </p>
          )}
        </div>

        <div className={PANEL}>{requirementsBlock}</div>
        <div className={PANEL}>{featuresBlock}</div>

        <div className={PANEL}>{guideBlock}</div>
        <div className={PANEL}>{setupGuideBlock}</div>

        <div className={`${PANEL} lg:col-span-2`}>{warrantyBlock}</div>
      </div>
    </section>
  );
}
