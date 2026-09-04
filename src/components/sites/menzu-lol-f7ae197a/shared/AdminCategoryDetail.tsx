"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminError } from "./AdminStates";
import { CATEGORY_PLATFORMS, platformLabel } from "@/lib/categoryPlatform";

import { AdminImagePicker } from "./AdminImagePicker";

export interface AdminCategoryDetailView {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** "PC" / "MOBILE" / "SPOOFER", or "" for none. */
  platform: string;
  imageUrl: string;
  soldCount: string;
  stockCount: string;
  /** How many products actually sit in it, for the note under the two counters. */
  productCount: number;
}

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL =
  "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const CARD =
  "rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4";
const CARD_HEAD =
  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500";

/**
 * One category's own screen.
 *
 * The same fields used to unfold inside the list row. That was fine while a
 * category was a name and a picture; it now carries an address, a blurb and
 * two shop-facing counters, and an editor that pushes every row below it down
 * the page is a poor place to type into. A category is a thing with a page
 * now, exactly like a product.
 */
export function AdminCategoryDetail({
  category,
}: {
  category: AdminCategoryDetailView;
}) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [description, setDescription] = useState(category.description);
  const [platform, setPlatform] = useState(category.platform);
  const [imageUrl, setImageUrl] = useState(category.imageUrl);
  const [soldCount, setSoldCount] = useState(category.soldCount);
  const [stockCount, setStockCount] = useState(category.stockCount);

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
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
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: category.id,
          name,
          slug,
          description,
          platform,
          imageUrl,
          // Typed as text so a half-deleted number does not become NaN under
          // the cursor; the digits are what the server is sent.
          soldCount: Number(soldCount.replace(/\D/g, "")),
          stockCount: Number(stockCount.replace(/\D/g, "")),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Lưu thất bại");
        return;
      }
      setOk("Đã lưu danh mục");
      // The address is part of what was just saved, and this page is addressed
      // by it — a changed slug means this URL no longer names this category.
      if (slug.trim() && slug.trim() !== category.slug) {
        router.replace(`/admin/categories/${encodeURIComponent(slug.trim())}`);
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}
      {ok ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
        >
          {ok}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-start">
        <section className={CARD}>
          <span className={CARD_HEAD}>Thông tin danh mục</span>

          <div>
            <label htmlFor="cat-name" className={LABEL}>
              Tên danh mục
            </label>
            <input
              id="cat-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="cat-slug" className={LABEL}>
              Đường dẫn
            </label>
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 font-mono text-[11px] text-neutral-500">/</span>
              <input
                id="cat-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className={`${FIELD} font-mono`}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-500">
              Đổi đường dẫn sẽ làm mọi link cũ tới{" "}
              <span className="font-mono text-neutral-400">/{category.slug}</span> trả về
              404.
            </p>
          </div>

          <div>
            <label htmlFor="cat-description" className={LABEL}>
              Mô tả ngắn (1–2 dòng trên thẻ trang chủ)
            </label>
            <textarea
              id="cat-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Trống thì thẻ không hiện dòng nào."
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="cat-platform" className={LABEL}>
              Nền tảng <span className="text-neutral-600">(chip lọc ở Danh sách hack game)</span>
            </label>
            <select
              id="cat-platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className={`${FIELD} w-48`}
            >
              <option value="" className="bg-neutral-900">
                — chưa phân loại —
              </option>
              {CATEGORY_PLATFORMS.map((value) => (
                <option key={value} value={value} className="bg-neutral-900">
                  {platformLabel(value)}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-neutral-500">
              Chưa phân loại thì danh mục chỉ hiện dưới chip &ldquo;Tất cả&rdquo;.
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-4 min-w-0">
          <section className={CARD}>
            <span className={CARD_HEAD}>Ảnh bìa</span>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="/sites/…/images/category/random.webp"
              aria-label="Đường dẫn ảnh bìa"
              className={FIELD}
            />
            <AdminImagePicker
              uploading={uploading}
              value={imageUrl}
              onPick={async (file) => {
                const url = await uploadImage(file);
                if (url) setImageUrl(url);
              }}
            />
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>Con số in trên thẻ trang chủ</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cat-sold" className={LABEL}>
                  Số &ldquo;Đã bán&rdquo;
                </label>
                <input
                  id="cat-sold"
                  inputMode="numeric"
                  value={soldCount}
                  onChange={(event) => setSoldCount(event.target.value)}
                  className={`${FIELD} tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="cat-stock" className={LABEL}>
                  Số &ldquo;Đang bán&rdquo;
                </label>
                <input
                  id="cat-stock"
                  inputMode="numeric"
                  value={stockCount}
                  onChange={(event) => setStockCount(event.target.value)}
                  className={`${FIELD} tabular-nums`}
                />
              </div>
            </div>
            <p className="text-[11px] text-neutral-500">
              Hai số này do shop tự đặt để in ra thẻ ngoài trang chủ — không phải số
              sản phẩm thật trong kho ({category.productCount}).
            </p>
          </section>
        </div>
      </div>

      <button
        type="button"
        disabled={busy || !name.trim() || !slug.trim()}
        onClick={() => void save()}
        className="self-start h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-50 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
      >
        {busy ? "Đang lưu…" : "Lưu thay đổi"}
      </button>
    </div>
  );
}
