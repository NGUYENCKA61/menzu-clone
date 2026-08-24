"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  ImagePlus,
  KeyRound,
  Package,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  formatDuration,
  formatDurationInline,
  splitDuration,
  toHours,
  type DurationUnit,
} from "@/lib/duration";

import { AdminError, ConfirmDialog } from "./AdminStates";
import { RichTextEditor } from "./RichTextEditor";

export interface SoftwarePackageView {
  id: string;
  label: string;
  price: number;
  durationHours: number | null;
  orderCount: number;
}

export interface SoftwareDetailView {
  code: string;
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
  version: string;
  platform: string;
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

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * One software product, full page — same /api/admin/software routes the list
 * tab uses, laid out with room: info, pricing, cover, and the package shelf.
 */
export function AdminSoftwareDetail({ software }: { software: SoftwareDetailView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removingPkg, setRemovingPkg] = useState<SoftwarePackageView | null>(null);

  const [name, setName] = useState(software.name);
  const [version, setVersion] = useState(software.version);
  const [platform, setPlatform] = useState(software.platform);
  const [descHtml, setDescHtml] = useState(software.descriptionHtml);
  /** What the database holds; advanced on every successful save. */
  const [descBaseline, setDescBaseline] = useState(software.descriptionHtml);
  const [downloadUrl, setDownloadUrl] = useState(software.downloadUrl);
  const [videoUrl, setVideoUrl] = useState(software.videoUrl);
  const [price, setPrice] = useState(String(software.price));
  const [status, setStatus] = useState(software.status);
  const [softwareStatus, setSoftwareStatus] = useState(
    software.softwareStatus ?? "UNDETECTED",
  );

  const [pkgLabel, setPkgLabel] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgLength, setPkgLength] = useState("");
  const [pkgUnit, setPkgUnit] = useState<DurationUnit>("day");

