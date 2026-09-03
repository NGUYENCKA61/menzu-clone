"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Cpu,
  ExternalLink,
  FileText,
  ImagePlus,
  KeyRound,
  Save,
  Settings2,
  Sparkles,
  Wallet,
} from "lucide-react";

import {
  badgePillClass,
  BADGE_COLOR_KEYS,
  BADGE_COLORS,
  BADGE_ICON_KEYS,
  BADGE_ICONS,
  BADGE_PILL_BASE,
  DEFAULT_BADGE_COLOR,
  DEFAULT_BADGE_ICON,
  MAX_BADGE_LENGTH,
  type BadgeColor,
  type BadgeIconName,
  type ProductBadge,
} from "@/lib/productBadges";
import {
  FEATURE_MAX,
  featuresToLines,
  parseFeatureLines,
} from "@/lib/productFeatures";
import {
  STATUS_PILL_MODES,
  STATUS_PILL_MODE_KEYS,
  type StatusPillMode,
} from "@/lib/statusPill";
import {
  parseRequirementLines,
  REQUIREMENT_MAX,
  requirementsToLines,
  type ProductRequirement,
} from "@/lib/productRequirements";

import { AdminError } from "./AdminStates";
import { BadgeIcon } from "./BadgeIcon";
import { AdminImagePicker } from "./AdminImagePicker";
import { AdminSoftwarePackages } from "./AdminSoftwarePackages";
import type { PackageKeysView } from "./AdminPackageKeys";
import { RichTextEditor } from "./RichTextEditor";

export interface SoftwarePackageView {
  id: string;
  label: string;
  price: number;
  durationHours: number | null;
  orderCount: number;
  /** This tier's own key store — stock, deliveries and what is owed. */
  keys: PackageKeysView;
}

/** One "Tính năng nổi bật" row, as the desk edits it. */
export interface FeatureDraft {
  title: string;
  body: string;
}

export interface SoftwareDetailView {
  code: string;
  /** This product's own feature list. Empty means it uses the shop default. */
  features: FeatureDraft[];
  /** This product's own "Yêu cầu hệ thống". Empty means the shop default. */
  requirements: ProductRequirement[];
  /** The write-up under that list, lifted to editor HTML on the server. */
  featuresNoteHtml: string;
  /** "Hướng dẫn cài đặt", lifted to editor HTML on the server. */
  guideHtml: string;
  /** "Hướng dẫn thiết lập & sử dụng", lifted the same way. */
  setupGuideHtml: string;
  /** The product half of its address; the desk lets the shop edit it. */
  slug: string;
  categorySlug: string;
  /** Where "Xem trang khách" goes — the product's one public address. */
  publicHref: string;
  name: string;
  categoryName: string;
  softwareStatus: string | null;
  /** Whether that state shows on the product's own page — "auto" leaves it to
   *  whether a badge is already speaking for the tool. */
  statusPill: StatusPillMode;
  status: string;
  price: number;
  /** The stored description lifted to editor HTML on the server — legacy
   *  plain text arrives already converted. */
  descriptionHtml: string;
  downloadUrl: string;
  /** "Link tài liệu sử dụng" — the manual handed over beside the installer. */
  docsUrl: string;
  /** The refund promise as a whole percent, or "" where none is set. Typed as
   *  a string because that is what the input holds, and "" has to survive the
   *  round trip as "not set" rather than becoming a zero. */
  refundRate: string;
  /** The pills beside the detection state on the customer's page — up to two,
   *  each with its own colour. */
  badges: ProductBadge[];
  imageUrl: string;
  videoUrl: string;
  packages: SoftwarePackageView[];
}

/**
 * The badges a shop reaches for most, one click each.
 *
 * Suggestions, not a menu: the boxes below stay free text, because the reason
 * a badge exists is to say the thing this tool's week calls for, and a fixed
 * list would be back to no badge at all the first time that thing is not on it.
 */
const BADGE_PRESETS = [
  "TOP #1 BÁN CHẠY",
  "BÁN CHẠY NHẤT",
  "MỚI RA MẮT",
  "KHUYÊN DÙNG",
  "SẮP HẾT HÀNG",
  "GIẢM GIÁ SỐC",
  "ỔN ĐỊNH NHẤT",
  "HOT",
];

const CARD = "rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4";

