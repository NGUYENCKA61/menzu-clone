"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  ImagePlus,
  KeyRound,
  Save,
  Sparkles,
  Wallet,
} from "lucide-react";

import {
  FEATURE_MAX,
  featuresToLines,
  parseFeatureLines,
} from "@/lib/productFeatures";

import { AdminError } from "./AdminStates";
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
  /** The write-up under that list, lifted to editor HTML on the server. */
  featuresNoteHtml: string;
  /** "Hướng dẫn sử dụng", lifted to editor HTML on the server. */
  guideHtml: string;
  /** The product half of its address; the desk lets the shop edit it. */
  slug: string;
  categorySlug: string;
  /** Where "Xem trang khách" goes — the product's one public address. */
  publicHref: string;
  name: string;
  categoryName: string;
  softwareStatus: string | null;
  status: string;
  price: number;
  /** The stored description lifted to editor HTML on the server — legacy
   *  plain text arrives already converted. */
  descriptionHtml: string;
  downloadUrl: string;
  imageUrl: string;
  videoUrl: string;
  packages: SoftwarePackageView[];
}

const CARD = "rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4";
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
    label: "Undetected",
    tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  DETECTED: { label: "Detected", tint: "border-red-500/30 bg-red-500/10 text-red-400" },
  UPDATING: {
    label: "Đang cập nhật",
    tint: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
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
  const [noteHtml, setNoteHtml] = useState(software.featuresNoteHtml);
  /** What the database holds; advanced on every successful save. */
  const [noteBaseline, setNoteBaseline] = useState(software.featuresNoteHtml);
  const [guideHtml, setGuideHtml] = useState(software.guideHtml);
  /** What the database holds; advanced on every successful save. */
  const [guideBaseline, setGuideBaseline] = useState(software.guideHtml);
  const [descHtml, setDescHtml] = useState(software.descriptionHtml);
  /** What the database holds; advanced on every successful save. */
  const [descBaseline, setDescBaseline] = useState(software.descriptionHtml);
  const [downloadUrl, setDownloadUrl] = useState(software.downloadUrl);
  const [videoUrl, setVideoUrl] = useState(software.videoUrl);
  const [status, setStatus] = useState(software.status);
  const [softwareStatus, setSoftwareStatus] = useState(
    software.softwareStatus ?? "UNDETECTED",
  );

  const detectMeta = SOFTWARE_STATUS[softwareStatus] ?? SOFTWARE_STATUS.UNDETECTED!;
  // Counted from what is typed, not from what is saved: the figure beside the
  // button has to answer "am I about to go over the limit".
  const featureCount = parseFeatureLines(featureText).length;
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
          ? "Đã lưu hướng dẫn sử dụng"
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
    });
    if (data) setMsg({ tone: "ok", text: "Đã lưu trạng thái" });
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
              <button type="button" disabled={busy} onClick={savePricing} className={ACTION}>
                <Save size={12} />
                Lưu
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Trạng thái hack hiện thành pill trên card ngoài cửa hàng — khách nhìn nó để
              quyết định mua.
            </p>
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
          Hướng dẫn sử dụng
        </span>
        <RichTextEditor initialHtml={software.guideHtml} onUpdate={setGuideHtml} />
        <p className="text-[11px] text-neutral-500">
          Khu &ldquo;Hướng dẫn sử dụng&rdquo; trên trang khách — cách tải, cách bật,
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


    </div>
  );
}
