"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from "lucide-react";

import { AdminEmpty, AdminError, ConfirmDialog } from "./AdminStates";

export interface AdminCategoryView {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  soldCount: number;
  stockCount: number;
  productCount: number;
}

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const ICON_BUTTON =
  "h-8 w-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-neutral-300 transition-colors inline-flex items-center justify-center";

interface Draft {
  name: string;
  slug: string;
  imageUrl: string;
  soldCount: string;
  stockCount: string;
}

function draftOf(category: AdminCategoryView): Draft {
  return {
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl ?? "",
    soldCount: String(category.soldCount),
    stockCount: String(category.stockCount),
  };
}

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
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<AdminCategoryView | null>(null);

  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState("");

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

  function toggle(category: AdminCategoryView) {
    if (open === category.id) {
      setOpen(null);
      setDraft(null);
      return;
    }
    setOpen(category.id);
    setDraft(draftOf(category));
    setError(null);
    setOk(null);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const created = await call("POST", { name: newName, imageUrl: newImage });
    if (created) {
      setOk(`Đã thêm danh mục ${newName.trim()}`);
      setNewName("");
      setNewImage("");
    }
  }

  async function handleSave(category: AdminCategoryView) {
    if (!draft) return;
    const saved = await call("PATCH", {
      id: category.id,
      name: draft.name,
      slug: draft.slug,
      imageUrl: draft.imageUrl,
      soldCount: Number(draft.soldCount.replace(/\D/g, "")),
      stockCount: Number(draft.stockCount.replace(/\D/g, "")),
    });
    if (saved) setOk(`Đã lưu ${draft.name.trim()}`);
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
          </div>
        </div>

        <p className="text-[11px] text-neutral-500">
          Đường dẫn được tạo tự động từ tên — &ldquo;Tài Khoản Đặc Biệt&rdquo; thành{" "}
          <span className="font-mono text-neutral-400">/category/tai-khoan-dac-biet</span>.
          Danh mục mới xếp cuối danh sách, không xáo trộn thứ tự trang chủ đang có.
        </p>

        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="self-start h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
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

      {categories.length === 0 ? (
        <AdminEmpty
          title="Chưa có danh mục nào"
          body="Sản phẩm bắt buộc thuộc về một danh mục, nên hãy tạo danh mục đầu tiên trước khi thêm tài khoản."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((category, index) => {
            const expanded = open === category.id;

            return (
              <div
                key={category.id}
                className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 flex flex-col gap-3"
              >
                {/* Meta wraps, the buttons do not: a long category name should
                    not push the actions onto their own line and leave the rows
                    at different heights. */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-xs font-black text-white">{category.name}</span>
                    <span className="font-mono text-[11px] text-neutral-500">
                      /category/{category.slug}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {category.productCount} sản phẩm
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Đã bán {category.soldCount} · Đang bán {category.stockCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      onClick={() => call("PATCH", { id: category.id, action: "move", direction: "up" })}
                      aria-label={`Đưa ${category.name} lên trên`}
                      className={ICON_BUTTON}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === categories.length - 1}
                      onClick={() => call("PATCH", { id: category.id, action: "move", direction: "down" })}
                      aria-label={`Đưa ${category.name} xuống dưới`}
                      className={ICON_BUTTON}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(category)}
                      aria-expanded={expanded}
                      className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
                    >
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                      {expanded ? "Đóng" : "Sửa"}
                    </button>
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

                {expanded && draft ? (
                  <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`n-${category.id}`} className={LABEL}>
                          Tên danh mục
                        </label>
                        <input
                          id={`n-${category.id}`}
                          value={draft.name}
                          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                          className={FIELD}
                        />
                      </div>
                      <div>
                        <label htmlFor={`s-${category.id}`} className={LABEL}>
                          Đường dẫn
                        </label>
                        <input
                          id={`s-${category.id}`}
                          value={draft.slug}
                          onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                          className={`${FIELD} font-mono`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`i-${category.id}`} className={LABEL}>
                        Ảnh bìa
                      </label>
                      <input
                        id={`i-${category.id}`}
                        value={draft.imageUrl}
                        onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
                        placeholder="/sites/…/images/category/random.webp"
                        className={FIELD}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label htmlFor={`sold-${category.id}`} className={LABEL}>
                          Số &ldquo;Đã bán&rdquo;
                        </label>
                        <input
                          id={`sold-${category.id}`}
                          inputMode="numeric"
                          value={draft.soldCount}
                          onChange={(event) => setDraft({ ...draft, soldCount: event.target.value })}
                          className={`${FIELD} tabular-nums`}
                        />
                      </div>
                      <div>
                        <label htmlFor={`stock-${category.id}`} className={LABEL}>
                          Số &ldquo;Đang bán&rdquo;
                        </label>
                        <input
                          id={`stock-${category.id}`}
                          inputMode="numeric"
                          value={draft.stockCount}
                          onChange={(event) => setDraft({ ...draft, stockCount: event.target.value })}
                          className={`${FIELD} tabular-nums`}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-500">
                      Hai số trên là con số in ở thẻ danh mục ngoài trang chủ, do shop tự
                      đặt — không phải số sản phẩm thật trong kho ({category.productCount}).
                      Đổi đường dẫn sẽ làm mọi link cũ tới{" "}
                      <span className="font-mono text-neutral-400">/category/{category.slug}</span>{" "}
                      trả về 404.
                    </p>

                    <button
                      type="button"
                      disabled={busy || !draft.name.trim() || !draft.slug.trim()}
                      onClick={() => handleSave(category)}
                      className="self-start h-[34px] px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-white transition-colors"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                ) : null}
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