/**
 * One badge, whole: the words, the colour they print in, and the glyph in
 * front of them.
 *
 * Boxed together because the card carries two of these — a palette floating
 * under both would have to say which badge it colours.
 */
function BadgeField({
  id,
  ordinal,
  placeholder,
  value,
  onValue,
  color,
  onColor,
  icon,
  onIcon,
}: {
  id: string;
  /** "thứ nhất" / "thứ hai" — what the screen reader calls this one. */
  ordinal: string;
  placeholder: string;
  value: string;
  onValue: (next: string) => void;
  color: BadgeColor;
  onColor: (next: BadgeColor) => void;
  icon: BadgeIconName;
  onIcon: (next: BadgeIconName) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
      <input
        id={id}
        value={value}
        onChange={(event) => onValue(event.target.value)}
        placeholder={placeholder}
        maxLength={MAX_BADGE_LENGTH}
        aria-label={`Nhãn nổi bật ${ordinal}`}
        className={FIELD}
      />

      <div
        role="radiogroup"
        aria-label={`Màu nhãn ${ordinal}`}
        className="flex flex-wrap items-center gap-1"
      >
        {BADGE_COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={color === key}
            aria-label={BADGE_COLORS[key].label}
            title={BADGE_COLORS[key].label}
            onClick={() => onColor(key)}
            // A ring rather than a border on the chosen one: a border would
            // move the dot by a pixel and the row would twitch on every click.
            className={`h-5 w-5 rounded-full transition-all ${BADGE_COLORS[key].swatch} ${
              color === key
                ? "ring-2 ring-white ring-offset-2 ring-offset-[#0e0e11]"
                : "opacity-45 hover:opacity-100"
            }`}
          />
        ))}
      </div>

      <div
        role="radiogroup"
        aria-label={`Icon nhãn ${ordinal}`}
        className="flex flex-wrap items-center gap-1"
      >
        {BADGE_ICON_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={icon === key}
            aria-label={BADGE_ICONS[key]}
            title={BADGE_ICONS[key]}
            onClick={() => onIcon(key)}
            className={`grid h-6 w-6 place-items-center rounded-md border text-[10px] transition-colors ${
              icon === key
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/[0.08] text-neutral-500 hover:border-white/20 hover:text-neutral-200"
            }`}
          >
            {/* The empty option needs a mark of its own, or it reads as a
                button that failed to load. */}
            {key === "none" ? (
              <span aria-hidden>—</span>
            ) : (
              <BadgeIcon icon={key} className="h-3 w-3" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
const CARD_HEAD =
  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500";
const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL =
  "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const ACTION =
  "h-[34px] px-4 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center gap-1.5";

/** The detection pill customers see on the storefront card. */
const SOFTWARE_STATUS: Record<string, { label: string; tint: string }> = {
  UNDETECTED: {
    label: "Chưa phát hiện",
    tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  DETECTED: { label: "Đã phát hiện", tint: "border-red-500/30 bg-red-500/10 text-red-400" },
  UPDATING: {
    label: "Đang cập nhật",
    tint: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  STABLE: { label: "Ổn định", tint: "border-sky-500/30 bg-sky-500/10 text-sky-400" },
  UPDATED: {
    label: "Cập nhật mới",
    tint: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  },
  RISKY: { label: "Rủi ro", tint: "border-orange-500/30 bg-orange-500/10 text-orange-400" },
};

/**
 * One software product, full page — same /api/admin/software routes the list
 * tab uses, laid out with room: info, pricing, cover, and the package shelf.
 */
export function AdminSoftwareDetail({ software }: { software: SoftwareDetailView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [name, setName] = useState(software.name);
  const [slug, setSlug] = useState(software.slug);
  const [featureText, setFeatureText] = useState(featuresToLines(software.features));
  /** What the database holds; advanced on every successful save. */
  const [featureBaseline, setFeatureBaseline] = useState(
    featuresToLines(software.features),
  );
  const [requirementText, setRequirementText] = useState(
    requirementsToLines(software.requirements),
  );
  /** What the database holds; advanced on every successful save. */
  const [requirementBaseline, setRequirementBaseline] = useState(
    requirementsToLines(software.requirements),
  );
  const [noteHtml, setNoteHtml] = useState(software.featuresNoteHtml);
  /** What the database holds; advanced on every successful save. */
  const [noteBaseline, setNoteBaseline] = useState(software.featuresNoteHtml);
  const [guideHtml, setGuideHtml] = useState(software.guideHtml);
  /** What the database holds; advanced on every successful save. */
  const [guideBaseline, setGuideBaseline] = useState(software.guideHtml);
  const [setupGuideHtml, setSetupGuideHtml] = useState(software.setupGuideHtml);
  /** What the database holds; advanced on every successful save. */
  const [setupGuideBaseline, setSetupGuideBaseline] = useState(
    software.setupGuideHtml,
  );
  const [descHtml, setDescHtml] = useState(software.descriptionHtml);
  /** What the database holds; advanced on every successful save. */
  const [descBaseline, setDescBaseline] = useState(software.descriptionHtml);
  const [downloadUrl, setDownloadUrl] = useState(software.downloadUrl);
  const [docsUrl, setDocsUrl] = useState(software.docsUrl);
  const [refundRate, setRefundRate] = useState(software.refundRate);
  const [badge1, setBadge1] = useState(software.badges[0]?.label ?? "");
  const [badge2, setBadge2] = useState(software.badges[1]?.label ?? "");
  const [color1, setColor1] = useState<BadgeColor>(
    software.badges[0]?.color ?? DEFAULT_BADGE_COLOR,
  );
  const [color2, setColor2] = useState<BadgeColor>(
    software.badges[1]?.color ?? DEFAULT_BADGE_COLOR,
  );
  const [icon1, setIcon1] = useState<BadgeIconName>(
    software.badges[0]?.icon ?? DEFAULT_BADGE_ICON,
  );
  const [icon2, setIcon2] = useState<BadgeIconName>(
    software.badges[1]?.icon ?? DEFAULT_BADGE_ICON,
  );
  const [videoUrl, setVideoUrl] = useState(software.videoUrl);
  const [status, setStatus] = useState(software.status);
  const [statusPill, setStatusPill] = useState<StatusPillMode>(
    software.statusPill,
  );
  const [softwareStatus, setSoftwareStatus] = useState(
    software.softwareStatus ?? "UNDETECTED",
  );
  /** Ride along with the NEXT status change, then reset. Not stored on the
   *  product: each change keeps its own picture and its own words. */
  const [statusImageUrl, setStatusImageUrl] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const detectMeta = SOFTWARE_STATUS[softwareStatus] ?? SOFTWARE_STATUS.UNDETECTED!;
  // Counted from what is typed, not from what is saved: the figure beside the
  // button has to answer "am I about to go over the limit".
  const featureCount = parseFeatureLines(featureText).length;
  const requirementCount = parseRequirementLines(requirementText).length;
  const totalOrders = software.packages.reduce((sum, p) => sum + p.orderCount, 0);

  async function api(
    path: string,
    method: "PATCH" | "POST" | "DELETE",
    payload: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(path, {
        method,
        ...(payload
          ? { headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }
          : {}),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Thao tác thất bại" });
        return null;
      }
      router.refresh();
      return data;
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveInfo() {
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      name,
      slug,
      downloadUrl,
      docsUrl,
      refundRate: refundRate.trim(),
      // Sent as a pair; the server drops the blanks, so clearing the first box
      // and leaving the second promotes it rather than leaving a hole.
      badges: [
        { label: badge1, color: color1, icon: icon1 },
        { label: badge2, color: color2, icon: icon2 },
      ],
      videoUrl,
    });
    if (data) setMsg({ tone: "ok", text: "Đã lưu thông tin phần mềm" });
  }

  async function saveFeatures() {
    const list = parseFeatureLines(featureText);
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      features: list,
    });
    if (data) {
      // Written back from the parsed list rather than left as typed: blank
      // lines and stray spacing are gone from the database, and the box should
      // show what was actually stored.
      const normalised = featuresToLines(list);
      setFeatureText(normalised);
      setFeatureBaseline(normalised);
      setMsg({
        tone: "ok",
        text: list.length
          ? `Đã lưu ${list.length} tính năng`
          : "Đã xoá — trang khách dùng lại danh sách mặc định",
      });
    }
  }

  async function saveRequirements() {
    const list = parseRequirementLines(requirementText);
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      requirements: list,
    });
    if (data) {
      // Written back from the parsed list, as the features are: blank lines
      // and label-only lines are gone, and the box shows what was stored.
      const normalised = requirementsToLines(list);
      setRequirementText(normalised);
      setRequirementBaseline(normalised);
      setMsg({
        tone: "ok",
        text: list.length
          ? `Đã lưu ${list.length} yêu cầu hệ thống`
          : "Đã xoá — trang khách dùng lại danh sách mặc định",
      });
    }
  }

  async function saveFeaturesNote() {
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      featuresNote: noteHtml,
    });
    if (data) {
      setNoteBaseline(noteHtml);
      setMsg({
        tone: "ok",
        text: noteHtml ? "Đã lưu mô tả tính năng" : "Đã xoá mô tả tính năng",
      });
    }
  }

  async function saveGuide() {
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      guide: guideHtml,
    });
    if (data) {
      setGuideBaseline(guideHtml);
      setMsg({
        tone: "ok",
        text: guideHtml
          ? "Đã lưu hướng dẫn cài đặt"
          : "Đã xoá — trang khách dùng lại câu mặc định",
      });
    }
  }

  async function saveSetupGuide() {
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      setupGuide: setupGuideHtml,
    });
    if (data) {
      setSetupGuideBaseline(setupGuideHtml);
      setMsg({
        tone: "ok",
        text: setupGuideHtml
          ? "Đã lưu hướng dẫn thiết lập & sử dụng"
          : "Đã xoá — trang khách dùng lại câu mặc định",
      });
    }
  }

  async function saveDescription() {
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      description: descHtml,
    });
    if (data) {
      setDescBaseline(descHtml);
      setMsg({ tone: "ok", text: "Đã lưu mô tả sản phẩm" });
    }
  }

  async function savePricing() {
    // No price here any more: the flat column is the cheapest tier's figure,
    // written by the packages route whenever a tier changes.
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      status,
      softwareStatus,
      statusPill,
      // Only mean anything when the detection state actually moves; the route
      // ignores them otherwise, and they are cleared here either way so the
      // next change starts from a blank sheet.
      statusImageUrl,
      statusNote,
    });
    if (data) {
      setStatusImageUrl("");
      setStatusNote("");
      setMsg({ tone: "ok", text: "Đã lưu trạng thái" });
    }
  }

  /** Uploads the picture that will ride along with the next status change. */
  async function pickStatusImage(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/admin/software/image", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Không tải được ảnh" });
        return;
      }
      setStatusImageUrl(data.url as string);
      setMsg({ tone: "ok", text: "Đã tải ảnh — bấm Lưu để đăng kèm trạng thái" });
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function changeCover(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/admin/software/image", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Tải ảnh thất bại" });
        return;
      }
      const saved = await api("/api/admin/software", "PATCH", {
        code: software.code,
        imageUrl: data.url as string,
      });
      if (saved) setMsg({ tone: "ok", text: "Đã đổi ảnh bìa" });
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-5">
      {msg ? (
        msg.tone === "err" ? (
          <AdminError message={msg.text} onRetry={() => setMsg(null)} />
        ) : (
          <p
            role="status"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
          >
            {msg.text}
          </p>
        )
      ) : null}

      {/* The tool's papers. */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-wrap items-center gap-5">
        <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
          {software.imageUrl ? (
            <Image src={software.imageUrl} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-neutral-600">
              <KeyRound size={20} />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-black text-white">{software.name}</span>
            <span className="font-mono text-[11px] text-neutral-500">#{software.code}</span>
            <span
              className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${detectMeta.tint}`}
            >
              {detectMeta.label}
            </span>
            <span
              className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                software.status === "AVAILABLE"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/5 text-neutral-500"
              }`}
            >
              {software.status === "AVAILABLE" ? "Đang bán" : "Đã ẩn"}
            </span>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
            <span>{software.categoryName}</span>
            <span className="tabular-nums">{software.packages.length} gói</span>
            <span className="tabular-nums">{totalOrders} đơn</span>
          </p>
        </div>
        <a
          // /{code} serves accounts only — a tool lives under /software/{code},
          // so this button used to open a 404 every single time.
          href={software.publicHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ExternalLink size={13} />
          Xem trang khách
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <KeyRound size={13} className="text-neutral-400" />
              Thông tin phần mềm
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="sw-name" className={LABEL}>
                  Tên hiển thị
                </label>
                <input
                  id="sw-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={FIELD}
                />
              </div>
              {/* The address, spelled out with the category it hangs from —
                  the shop should see the whole URL it is about to publish,
                  not the tail of one. Changing it does not leave a redirect
                  behind, which is why the note says so. */}
              <div className="sm:col-span-2">
                <label htmlFor="sw-slug" className={LABEL}>
                  Đường dẫn
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 font-mono text-[11px] text-neutral-500">
                    /{software.categorySlug}/
                  </span>
                  <input
                    id="sw-slug"
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    placeholder="hack-pubg-ban-desync"
                    className={`${FIELD} font-mono`}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Đổi đường dẫn là link cũ hỏng — chỉ sửa khi sản phẩm chưa được
                  chia sẻ đi đâu.
                </p>
              </div>
              <div>
                <label htmlFor="sw-download" className={LABEL}>
                  Link tải
                </label>
                <input
                  id="sw-download"
                  value={downloadUrl}
                  onChange={(event) => setDownloadUrl(event.target.value)}
                  placeholder="https://…"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="sw-docs" className={LABEL}>
                  Link tài liệu sử dụng
                </label>
                <input
                  id="sw-docs"
                  value={docsUrl}
                  onChange={(event) => setDocsUrl(event.target.value)}
                  placeholder="https://…"
                  className={FIELD}
                />
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Hiện cùng &ldquo;Link tải&rdquo; trong đơn hàng của khách, ngay
                  cạnh key. Để trống nếu chưa có.
                </p>
              </div>
              <div>
                <span className={LABEL}>Nhãn nổi bật (tối đa 2)</span>
                {/* The shop still types whatever it likes; these are the ones
                    it would otherwise type again on every product, one click
                    instead of eighteen keystrokes in caps. */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {BADGE_PRESETS.map((preset) => {
                    const taken = [badge1, badge2].some(
                      (b) => b.trim().toUpperCase() === preset,
                    );
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={taken || (badge1.trim() !== "" && badge2.trim() !== "")}
                        // Fills the first empty box; both full and the chips
                        // go dead rather than silently overwriting a label.
                        onClick={() =>
                          badge1.trim() === "" ? setBadge1(preset) : setBadge2(preset)
                        }
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04] disabled:hover:text-neutral-400"
                      >
                        + {preset}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-3">
                  <BadgeField
                    id="sw-badge-1"
                    ordinal="thứ nhất"
                    placeholder="VD: TOP #1 BÁN CHẠY"
                    value={badge1}
                    onValue={setBadge1}
                    color={color1}
                    onColor={setColor1}
                    icon={icon1}
                    onIcon={setIcon1}
                  />
                  <BadgeField
                    id="sw-badge-2"
                    ordinal="thứ hai"
                    placeholder="VD: MỚI RA MẮT (không bắt buộc)"
                    value={badge2}
                    onValue={setBadge2}
                    color={color2}
                    onColor={setColor2}
                    icon={icon2}
                    onIcon={setIcon2}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Hiện cạnh trạng thái ở trang khách. Gõ gì hiện nấy —
                  &ldquo;TOP #1 BÁN CHẠY&rdquo;, &ldquo;MỚI RA MẮT&rdquo;,
                  &ldquo;SẮP HẾT HÀNG&rdquo;. Mỗi nhãn chọn màu riêng bằng dãy
                  chấm bên phải. Để trống cả hai thì không hiện nhãn nào.
                </p>
                {/* What the customer will see, in the customer's colours. */}
                {[badge1, badge2].some((b) => b.trim()) ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">
                      Xem trước
                    </span>
                    {[
                      { label: badge1.trim(), color: color1, icon: icon1 },
                      { label: badge2.trim(), color: color2, icon: icon2 },
                    ]
                      .filter((b) => b.label)
                      .map((b) => (
                        <span
                          key={b.label}
                          className={`${BADGE_PILL_BASE} ${badgePillClass(b.color)}`}
                        >
                          <BadgeIcon icon={b.icon} />
                          {b.label}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>
              <div>
                <label htmlFor="sw-refund" className={LABEL}>
                  Tỷ lệ hoàn trả (%)
                </label>
                {/* type=number so a phone offers the digit pad; the value still
                    travels as the string the input holds, because "" is the
                    shop saying "chưa có" and a zero is a very different
                    promise. */}
                <input
                  id="sw-refund"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={refundRate}
                  onChange={(event) => setRefundRate(event.target.value)}
                  placeholder="VD: 80"
                  className={FIELD}
                />
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Mức bảo hành / hoàn trả khách nhận được nếu sản phẩm gặp sự cố
                  ngoài ý muốn. Hiện dưới mục &ldquo;Chính sách bảo hành &amp;
                  hoàn tiền&rdquo; ở trang khách. Để trống thì không hiện dòng
                  nào.
                </p>
              </div>
              <div>
                <label htmlFor="sw-video" className={LABEL}>
                  Video demo
                </label>
                <input
                  id="sw-video"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://youtube.com/…"
                  className={FIELD}
                />
              </div>
            </div>
            <button type="button" disabled={busy} onClick={saveInfo} className={`${ACTION} self-start`}>
              <Save size={12} />
              Lưu thông tin
            </button>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Wallet size={13} className="text-neutral-400" />
              Trạng thái bán & phát hiện
            </span>
            {/* No price field: the listing figure is the cheapest tier's, and
                the tiers are edited in the panel below. */}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="sw-status" className={LABEL}>
                  Trên kệ
                </label>
                <select
                  id="sw-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={`${FIELD} w-32`}
                >
                  <option value="AVAILABLE" className="bg-neutral-900">
                    Đang bán
                  </option>
                  <option value="HIDDEN" className="bg-neutral-900">
                    Đã ẩn
                  </option>
                </select>
              </div>
              <div>
                <label htmlFor="sw-detect" className={LABEL}>
                  Trạng thái hack
                </label>
                <select
                  id="sw-detect"
                  value={softwareStatus}
                  onChange={(event) => setSoftwareStatus(event.target.value)}
                  className={`${FIELD} w-40`}
                >
                  {Object.entries(SOFTWARE_STATUS).map(([value, meta]) => (
                    <option key={value} value={value} className="bg-neutral-900">
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Only about the product's own page. The card outside keeps the
                  pill either way, which is why this sits next to the state
                  rather than under the badges it competes with. */}
              <div>
                <label htmlFor="sw-pill" className={LABEL}>
                  Hiện ở trang chi tiết
                </label>
                <select
                  id="sw-pill"
                  value={statusPill}
                  onChange={(event) =>
                    setStatusPill(event.target.value as StatusPillMode)
                  }
                  className={`${FIELD} w-52`}
                >
                  {STATUS_PILL_MODE_KEYS.map((mode) => (
                    <option key={mode} value={mode} className="bg-neutral-900">
                      {STATUS_PILL_MODES[mode]}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" disabled={busy} onClick={savePricing} className={ACTION}>
                <Save size={12} />
                Lưu
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Trạng thái hack hiện thành pill trên card ngoài cửa hàng — khách nhìn nó để
              quyết định mua. Card ngoài luôn hiện; ô bên phải chỉ quyết định
              trang chi tiết, nơi pill đứng chung hàng với nhãn nổi bật.
              &ldquo;Tự động&rdquo; nghĩa là có nhãn thì ẩn pill, không nhãn thì
              hiện.
            </p>

            {/* Attached to the change itself, not to the tool: the history on
                /thong-bao keeps each change with the picture and the sentence
                it was announced with. Both are optional and both reset after
                a save. */}
            <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4">
              <span className={LABEL}>Kèm theo lần đổi trạng thái này</span>
              <textarea
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                rows={2}
                placeholder="Ghi chú gửi khách — ví dụ: Đã vá, chờ 24h rồi dùng lại."
                className={`${FIELD} resize-y`}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className={`${ACTION} cursor-pointer`}>
                  <ImagePlus size={12} />
                  {statusImageUrl ? "Đổi ảnh" : "Thêm ảnh"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void pickStatusImage(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                {statusImageUrl ? (
                  <>
                    <span className="relative h-11 w-16 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={statusImageUrl}
                        alt="Ảnh kèm trạng thái"
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => setStatusImageUrl("")}
                      className="text-[11px] font-bold text-neutral-400 transition-colors hover:text-red-400"
                    >
                      Bỏ ảnh
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-neutral-500">
                    Chỉ hiện khi trạng thái thực sự đổi.
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <ImagePlus size={13} className="text-neutral-400" />
              Ảnh bìa
            </span>
            {/* The same compact picker the category desk uses — a 68px preview
                beside the button, not a full-width 16/9 pane. The card used to
                spend ~270px of column on a picture the storefront shows at
                card size anyway; how it looks in place is checked on the
                storefront, not here. Uploading still saves immediately. */}
            <AdminImagePicker
              uploading={busy}
              value={software.imageUrl}
              onPick={(file) => changeCover(file)}
            />
          </section>

          {/* The same shelf the "Quản lý gói" page draws — literally the same
              component, so the two screens cannot drift: one add form, the
              same two-line rows, the same three verbs per tier. What it needs
              of each tier's key store is the two counts its chips print. */}
          <AdminSoftwarePackages
            code={software.code}
            packages={software.packages.map((pkg) => ({
              id: pkg.id,
              label: pkg.label,
              price: pkg.price,
              durationHours: pkg.durationHours,
              orderCount: pkg.orderCount,
              keysAvailable: pkg.keys.available,
              keysPending: pkg.keys.pending,
            }))}
          />

        </div>
      </div>

      {/* Full width below the grid — prose wants room the columns don't have. */}
      <section className={CARD}>
        <span className={CARD_HEAD}>
          <FileText size={13} className="text-neutral-400" />
          Mô tả sản phẩm
        </span>
        <RichTextEditor initialHtml={software.descriptionHtml} onUpdate={setDescHtml} />
        <p className="text-[11px] text-neutral-500">
          Có nội dung ở đây thì khu &ldquo;Mô tả sản phẩm&rdquo; trên trang khách hiện
          đúng bài này — đậm, màu, ảnh y như trong khung. Để trống rồi lưu thì trang
          khách quay về đoạn hướng dẫn và bảo hành viết sẵn. Khu &ldquo;Tính năng nổi
          bật&rdquo; và &ldquo;Yêu cầu hệ thống&rdquo; luôn hiện, dù có bài này hay không.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || descHtml === descBaseline}
            onClick={saveDescription}
            className={ACTION}
          >
            <Save size={12} />
            Lưu mô tả
          </button>
          {descHtml !== descBaseline ? (
            <span className="text-[11px] text-neutral-500">Có thay đổi chưa lưu</span>
          ) : null}
        </div>
      </section>

      <section className={CARD}>
        <span className={CARD_HEAD}>
          <Cpu size={13} className="text-neutral-400" />
          Yêu cầu hệ thống
        </span>
        <textarea
          aria-label="Yêu cầu hệ thống"
          rows={6}
          value={requirementText}
          onChange={(event) => setRequirementText(event.target.value)}
          placeholder={
            "Hỗ trợ: Windows 10, 11\nCPU hỗ trợ: Intel and AMD with AVX\nNền tảng: Steam"
          }
          className={`${FIELD} resize-y leading-relaxed`}
        />
        <p className="text-[11px] text-neutral-500">
          Mỗi dòng một yêu cầu, dạng <span className="font-mono text-neutral-400">Nhãn: giá trị</span>
          — nhãn in bên trái, giá trị in đậm bên phải trong khung &ldquo;Yêu cầu hệ
          thống&rdquo; trên trang khách. Dòng không có dấu hai chấm bị bỏ qua. Xoá hết thì
          trang khách in lại danh sách mặc định chung của shop chứ không trống.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || requirementText === requirementBaseline}
            onClick={saveRequirements}
            className={ACTION}
          >
            <Save size={12} />
            Lưu yêu cầu hệ thống
          </button>
          <span className="text-[11px] text-neutral-500">
            {requirementCount}/{REQUIREMENT_MAX} dòng
            {requirementText !== requirementBaseline ? " · có thay đổi chưa lưu" : ""}
          </span>
        </div>
      </section>

      <section className={CARD}>
        <span className={CARD_HEAD}>
          <Sparkles size={13} className="text-neutral-400" />
          Tính năng nổi bật
        </span>
        <textarea
          aria-label="Tính năng nổi bật"
          rows={6}
          value={featureText}
          onChange={(event) => setFeatureText(event.target.value)}
          placeholder={
            "Aimbot: ngắm mượt, tuỳ chỉnh độ nhạy.\nESP: nhìn xuyên tường, hiện tên và máu.\nNo recoil"
          }
          className={`${FIELD} resize-y leading-relaxed`}
        />
        <p className="text-[11px] text-neutral-500">
          Mỗi dòng một tính năng, dạng <span className="font-mono text-neutral-400">Tên: mô tả</span>.
          Phần trước dấu hai chấm đầu tiên được in đậm trên trang khách, phần sau viết
          thường. Không có dấu hai chấm thì cả dòng là tên — &ldquo;No recoil&rdquo; cũng là
          một tính năng. Xoá hết thì trang khách in lại danh sách mặc định chung của shop
          chứ không trống.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || featureText === featureBaseline}
            onClick={saveFeatures}
            className={ACTION}
          >
            <Save size={12} />
            Lưu tính năng
          </button>
          <span className="text-[11px] text-neutral-500">
            {featureCount}/{FEATURE_MAX} dòng
            {featureText !== featureBaseline ? " · có thay đổi chưa lưu" : ""}
          </span>
        </div>

        {/* The write-up, in the same editor the description uses. Inside this
            card rather than one of its own: it is the second half of the same
            block on the customer's page, and two cards would suggest two
            places on the page rather than one. */}
        <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-4">
          <span className={CARD_HEAD}>
            <FileText size={13} className="text-neutral-400" />
            Mô tả tính năng
          </span>
          <RichTextEditor initialHtml={software.featuresNoteHtml} onUpdate={setNoteHtml} />
          <p className="text-[11px] text-neutral-500">
            Đoạn viết nằm ngay dưới danh sách gạch đầu dòng ở trên. Soạn y như ô mô tả
            sản phẩm — đậm, màu, tiêu đề, ảnh. Để trống thì trang khách không hiện gì
            thêm sau danh sách.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || noteHtml === noteBaseline}
              onClick={saveFeaturesNote}
              className={ACTION}
            >
              <Save size={12} />
              Lưu mô tả tính năng
            </button>
            {noteHtml !== noteBaseline ? (
              <span className="text-[11px] text-neutral-500">Có thay đổi chưa lưu</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className={CARD}>
        <span className={CARD_HEAD}>
          <BookOpen size={13} className="text-neutral-400" />
          Hướng dẫn cài đặt
        </span>
        <RichTextEditor initialHtml={software.guideHtml} onUpdate={setGuideHtml} />
        <p className="text-[11px] text-neutral-500">
          Khu &ldquo;Hướng dẫn cài đặt&rdquo; trên trang khách — cách tải, cách bật,
          cách nhập key. Soạn y như ô mô tả: đậm, màu, đánh số, chèn ảnh chụp màn hình.
          Để trống thì trang khách in lại câu mặc định chung của shop chứ không trống.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || guideHtml === guideBaseline}
            onClick={saveGuide}
            className={ACTION}
          >
            <Save size={12} />
            Lưu hướng dẫn
          </button>
          {guideHtml !== guideBaseline ? (
            <span className="text-[11px] text-neutral-500">Có thay đổi chưa lưu</span>
          ) : null}
        </div>
      </section>

      <section className={CARD}>
        <span className={CARD_HEAD}>
          <Settings2 size={13} className="text-neutral-400" />
          Hướng dẫn thiết lập &amp; sử dụng
        </span>
        <RichTextEditor
          initialHtml={software.setupGuideHtml}
          onUpdate={setSetupGuideHtml}
        />
        <p className="text-[11px] text-neutral-500">
          Khu &ldquo;Hướng dẫn thiết lập &amp; sử dụng&rdquo; trên trang khách, ngay
          dưới hướng dẫn cài đặt — nhập key, bật tính năng, chỉnh thông số, thao tác
          trong game. <span className="text-neutral-400">Chỉ khách đã thuê key của tool
          này mới đọc được</span>; người khác thấy ô khoá &ldquo;Mở khoá sau khi thuê
          key&rdquo;. Để trống thì khách đã mua thấy câu mặc định chung của shop.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || setupGuideHtml === setupGuideBaseline}
            onClick={saveSetupGuide}
            className={ACTION}
          >
            <Save size={12} />
            Lưu hướng dẫn thiết lập
          </button>
          {setupGuideHtml !== setupGuideBaseline ? (
            <span className="text-[11px] text-neutral-500">Có thay đổi chưa lưu</span>
          ) : null}
        </div>
      </section>


    </div>
  );
}
