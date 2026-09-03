"use client";

import { Eye, ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminImagePicker } from "./AdminImagePicker";
import { AdminSearch, ConfirmDialog } from "./AdminStates";
import type { AdminCategoryOption } from "./AdminProducts";

export interface AdminSoftwarePackage {
  id: string;
  label: string;
  price: number;
  durationHours: number | null;
  orderCount: number;
}

export interface AdminSoftwareRow {
  code: string;
  name: string;
  categoryName: string;
  softwareStatus: string | null;
  status: string;
  price: number;
  description: string;
  downloadUrl: string;
  imageUrl: string;
  videoUrl: string;
  packages: AdminSoftwarePackage[];
}

// The shop-wide admin field: same border, ground, radius and size as Cấu
// hình, Nhóm, and the two product detail screens. This page used to be the
// only one on a lighter, rounder, larger variant, so moving between it and a
// detail screen changed the shape of every box on the way.
const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const MINI =
  "rounded-lg border border-white/10 bg-neutral-950 px-2 py-1 text-[11px] font-bold text-neutral-200";

const SOFTWARE_STATUS: Record<string, string> = {
  UNDETECTED: "Chưa phát hiện",
  STABLE: "Ổn định",
  UPDATED: "Cập nhật mới",
  RISKY: "Rủi ro",
  UPDATING: "Đang cập nhật",
  DETECTED: "Đã phát hiện",
};

const STOCK_STATUS: Record<string, string> = {
  AVAILABLE: "Còn hàng",
  HIDDEN: "Đã ẩn",
};

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Software half of the products screen.
 *
 * Its own component rather than a mode on the account form: the two share a
 * table and nothing else — a tool is created by name and detection state and
 * then priced by tier, while an account is created by rank and one price.
 */
