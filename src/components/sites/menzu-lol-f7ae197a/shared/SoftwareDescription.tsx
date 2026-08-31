import { Lock } from "lucide-react";
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
  /** Where a guest who has already bought goes to prove it. */
  loginHref: string;
}

const SUB_HEADING = "mt-10 text-[17px] font-black uppercase tracking-wider text-white";
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
  loginHref,
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
      <ul className="mt-4 flex flex-col gap-4">
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
   * Drawn in both branches now, like the requirements and the features: it is
   * this product's own answer, and a shop that wrote a guide should not lose
   * it by also writing a description.
   */
  const guideBlock = (
    <>
      <h3 className={SUB_HEADING}>Hướng dẫn cài đặt</h3>
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
      {setupGuideAccess !== "unlocked" ? (
        <div className="mt-4 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 sm:px-6">
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
   * What a machine has to be for this tool to run — the product's own list,
   * or the shop's default where it has none, like the features above.
   *
   * One panel with the requirements ruled off inside it, rather than a tile
   * per line: they are one list, and a list is what it reads as — label on the
   * left, answer on the right, each on its own row. It grows downwards as
   * lines are added instead of breaking a grid into an orphan tile.
   *
   * Capped at 720px rather than run to the container's full 1272: nothing here
   * wraps at that width, so the extra room buys no lines — it only pushes the
   * answers three or four hundred pixels from the labels they belong to, which
   * is where the eye starts reading across the wrong row. The prose above and
   * below still uses the whole width.
   *
   * The heading stays outside, in the same 17px black caps as "Tính năng nổi
   * bật" and the rest, so this section reads as one run of headings rather
   * than as a box that titles itself.
   */
  const factsCard = (
    <div className="mt-4 max-w-[720px] rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-1.5 sm:px-6 sm:py-2">
      <dl>
        {requirementsOrDefault(requirements).map((f, index) => (
          <div
            key={f.label}
            className={`grid grid-cols-1 gap-x-6 gap-y-1 py-3.5 sm:grid-cols-[minmax(140px,30%)_1fr] ${
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
    </div>
  );

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
      {/* A left rule rather than a full border — the same treatment the notice
          box in the announcement sheet uses, so the two read as one idea. */}
      <div className="mt-4 mb-4 rounded-r-lg border-l-2 border-[var(--menzu-accent)] bg-white/[0.02] px-5 py-4">
        <p className={BODY}>
          <span className="font-bold text-white">Lưu ý:</span> Chính sách bảo hành
          và hoàn tiền được áp dụng theo từng sản phẩm và gói dịch vụ. Vui lòng
          xem đầy đủ chính sách trước khi mua.
        </p>
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
        className="mt-14 scroll-mt-[120px] border-t border-white/10 pt-12 pb-14"
      >
        <h2 className="text-[26px] sm:text-3xl font-black uppercase tracking-wider text-white">
          Mô tả sản phẩm
        </h2>
        <div className="mt-5">
          <DocHtml body={richHtml} />
        </div>

        <h3 className={SUB_HEADING}>Yêu cầu hệ thống</h3>
        {factsCard}

        {featuresBlock}

        {guideBlock}

        {setupGuideBlock}

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
      className="mt-14 scroll-mt-[120px] border-t border-white/10 pt-12 pb-14"
    >
      <h2 className="text-[26px] sm:text-3xl font-black uppercase tracking-wider text-white">
        Mô tả sản phẩm
      </h2>

      {/* The name opens the paragraph in bold, as the brief's sample does, but
          joined by a dash rather than run straight on: the same `description`
          stands alone under the title in the buy panel, so it is written as a
          whole sentence and cannot double as this one's predicate. */}
      <p className={`mt-5 ${BODY}`}>
        <span className="font-bold text-white">{name}</span>
        {description ? ` — ${description}` : ""}
      </p>

      <h3 className={SUB_HEADING}>Yêu cầu hệ thống</h3>
      {factsCard}

      {featuresBlock}

      {guideBlock}

      {setupGuideBlock}

      {warrantyBlock}
    </section>
  );
}
