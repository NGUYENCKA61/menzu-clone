import { DocHtml } from "@/lib/docFormat";

/**
 * Where the "Xem chi tiết" cue lands, and the id this section wears. Shared so
 * the two cannot drift apart into a button that scrolls nowhere.
 */
export const DESCRIPTION_SECTION_ID = "mo-ta-san-pham";

export interface SoftwareDescriptionProps {
  name: string;
  description: string;
  /** A per-product write-up from the admin's rich editor. When present it
   *  replaces the stock feature/guide/warranty blocks below; the requirements
   *  panel stays either way, because it states what the tool needs to run. */
  richHtml?: string | null;
}

/**
 * What a machine has to be for these tools to run.
 *
 * Written here rather than read from the product, like FEATURES below and for
 * the same reason: it is the same answer for every tool the shop sells today.
 * Written verbatim as the shop worded it — the spacing and the "!" are theirs.
 * The moment one tool needs a different answer, these become columns and this
 * list becomes their default.
 */
const REQUIREMENTS: { label: string; value: string }[] = [
  { label: "Hỗ trợ", value: "Windows 10, 11 Net nhà" },
  {
    label: "Yêu cầu thêm",
    value: "UEFI bios,enable virtualization,disable secure boot",
  },
  { label: "CPU hỗ trợ", value: "Intel and AMD with AVX" },
  { label: "Thiết lập màn hình", value: "Không viền !" },
  { label: "Nền tảng", value: "Steam" },
];

const SUB_HEADING = "mt-10 text-[17px] font-black uppercase tracking-wider text-white";
const BODY = "text-[13.5px] leading-relaxed text-neutral-400";

/**
 * Written once and shown on every tool, because it is true of every tool the
 * shop sells: these describe how the product is delivered and supported, not
 * what any one of them does. Anything that differs per product is a column —
 * see the product columns.
 */
const FEATURES = [
  {
    title: "Giao diện dễ sử dụng",
    body: "thiết kế trực quan, thao tác nhanh và dễ làm quen.",
  },
  {
    title: "Cập nhật thường xuyên",
    body: "phiên bản được cập nhật để tương thích với các thay đổi mới.",
  },
  {
    title: "Nhiều tùy chọn",
    body: "lựa chọn các tính năng phù hợp với gói đã mua.",
  },
  {
    title: "Ổn định",
    body: "tối ưu hiệu suất để mang lại trải nghiệm mượt mà.",
  },
];

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
}: SoftwareDescriptionProps) {
  /**
   * The requirements panel, set to the reference the shop supplied: one card,
   * its own title inside it, and the lines ruled off underneath.
   *
   * Everything here is that reference rather than this section's house style —
   * the title in sentence case at 22px instead of the section's 17px black
   * caps, a colon after each label, a wider label column, and a rule under
   * every line but the last. Capped at 640px for the same reason the reference
   * is narrow: nothing wraps past that width, so more room would only push the
   * answers away from the labels they belong to.
   */
  const factsCard = (
    <div className="mt-10 max-w-[640px] rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 sm:px-7 sm:py-6">
      <h3 className="text-[22px] font-bold tracking-tight text-white">
        Yêu cầu hệ thống
      </h3>

      <dl className="mt-4">
        {REQUIREMENTS.map((f, index) => (
          <div
            key={f.label}
            className={`grid grid-cols-1 gap-x-6 gap-y-1 py-4 sm:grid-cols-[minmax(190px,45%)_1fr] ${
              index < REQUIREMENTS.length - 1 ? "border-b border-white/[0.09]" : ""
            }`}
          >
            {/* The colon belongs to the layout, not to the data — it is what
                makes the two columns read as label and answer even where they
                stack on a narrow screen. */}
            <dt className="text-[14.5px] leading-relaxed text-neutral-400">
              {f.label}:
            </dt>
            <dd className="text-[14.5px] font-bold leading-relaxed text-white">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );

  // The admin wrote this product its own story — print it in full and skip
  // the boilerplate written for tools that have none.
  if (richHtml) {
    return (
      <section
        id={DESCRIPTION_SECTION_ID}
        className="mt-14 scroll-mt-[120px] border-t border-white/10 pt-12"
      >
        <h2 className="text-[26px] sm:text-3xl font-black uppercase tracking-wider text-white">
          Mô tả sản phẩm
        </h2>
        <div className="mt-5">
          <DocHtml body={richHtml} />
        </div>

        {factsCard}
      </section>
    );
  }

  return (
    // scroll-mt keeps the heading clear of the fixed header when the cue above
    // scrolls here — without it the browser stops with "Mô tả sản phẩm" tucked
    // underneath the navigation bar.
    <section
      id={DESCRIPTION_SECTION_ID}
      className="mt-14 scroll-mt-[120px] border-t border-white/10 pt-12"
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

      {factsCard}

      <h3 className={SUB_HEADING}>Tính năng nổi bật</h3>
      <ul className="mt-4 flex flex-col gap-4">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex gap-3">
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--menzu-accent)]"
            />
            <span className={BODY}>
              <span className="font-bold text-white">{f.title}:</span> {f.body}
            </span>
          </li>
        ))}
      </ul>

      <h3 className={SUB_HEADING}>Hướng dẫn sử dụng</h3>
      <p className={`mt-4 ${BODY}`}>
        Sau khi thanh toán thành công, hệ thống sẽ cung cấp sản phẩm theo phương
        thức giao hàng được cấu hình. Vui lòng đọc hướng dẫn sử dụng và kiểm tra
        yêu cầu hệ thống trước khi cài đặt.
      </p>

      <h3 className={SUB_HEADING}>Chính sách bảo hành &amp; hoàn tiền</h3>
      {/* A left rule rather than a full border — the same treatment the notice
          box in the announcement sheet uses, so the two read as one idea. */}
      <div className="mt-4 rounded-r-lg border-l-2 border-[var(--menzu-accent)] bg-white/[0.02] px-5 py-4">
        <p className={BODY}>
          <span className="font-bold text-white">Lưu ý:</span> Chính sách bảo hành
          và hoàn tiền được áp dụng theo từng sản phẩm và gói dịch vụ. Vui lòng
          xem đầy đủ chính sách trước khi mua.
        </p>
      </div>
    </section>
  );
}
