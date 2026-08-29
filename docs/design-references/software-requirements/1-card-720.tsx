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
        {REQUIREMENTS.map((f, index) => (
          <div
            key={f.label}
            className={`grid grid-cols-1 gap-x-6 gap-y-1 py-3.5 sm:grid-cols-[minmax(140px,30%)_1fr] ${
              // A rule between rows, never under the last one: the panel's own
              // edge already closes the list.
              index > 0 ? "border-t border-white/[0.07]" : ""
            }`}
          >
            <dt className={BODY}>{f.label}</dt>
            <dd className="text-[13.5px] font-bold leading-relaxed text-white">
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

        <h3 className={SUB_HEADING}>Yêu cầu hệ thống</h3>
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

      <h3 className={SUB_HEADING}>Yêu cầu hệ thống</h3>
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
