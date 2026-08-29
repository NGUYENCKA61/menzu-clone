"use client";

import { Eye, ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deliversAutomatically } from "@/lib/accountLogin";

import { AdminImagePicker } from "./AdminImagePicker";
import { AdminSearch, ConfirmDialog } from "./AdminStates";

export interface AdminProductRow {
  code: string;
  /** The shop's own title, or "" - the storefront then titles by rank/skins. */
  name: string;
  rank: string;
  status: string;
  price: number;
  categoryName: string;
  orderCount: number;
  /** The uploaded picture path, or "" for the by-code default. */
  imageUrl: string;
  /** The card's corner pill — "NFA" / "FULL THÔNG TIN" — or "" for none. */
  tag: string;
  /** Whether a sign-in is on the row. Only NFA hands it over by itself. */
  hasLogin: boolean;
}

export interface AdminCategoryOption {
  slug: string;
  name: string;
}

// The shop-wide admin field: same border, ground, radius and size as Cấu
// hình, Nhóm, and the two product detail screens. This page used to be the
// only one on a lighter, rounder, larger variant, so moving between it and a
// detail screen changed the shape of every box on the way.
const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
// The status pick on a shelf row - the same small select the software list uses.
const MINI =
  "rounded-lg border border-white/10 bg-neutral-950 px-2 py-1 text-[11px] font-bold text-neutral-200";

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Đang bán",
  RESERVED: "Đang giữ",
  SOLD: "Đã bán",
  HIDDEN: "Đã ẩn",
};

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function AdminProducts({
  products,
  categories,
}: {
  products: AdminProductRow[];
  categories: AdminCategoryOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  // The row whose delete is pending its confirm dialog.
  const [removing, setRemoving] = useState<AdminProductRow | null>(null);
  const [query, setQuery] = useState("");

  const [code, setCode] = useState("");
  const [newName, setNewName] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState("");
  const [uploadingNew, setUploadingNew] = useState(false);
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [newLoginUser, setNewLoginUser] = useState("");
  const [newLoginPass, setNewLoginPass] = useState("");

  /** Returns the parsed body on success, null on failure. */
  async function call(
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    payload: Record<string, unknown> | null,
    query = "",
    sub = "",
  ): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products${sub}${query}`, {
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
   * The message says which of the two removals happened, because they differ
   * in the only way the admin cares about: whether it can be undone.
   */
  async function handleDelete(row: AdminProductRow) {
    setRemoving(null);
    const data = await call("DELETE", null, `?code=${encodeURIComponent(row.code)}`);
    if (!data) return;
    setMsg({
      tone: "ok",
      text:
        data.mode === "hard"
          ? `Đã xoá hẳn ${row.code} — chưa có đơn nào nên không còn gì để giữ lại`
          : `Đã xoá ${row.code} khỏi cửa hàng. ${row.orderCount} đơn cũ vẫn nguyên.`,
    });
  }

  /**
   * Upload for the create form: answers with the URL and nothing else — the
   * account does not exist yet, so the URL rides along on the POST.
   */
  async function uploadNewImage(file: File): Promise<string | null> {
    setUploadingNew(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/products/image", { method: "POST", body: form });
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
    // No rank here: it is set on the account's own page, where the address
    // upgrades itself the first time a real rank lands.
    const data = await call("POST", {
      code,
      name: newName,
      categorySlug,
      description: newDescription,
      imageUrl: newImage,
      price: Number(price.replace(/\D/g, "")),
      oldPrice: Number((oldPrice || price).replace(/\D/g, "")),
      loginUsername: newLoginUser,
      loginPassword: newLoginPass,
    });
    if (data) {
      setMsg({
        tone: "ok",
        // Saying so matters: the account comes back with its old order history
        // attached, which is not what "thêm mới" would lead anyone to expect.
        text: data.revived
          ? `Đã khôi phục ${code.toUpperCase()} — mã này thuộc một tài khoản đã xoá, nay dùng lại với giá vừa nhập`
          : `Đã thêm ${code.toUpperCase()}`,
      });
      setCode("");
      setNewName("");
      setNewDescription("");
      setNewImage("");
      setPrice("");
      setOldPrice("");
      setNewLoginUser("");
      setNewLoginPass("");
    }
  }

  /** Code, name, rank, category or tag — the things a listing is known by. */
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? products.filter(
        (p) =>
          p.code.toLowerCase().includes(needle) ||
          p.name.toLowerCase().includes(needle) ||
          p.rank.toLowerCase().includes(needle) ||
          p.categoryName.toLowerCase().includes(needle) ||
          p.tag.toLowerCase().includes(needle),
      )
    : products;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Thêm sản phẩm
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <label className={LABEL}>Mã</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VLR9999"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>
              Tên sản phẩm <span className="text-neutral-600">(không bắt buộc)</span>
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ACC VIP FULL SKIN"
              className={FIELD}
            />
          </div>
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
            <label className={LABEL}>Giá bán</label>
            <input
              required
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="2990000"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Giá gốc</label>
            <input
              inputMode="numeric"
              value={oldPrice}
              onChange={(e) => setOldPrice(e.target.value)}
              placeholder="bằng giá bán"
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>
            Mô tả <span className="text-neutral-600">(không bắt buộc)</span>
          </label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            placeholder="Acc full access, mail gốc, đổi được toàn bộ thông tin…"
            className={FIELD}
          />
        </div>

        {/* The sign-in an NFA account hands its buyer by itself. Offered here
            because this is the moment the shop has it open in front of them;
            it can equally be typed later on the account's own page. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>
              Tài khoản đăng nhập giao khách{" "}
              <span className="text-neutral-600">
                (tag NFA giao tự động — không bắt buộc, nhập sau cũng được)
              </span>
            </label>
            <input
              value={newLoginUser}
              onChange={(e) => setNewLoginUser(e.target.value)}
              autoComplete="off"
              placeholder="riot_user"
              className={`${FIELD} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL}>Mật khẩu giao khách</label>
            <input
              value={newLoginPass}
              onChange={(e) => setNewLoginPass(e.target.value)}
              autoComplete="off"
              placeholder="nhập cùng tài khoản"
              className={`${FIELD} font-mono`}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>
            Ảnh sản phẩm <span className="text-neutral-600">(không bắt buộc — trống thì dùng ảnh theo mã)</span>
          </label>
          <input
            value={newImage}
            onChange={(e) => setNewImage(e.target.value)}
            placeholder="/sites/…/images/account/VLR9999.webp"
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
          {busy ? "Đang xử lý…" : "Thêm sản phẩm"}
        </button>
      </form>

      {/* Drawn whenever there is anything to find: the shop asked for it while
          holding two accounts, which is already enough to want it. */}
      {products.length > 0 ? (
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Tìm theo mã, rank, danh mục hoặc tag…"
          label="Tìm tài khoản"
        />
      ) : null}

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-neutral-500">
          {needle
            ? `Không có tài khoản nào khớp "${query.trim()}".`
            : "Chưa có tài khoản nào."}
        </p>
      ) : null}

      {/* One line per account, the same shelf the software list keeps: what
          it is, whether it is on sale, and the two verbs. Everything else —
          tag, chỉ số, súng, ảnh, giá — lives on the detail page the Sửa
          button opens; it used to be inlined here too, which made every row
          a whole form and the list a scroll. */}
      {shown.map((p) => (
        <div
          key={p.code}
          className="rounded-2xl border border-white/10 bg-neutral-900/40 flex flex-wrap items-center gap-3 px-5 py-4"
        >
          {/* The cover, at the tile size the software and category lists
              wear, so the three shelves read as one. */}
          <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-neutral-600">
                <ImageIcon size={14} />
              </span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/products/${encodeURIComponent(p.code)}`}
              className="group inline-flex items-center gap-1.5"
            >
              <p className="text-sm font-black text-white truncate transition-colors group-hover:text-rose-400">
                #{p.code}
                {p.name ? ` — ${p.name}` : ""}
              </p>
              <Eye
                size={13}
                className="shrink-0 text-neutral-600 transition-colors group-hover:text-rose-400"
              />
            </Link>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {p.categoryName} · {formatVnd(p.price)}đ
              {p.rank ? ` · ${p.rank}` : ""}
              {p.tag ? ` · ${p.tag}` : ""}
              {/* Said on the shelf, not only on the detail page: an NFA
                  account sold without this hands its buyer nothing. Other
                  tags are handed over in person and need no line here. */}
              {deliversAutomatically(p.tag) && !p.hasLogin ? (
                <span className="text-amber-400"> · chưa có TK đăng nhập</span>
              ) : null}
            </p>
          </div>

          <select
            value={p.status}
            disabled={busy}
            aria-label={`Trạng thái bán của ${p.code}`}
            onChange={(e) => call("PATCH", { code: p.code, status: e.target.value })}
            className={MINI}
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value} className="bg-neutral-900">
                {label}
              </option>
            ))}
          </select>

          <Link
            href={`/admin/products/${encodeURIComponent(p.code)}`}
            className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center"
          >
            Sửa
          </Link>

          <button
            type="button"
            disabled={busy}
            title="Xoá tài khoản"
            aria-label={`Xoá ${p.code}`}
            onClick={() => setRemoving(p)}
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
        title="Xoá tài khoản?"
        body={
          removing
            ? removing.orderCount > 0
              ? `#${removing.code} rời kệ ngay. ${removing.orderCount} đơn cũ vẫn nguyên, và tài khoản khôi phục được.`
              : `#${removing.code} chưa có đơn nào nên sẽ bị xóa hẳn và không khôi phục được.`
            : ""
        }
        confirmLabel="Xoá tài khoản"
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && handleDelete(removing)}
      />

    </div>
  );
}