  /** Which tier the shelf has opened for editing, and the draft it holds. */
  const [editingPkg, setEditingPkg] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editLength, setEditLength] = useState("");
  const [editUnit, setEditUnit] = useState<DurationUnit>("day");

  const coverRef = useRef<HTMLInputElement>(null);

  const detectMeta = SOFTWARE_STATUS[softwareStatus] ?? SOFTWARE_STATUS.UNDETECTED!;
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
      version,
      platform,
      downloadUrl,
      videoUrl,
    });
    if (data) setMsg({ tone: "ok", text: "Đã lưu thông tin phần mềm" });
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
    const data = await api("/api/admin/software", "PATCH", {
      code: software.code,
      price: Number(price.replace(/\D/g, "")),
      status,
      softwareStatus,
    });
    if (data) setMsg({ tone: "ok", text: "Đã lưu giá và trạng thái" });
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

  function startEditPackage(pkg: SoftwarePackageView) {
    setMsg(null);
    setEditingPkg(pkg.id);
    setEditLabel(pkg.label);
    setEditPrice(String(pkg.price));
    const { value, unit } = splitDuration(pkg.durationHours);
    setEditLength(value);
    setEditUnit(unit);
  }

  async function savePackage() {
    if (!editingPkg) return;
    const data = await api("/api/admin/software/packages", "PATCH", {
      id: editingPkg,
      label: editLabel.trim(),
      price: Number(editPrice.replace(/\D/g, "")),
      durationHours: toHours(editLength, editUnit),
    });
    if (data) {
      setEditingPkg(null);
      setMsg({ tone: "ok", text: "Đã lưu gói" });
    }
  }

  async function addPackage() {
    const data = await api("/api/admin/software/packages", "POST", {
      code: software.code,
      label: pkgLabel,
      price: Number(pkgPrice.replace(/\D/g, "")),
      durationHours: toHours(pkgLength, pkgUnit),
    });
    if (data) {
      setPkgLabel("");
      setPkgPrice("");
      setPkgLength("");
      setMsg({ tone: "ok", text: "Đã thêm gói" });
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
            {software.version ? <span>v{software.version}</span> : null}
            {software.platform ? <span>{software.platform}</span> : null}
            <span className="tabular-nums">{software.packages.length} gói</span>
            <span className="tabular-nums">{totalOrders} đơn</span>
          </p>
        </div>
        <a
          // /{code} serves accounts only — a tool lives under /software/{code},
          // so this button used to open a 404 every single time.
          href={`/software/${encodeURIComponent(software.code)}`}
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
              <div>
                <label htmlFor="sw-version" className={LABEL}>
                  Phiên bản
                </label>
                <input
                  id="sw-version"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.0.4"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="sw-platform" className={LABEL}>
                  Nền tảng
                </label>
                <input
                  id="sw-platform"
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  placeholder="Windows 10/11"
                  className={FIELD}
                />
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
              Giá & trạng thái
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="sw-price" className={LABEL}>
                  Giá niêm yết (đ)
                </label>
                <input
                  id="sw-price"
                  inputMode="numeric"
                  value={price ? formatVnd(Number(price.replace(/\D/g, "") || "0")) : ""}
                  onChange={(event) =>
                    setPrice(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className={`${FIELD} w-36 tabular-nums`}
                />
              </div>
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
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/[0.06] bg-neutral-950">
              {software.imageUrl ? (
                <Image
                  src={software.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-600">
                  <KeyRound size={22} />
                  <span className="text-[11px]">Chưa có ảnh bìa</span>
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => coverRef.current?.click()}
              className={`${ACTION} self-start`}
            >
              <ImagePlus size={12} />
              Đổi ảnh bìa
            </button>
            <input
              ref={coverRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void changeCover(file);
              }}
            />
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Package size={13} className="text-neutral-400" />
              Gói thời hạn ({software.packages.length})
            </span>
            {software.packages.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-neutral-500">
                Chưa có gói nào — khách không có gì để mua cho tới khi gói đầu tiên lên kệ.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {software.packages.map((pkg) =>
                  editingPkg === pkg.id ? (
                    // The row opens where it stands rather than in a dialog:
                    // the three things being changed are the three things the
                    // row was already showing, and the tiers around it are the
                    // context for whether a price is right.
                    <div
                      key={pkg.id}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--brand)]/40 bg-neutral-950/50 px-3 py-2.5"
                    >
                      <div className="flex-1 min-w-[130px]">
                        <label htmlFor={`edit-label-${pkg.id}`} className={LABEL}>
                          Tên gói
                        </label>
                        <input
                          id={`edit-label-${pkg.id}`}
                          value={editLabel}
                          onChange={(event) => setEditLabel(event.target.value)}
                          className={FIELD}
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-price-${pkg.id}`} className={LABEL}>
                          Giá (đ)
                        </label>
                        <input
                          id={`edit-price-${pkg.id}`}
                          inputMode="numeric"
                          value={
                            editPrice
                              ? formatVnd(Number(editPrice.replace(/\D/g, "") || "0"))
                              : ""
                          }
                          onChange={(event) =>
                            setEditPrice(event.target.value.replace(/\D/g, "").slice(0, 10))
                          }
                          className={`${FIELD} w-28 tabular-nums`}
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-length-${pkg.id}`} className={LABEL}>
                          Thời hạn
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`edit-length-${pkg.id}`}
                            inputMode="numeric"
                            value={editLength}
                            onChange={(event) =>
                              setEditLength(event.target.value.replace(/\D/g, "").slice(0, 4))
                            }
                            className={`${FIELD} w-16 tabular-nums`}
                          />
                          <select
                            aria-label="Đơn vị thời hạn"
                            value={editUnit}
                            onChange={(event) =>
                              setEditUnit(event.target.value as DurationUnit)
                            }
                            className={`${FIELD} w-[72px]`}
                          >
                            <option value="hour" className="bg-neutral-900">
                              giờ
                            </option>
                            <option value="day" className="bg-neutral-900">
                              ngày
                            </option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy || !editLabel.trim() || !editPrice}
                        onClick={savePackage}
                        className={ACTION}
                      >
                        <Save size={12} />
                        Lưu
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingPkg(null)}
                        className="h-[34px] px-3 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div
                      key={pkg.id}
                      className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-neutral-950/50 px-3 py-2 transition-colors hover:border-white/[0.12]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-violet-500/25 bg-violet-500/10 text-violet-400">
                        <KeyRound size={11} />
                      </span>
                      <span className="flex-1 truncate text-xs font-bold text-white">
                        {pkg.label}
                      </span>
                      <span className="shrink-0 text-[11px] text-neutral-500 tabular-nums">
                        {formatDuration(pkg.durationHours)}
                      </span>
                      <span className="shrink-0 rounded border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 text-[10px] tabular-nums text-neutral-400">
                        {pkg.orderCount} đơn
                      </span>
                      <span className="shrink-0 text-xs font-black tabular-nums text-rose-400">
                        {formatVnd(pkg.price)}đ
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEditPackage(pkg)}
                        aria-label={`Sửa gói ${pkg.label}`}
                        className="h-7 w-7 shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/10 disabled:opacity-30 text-neutral-500 hover:text-white transition-colors inline-flex items-center justify-center"
                      >
                        <Pencil size={12} />
                      </button>
                      {/* A sold tier cannot be deleted — orders point at the
                          row — so the button says so instead of opening a
                          dialog that would only come back with an error. */}
                      <button
                        type="button"
                        disabled={busy || pkg.orderCount > 0}
                        title={
                          pkg.orderCount > 0
                            ? "Gói đã có đơn — sửa được nhưng không xóa được"
                            : undefined
                        }
                        onClick={() => setRemovingPkg(pkg)}
                        aria-label={`Xóa gói ${pkg.label}`}
                        className="h-7 w-7 shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:border-white/[0.07] disabled:hover:bg-white/[0.03] text-neutral-500 hover:text-red-400 disabled:hover:text-neutral-500 transition-colors inline-flex items-center justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
            <p className="text-[11px] text-neutral-500">
              Thời hạn để trống là gói vĩnh viễn; chọn giờ hay ngày tùy gói.
              {software.packages.length > 0
                ? " Gói đã bán không xóa được vì đơn cũ trỏ vào nó — nhưng sửa tên, giá, thời hạn thì thoải mái. Đơn cũ giữ nguyên giá lúc mua."
                : ""}
            </p>
            <div className="flex flex-wrap items-end gap-2 border-t border-white/[0.06] pt-3">
              <div className="flex-1 min-w-[140px]">
                <label htmlFor="pkg-label" className={LABEL}>
                  Tên gói
                </label>
                <input
                  id="pkg-label"
                  value={pkgLabel}
                  onChange={(event) => setPkgLabel(event.target.value)}
                  placeholder="1 tháng"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="pkg-price" className={LABEL}>
                  Giá (đ)
                </label>
                <input
                  id="pkg-price"
                  inputMode="numeric"
                  value={pkgPrice ? formatVnd(Number(pkgPrice.replace(/\D/g, "") || "0")) : ""}
                  onChange={(event) =>
                    setPkgPrice(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className={`${FIELD} w-28 tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="pkg-length" className={LABEL}>
                  Thời hạn
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="pkg-length"
                    inputMode="numeric"
                    value={pkgLength}
                    onChange={(event) =>
                      setPkgLength(event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className={`${FIELD} w-16 tabular-nums`}
                  />
                  <select
                    aria-label="Đơn vị thời hạn"
                    value={pkgUnit}
                    onChange={(event) => setPkgUnit(event.target.value as DurationUnit)}
                    className={`${FIELD} w-[72px]`}
                  >
                    <option value="hour" className="bg-neutral-900">
                      giờ
                    </option>
                    <option value="day" className="bg-neutral-900">
                      ngày
                    </option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                disabled={busy || !pkgLabel.trim() || !pkgPrice}
                onClick={addPackage}
                className={ACTION}
              >
                <Plus size={12} />
                Thêm gói
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5 flex flex-col gap-3">
            <span className={CARD_HEAD}>
              <ShieldAlert size={13} className="text-red-400" />
              Vùng nguy hiểm
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRemoving(true)}
                className="h-[34px] px-4 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-red-400 transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                Gỡ khỏi cửa hàng
              </button>
              <span className="text-[11px] text-neutral-500">
                {totalOrders > 0
                  ? `${totalOrders} đơn cũ giữ nguyên — khôi phục được ở tab Tài khoản.`
                  : "Chưa có đơn nào nên sẽ xóa hẳn, không khôi phục được."}
              </span>
            </div>
          </section>
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
          khách quay về bố cục mặc định (tính năng nổi bật, hướng dẫn, bảo hành viết
          sẵn).
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

      <ConfirmDialog
        open={removingPkg !== null}
        danger
        pending={busy}
        title="Xóa gói thời hạn?"
        body={
          removingPkg
            ? `Gói "${removingPkg.label}" (${formatVnd(removingPkg.price)}đ / ${formatDurationInline(removingPkg.durationHours)}) rời kệ ngay. Gói chưa có đơn nào nên xóa hẳn, không khôi phục được.`
            : ""
        }
        confirmLabel="Xóa gói"
        onCancel={() => setRemovingPkg(null)}
        onConfirm={async () => {
          if (!removingPkg) return;
          const data = await api(
            `/api/admin/software/packages?id=${encodeURIComponent(removingPkg.id)}`,
            "DELETE",
            null,
          );
          setRemovingPkg(null);
          if (data) setMsg({ tone: "ok", text: "Đã xóa gói" });
        }}
      />

      <ConfirmDialog
        open={removing}
        danger
        pending={busy}
        title="Gỡ phần mềm khỏi cửa hàng?"
        body={
          totalOrders > 0
            ? `${software.name} rời kệ ngay. ${totalOrders} đơn cũ vẫn nguyên, khôi phục được từ mục "đã gỡ".`
            : `${software.name} chưa có đơn nào nên sẽ bị xóa hẳn và không khôi phục được.`
        }
        confirmLabel="Gỡ khỏi cửa hàng"
        onCancel={() => setRemoving(false)}
        onConfirm={async () => {
          const data = await api(
            `/api/admin/products?code=${encodeURIComponent(software.code)}`,
            "DELETE",
            null,
          );
          setRemoving(false);
          if (data) router.push("/admin/products");
        }}
      />
    </div>
  );
}
