"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";

import { AdminImagePicker } from "./AdminImagePicker";
import { AdminEmpty, AdminError, AdminSearch, ConfirmDialog } from "./AdminStates";

export interface AdminCategoryView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  soldCount: number;
  stockCount: number;
  productCount: number;
}

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const ICON_BUTTON =
  "h-8 w-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-neutral-300 transition-colors inline-flex items-center justify-center";


/**
 * Category management: create, rename, reorder, retire.
 *
 * Order matters here in a way it does not on the other admin screens — this
 * list is the order the home page rows and /categories render in, so moving a
 * row moves the storefront.
 */
export function AdminCategories({ categories }: { categories: AdminCategoryView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminCategoryView | null>(null);

  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState("");
  // Which picker is mid-upload, so only that one shows "Đang tải…" instead of
  // every field on the screen going busy at once.
  const [uploading, setUploading] = useState<string | null>(null);

  /**
   * Sends one file and answers with the stored path, or null.
   *
   * The upload is not the save: it hands back a path that goes into the text
   * field, and nothing is written to the category until the admin presses Lưu.
   * That keeps the picker behaving like every other field here — changeable
   * right up to the moment it is saved.
   */
  async function uploadImage(file: File, slot: string): Promise<string | null> {
    setUploading(slot);
    setError(null);
    setOk(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/categories/image", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        width?: number;
        height?: number;
      };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Tải ảnh thất bại");
        return null;
      }
      setOk(`Đã tải ảnh ${data.width}×${data.height}px — nhớ bấm Lưu`);
      return data.url;
    } catch {
      setError("Không kết nối được máy chủ");
      return null;
    } finally {
      setUploading(null);
    }
  }

  async function call(
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, unknown> | null,
    query = "",
  ) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const response = await fetch(`/api/admin/categories${query}`, {
        method,
        ...(payload
          ? { headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }
          : {}),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Thao tác thất bại");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Không kết nối được máy chủ");
      return false;
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  /**
   * Name or address, case- and accent-insensitively: the shop types "pubg"
   * and means "HACK PUBG", and types "hack-" when it is hunting a URL.
   */
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? categories.filter(
        (category) =>
          category.name.toLowerCase().includes(needle) ||
          category.slug.toLowerCase().includes(needle),
      )
    : categories;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const created = await call("POST", {
      name: newName,
      description: newDescription,
      imageUrl: newImage,
    });
    if (created) {
      setOk(`Đã thêm danh mục ${newName.trim()}`);
      setNewName("");
      setNewDescription("");
      setNewImage("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Thêm danh mục
        </span>

        {/* The words first, the picture last — the same order the software
            form asks in, so the two create forms on this page read as one
            habit. Name and blurb share the row because they are the two lines
            the home page tile prints together. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cat-name" className={LABEL}>
              Tên danh mục
            </label>
            <input
              id="cat-name"
              required
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Valorant Random"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="cat-description" className={LABEL}>
              Mô tả ngắn <span className="text-neutral-600">(không bắt buộc)</span>
            </label>
            <input
              id="cat-description"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Tài khoản random giá rẻ, giao ngay"
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label htmlFor="cat-image" className={LABEL}>
            Ảnh bìa <span className="text-neutral-600">(không bắt buộc)</span>
          </label>
          <input
            id="cat-image"
            value={newImage}
            onChange={(event) => setNewImage(event.target.value)}
            placeholder="/sites/…/images/category/random.webp"
            className={FIELD}
          />
          <AdminImagePicker
            uploading={uploading === "new"}
            value={newImage}
            onPick={async (file) => {
              const url = await uploadImage(file, "new");
              if (url) setNewImage(url);
            }}
          />
        </div>
        <p className="text-[11px] text-neutral-500">
          Đường dẫn được tạo tự động từ tên — &ldquo;Tài Khoản Đặc Biệt&rdquo; thành{" "}
          <span className="font-mono text-neutral-400">/tai-khoan-dac-biet</span>.
          Danh mục mới xếp cuối danh sách, không xáo trộn thứ tự trang chủ đang có.
        </p>

        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="self-start h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-50 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          {busy ? "Đang xử lý…" : "Thêm danh mục"}
        </button>
      </form>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {ok ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
        >
          {ok}
        </p>
      ) : null}

      {/* Only worth drawing once the list is long enough to hunt through. */}
      {categories.length > 3 ? (
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Tìm tên danh mục hoặc đường dẫn…"
          label="Tìm danh mục"
        />
      ) : null}

      {categories.length === 0 ? (
        <AdminEmpty
          title="Chưa có danh mục nào"
          body="Sản phẩm bắt buộc thuộc về một danh mục, nên hãy tạo danh mục đầu tiên trước khi thêm tài khoản."
        />
      ) : shown.length === 0 ? (
        <AdminEmpty
          title={`Không có danh mục nào khớp "${query.trim()}"`}
          body="Thử một phần của tên, hoặc một phần của đường dẫn."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((category, index) => {
            return (
              <div
                key={category.id}
                className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 flex flex-col gap-3"
              >
                {/* Meta wraps, the buttons do not: a long category name should
                    not push the actions onto their own line and leave the rows
                    at different heights. */}
                <div className="flex items-start gap-3">
                  {/* The cover, at the size the row can carry. Every other list
                      on this page leads with a picture — accounts and software
                      both do — and the category rows were the one place the
                      shop had to open a panel to find out which image it had
                      set. A plain img rather than next/image for the same
                      reason the software table uses one: the value is whatever
                      path or URL the shop typed, and next/image would need every
                      host of it spelled out in an allow-list. */}
                  <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-neutral-600">
                        <ImagePlus size={14} />
                      </span>
                    )}
                  </span>

                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-xs font-black text-white">{category.name}</span>
                    <span className="font-mono text-[11px] text-neutral-500">
                      /{category.slug}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {category.productCount} sản phẩm
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Đã bán {category.soldCount} · Đang bán {category.stockCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Order is a property of the whole list, and while a search
                        is on, the row above this one on screen is not the row
                        above it in the list. Moving then would swap it with
                        something the shop cannot see. */}
                    <button
                      type="button"
                      disabled={busy || Boolean(needle) || index === 0}
                      title={needle ? "Xoá ô tìm kiếm để sắp xếp lại" : "Đưa lên trên"}
                      onClick={() => call("PATCH", { id: category.id, action: "move", direction: "up" })}
                      aria-label={`Đưa ${category.name} lên trên`}
                      className={ICON_BUTTON}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={busy || Boolean(needle) || index === shown.length - 1}
                      title={needle ? "Xoá ô tìm kiếm để sắp xếp lại" : "Đưa xuống dưới"}
                      onClick={() => call("PATCH", { id: category.id, action: "move", direction: "down" })}
                      aria-label={`Đưa ${category.name} xuống dưới`}
                      className={ICON_BUTTON}
                    >
                      <ArrowDown size={13} />
                    </button>
{/* Its own page, like a product: the editor grew past what a
                        fold-out under the row can hold without shoving every
                        row below it down the screen. */}
                    <Link
                      href={`/admin/categories/${encodeURIComponent(category.slug)}`}
                      className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
                    >
                      Sửa
                    </Link>
                    <button
                      type="button"
                      disabled={busy || category.productCount > 0}
                      title={
                        category.productCount > 0
                          ? "Còn sản phẩm bên trong — chuyển chúng đi trước khi xóa"
                          : "Xóa danh mục"
                      }
                      onClick={() => setDeleting(category)}
                      aria-label={`Xóa danh mục ${category.name}`}
                      className="h-8 w-8 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 disabled:hover:bg-red-500/10 text-red-400 transition-colors inline-flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        danger
        pending={busy}
        title="Xóa danh mục?"
        body={
          deleting
            ? `"${deleting.name}" sẽ biến mất khỏi trang chủ và trang danh mục. Danh mục không còn sản phẩm nào nên không có tài khoản nào bị ảnh hưởng.`
            : ""
        }
        confirmLabel="Xóa danh mục"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) call("DELETE", null, `?id=${encodeURIComponent(deleting.id)}`);
        }}
      />
    </div>
  );
}