export function AdminSoftware({
  software,
  categories,
}: {
  software: AdminSoftwareRow[];
  categories: AdminCategoryOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [query, setQuery] = useState("");
  /** The tool whose delete is awaiting a yes. */
  const [removing, setRemoving] = useState<AdminSoftwareRow | null>(null);
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newImage, setNewImage] = useState("");
  const [uploadingNew, setUploadingNew] = useState(false);


  /** Name, stock code or category — the three things a tool is known by. */
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? software.filter(
        (s) =>
          s.name.toLowerCase().includes(needle) ||
          s.code.toLowerCase().includes(needle) ||
          s.categoryName.toLowerCase().includes(needle),
      )
    : software;

  async function call(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(path, {
        method,
        ...(payload
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            }
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


  /**
   * Upload for the create form: answers with the URL and nothing else. The
   * product does not exist yet, so unlike uploadImage above there is nothing
   * to patch — the URL rides along on the POST instead.
   */
  async function uploadNewImage(file: File): Promise<string | null> {
    setUploadingNew(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/software/image", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setMsg({ tone: "err", text: data.error ?? "Tải ảnh thất bại" });
        return null;
      }
      return data.url;
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
      return null;
    } finally {
      setUploadingNew(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    // No code sent: the server mints the internal stock code from the name.
    const data = await call("/api/admin/software", "POST", {
      categorySlug,
      name,
      description,
      imageUrl: newImage,
    });
    if (!data) return;
    setMsg({
      tone: "ok",
      text: `Đã thêm ${name}. Giờ hãy thêm các gói thời hạn bên dưới.`,
    });
    setName("");
    setDescription("");
    setNewImage("");
  }


  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Thêm phần mềm
        </span>

        {/* Category and name only. The code is minted server-side and the
            price is the cheapest tier's, written by the packages route — a
            tool is created bare, then priced by its first tier below. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Danh mục</label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={FIELD}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug} className="bg-neutral-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Tên phần mềm</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Valorant Tool Premium"
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Mô tả</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Phần mềm Valorant cao cấp, dễ sử dụng, cập nhật thường xuyên…"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL}>
            Ảnh sản phẩm <span className="text-neutral-600">(không bắt buộc)</span>
          </label>
          <input
            value={newImage}
            onChange={(e) => setNewImage(e.target.value)}
            placeholder="/sites/…/images/upload/banner.webp"
            aria-label="Đường dẫn ảnh sản phẩm"
            className={FIELD}
          />
          <AdminImagePicker
            uploading={uploadingNew}
            value={newImage}
            onPick={async (file) => {
              const url = await uploadNewImage(file);
              if (url) setNewImage(url);
            }}
          />
        </div>

        {msg ? (
          <p
            role="alert"
            className={
              msg.tone === "ok"
                ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
                : "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
            }
          >
            {msg.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="self-start h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          {busy ? "Đang xử lý…" : "Thêm phần mềm"}
        </button>
      </form>

      {/* Only worth drawing once the list is long enough to hunt through. */}
      {software.length > 3 ? (
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Tìm theo tên, mã hoặc danh mục…"
          label="Tìm phần mềm"
        />
      ) : null}

      {software.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-neutral-500">
          Chưa có phần mềm nào.
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-neutral-500">
          Không có phần mềm nào khớp &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : null}

      {/* One line per tool: what it is, whether it is safe and on sale, and
          the two verbs. Everything else — link tải, ảnh, video, mô tả, gói —
          lives on the detail page the Sửa button opens; it used to be inlined
          here too, which made every row a whole form and the list a scroll. */}
      {shown.map((s) => (
        <div
          key={s.code}
          className="rounded-2xl border border-white/10 bg-neutral-900/40 flex flex-wrap items-center gap-3 px-5 py-4"
        >
          {/* The cover, at the ratio the storefront card crops to, so what the
              shop sees here is what the customer sees there. Same landscape
              tile the category list wears; a plain img because the value is
              whatever path the shop set. */}
          <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
            {s.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-neutral-600">
                <ImageIcon size={14} />
              </span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/products/${encodeURIComponent(s.code)}`}
              className="group inline-flex items-center gap-1.5"
            >
              <p className="text-sm font-black text-white truncate transition-colors group-hover:text-rose-400">
                {s.name}
              </p>
              <Eye
                size={13}
                className="shrink-0 text-neutral-600 transition-colors group-hover:text-rose-400"
              />
            </Link>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {s.categoryName}
              {s.packages.length > 0
                ? ` · ${s.packages.length} gói từ ${formatVnd(
                    Math.min(...s.packages.map((p) => p.price)),
                  )}đ`
                : " · chưa có gói"}
            </p>
          </div>

          <select
            value={s.softwareStatus ?? "UNDETECTED"}
            disabled={busy}
            aria-label={`Tình trạng phát hiện của ${s.name}`}
            onChange={(e) =>
              call("/api/admin/software", "PATCH", {
                code: s.code,
                softwareStatus: e.target.value,
              })
            }
            className={MINI}
          >
            {Object.entries(SOFTWARE_STATUS).map(([value, label]) => (
              <option key={value} value={value} className="bg-neutral-900">
                {label}
              </option>
            ))}
          </select>

          <select
            value={s.status === "AVAILABLE" ? "AVAILABLE" : "HIDDEN"}
            disabled={busy}
            aria-label={`Trạng thái bán của ${s.name}`}
            onChange={(e) =>
              call("/api/admin/software", "PATCH", {
                code: s.code,
                status: e.target.value,
              })
            }
            className={MINI}
          >
            {Object.entries(STOCK_STATUS).map(([value, label]) => (
              <option key={value} value={value} className="bg-neutral-900">
                {label}
              </option>
            ))}
          </select>

          <Link
            href={`/admin/products/${encodeURIComponent(s.code)}`}
            className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
          >
            Sửa
          </Link>

          {/* The tier shelf as its own page — tiers and keys, nothing else. */}
          <Link
            href={`/admin/products/${encodeURIComponent(s.code)}/packages`}
            className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
          >
            Quản lý gói
          </Link>

          <button
            type="button"
            disabled={busy}
            title="Xoá phần mềm"
            aria-label={`Xoá ${s.name}`}
            onClick={() => setRemoving(s)}
            className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <ConfirmDialog
        open={removing !== null}
        danger
        pending={busy}
        title="Xoá phần mềm?"
        body={
          removing
            ? removing.packages.some((p) => p.orderCount > 0)
              ? `"${removing.name}" đã có đơn hàng, nên sẽ được ẩn khỏi trang bán chứ không mất hẳn — khôi phục được ở mục "đã xoá" cuối trang, và lịch sử mua của khách giữ nguyên.`
              : `"${removing.name}" chưa bán được đơn nào nên sẽ bị xoá hẳn cùng các gói của nó. Không hoàn tác được.`
            : ""
        }
        confirmLabel="Xoá phần mềm"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            void call(
              `/api/admin/products?code=${encodeURIComponent(removing.code)}`,
              "DELETE",
              null,
            ).then(() => setRemoving(null));
          }
        }}
      />
    </div>
  );
}
