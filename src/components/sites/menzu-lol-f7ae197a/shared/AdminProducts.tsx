"use client";

import { ImageIcon, Plus, RotateCcw, Swords, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Fragment, useRef, useState } from "react";

import { SKIN_CHIP_COUNT } from "./productData";

export interface AdminProductRow {
  code: string;
  rank: string;
  status: string;
  price: number;
  oldPrice: number;
  categoryName: string;
  orderCount: number;
  /** The uploaded picture path, or "" for the by-code default. */
  imageUrl: string;
  /** Extra screenshots the detail gallery pages through with its arrows. */
  gallery: { id: string; url: string }[];
  /** The card's corner pill — "DROP MAIL" — or "" for none. */
  tag: string;
  /** The stat strip's labelled numbers; 0 hides the entry on the card. */
  vip: number;
  vipIngame: number;
  /** Weapon skins, in the order the shop listed them. */
  skinNames: string[];
  /** Characters (AGENT rows) and gear (BUDDY rows), same ordering rule. */
  characterNames: string[];
  gearNames: string[];
}

/** A product the shop has removed — kept only so it can be put back. */
export interface AdminRemovedProductRow {
  code: string;
  rank: string;
  categoryName: string;
  orderCount: number;
  deletedLabel: string;
}

export interface AdminCategoryOption {
  slug: string;
  name: string;
}

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";

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
  removed,
  categories,
}: {
  products: AdminProductRow[];
  removed: AdminRemovedProductRow[];
  categories: AdminCategoryOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  // The row whose delete is armed. Deleting is one click away and the button
  // is a bare icon, so it asks once — inline rather than through confirm(),
  // which would freeze the page behind a browser dialog.
  const [arming, setArming] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [rank, setRank] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");

  // The account whose skin list is open, and the text being edited. One at a
  // time: the editor is a tall block inside the table, and two of them open at
  // once would push the row being worked on off the screen.
  const [editingSkins, setEditingSkins] = useState<string | null>(null);
  const [skinText, setSkinText] = useState("");
  const [characterText, setCharacterText] = useState("");
  const [gearText, setGearText] = useState("");

  // The account whose picture editor is open, and the path being edited.
  // Opening one editor closes the other for the same reason there is only one
  // of each: the table is the screen's spine and blocks must not stack.
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [imageDraft, setImageDraft] = useState("");
  const imageFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // The card's corner pill and stat numbers, edited together — they are the
  // card-face metadata and share one save.
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [vipDraft, setVipDraft] = useState("");
  const [vipIngameDraft, setVipIngameDraft] = useState("");

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
    setArming(null);
    const data = await call("DELETE", null, `?code=${encodeURIComponent(row.code)}`);
    if (!data) return;
    setMsg({
      tone: "ok",
      text:
        data.mode === "hard"
          ? `Đã xoá hẳn ${row.code} — chưa có đơn nào nên không còn gì để giữ lại`
          : `Đã xoá ${row.code} khỏi cửa hàng. ${row.orderCount} đơn cũ vẫn nguyên, khôi phục được ở mục dưới`,
    });
  }

  async function handleRestore(row: AdminRemovedProductRow) {
    const data = await call("PUT", null, `?code=${encodeURIComponent(row.code)}`);
    if (data) setMsg({ tone: "ok", text: `Đã khôi phục ${row.code}` });
  }

  /**
   * Opens the skin editor on the saved list, or closes it if this row's is
   * already open. Prefilling from the row rather than fetching keeps the text
   * area showing exactly what the storefront is showing.
   */
  function toggleSkins(row: AdminProductRow) {
    if (editingSkins === row.code) {
      setEditingSkins(null);
      return;
    }
    setEditingSkins(row.code);
    setEditingImage(null);
    setEditingTag(null);
    setSkinText(row.skinNames.join("\n"));
    setCharacterText(row.characterNames.join("\n"));
    setGearText(row.gearNames.join("\n"));
    setMsg(null);
  }

  /** Opens the picture editor prefilled with what the storefront is using. */
  function toggleImage(row: AdminProductRow) {
    if (editingImage === row.code) {
      setEditingImage(null);
      return;
    }
    setEditingImage(row.code);
    setEditingSkins(null);
    setEditingTag(null);
    setImageDraft(row.imageUrl);
    setMsg(null);
  }

  function toggleTag(row: AdminProductRow) {
    if (editingTag === row.code) {
      setEditingTag(null);
      return;
    }
    setEditingTag(row.code);
    setEditingSkins(null);
    setEditingImage(null);
    setTagDraft(row.tag);
    // Zero renders as an empty field: it means "not on the card", and making
    // the admin stare at literal zeros would invite leaving them there.
    setVipDraft(row.vip > 0 ? String(row.vip) : "");
    setVipIngameDraft(row.vipIngame > 0 ? String(row.vipIngame) : "");
    setMsg(null);
  }

  async function handleSaveTag(row: AdminProductRow) {
    const value = tagDraft.trim();
    const data = await call("PATCH", {
      code: row.code,
      tag: value,
      // An emptied field goes back to zero, which takes the entry off the card.
      vip: Number(vipDraft.replace(/\D/g, "")) || 0,
      vipIngame: Number(vipIngameDraft.replace(/\D/g, "")) || 0,
    });
    if (!data) return;
    setEditingTag(null);
    setMsg({ tone: "ok", text: `Đã lưu tag & chỉ số cho ${row.code}` });
  }

  /**
   * Add one extra screenshot: through the shared uploader for the file, then
   * the gallery route for the row — one motion for the admin either way.
   */
  async function handleGalleryFile(row: AdminProductRow, file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const up = await fetch("/api/admin/products/image", { method: "POST", body: form });
      const uploaded = (await up.json().catch(() => ({}))) as Record<string, unknown>;
      if (!up.ok) {
        setMsg({ tone: "err", text: (uploaded.error as string) ?? "Tải ảnh thất bại" });
        return;
      }
      const res = await fetch("/api/admin/products/gallery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: row.code, url: uploaded.url }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Không thêm được ảnh phụ" });
        return;
      }
      setMsg({ tone: "ok", text: `Đã thêm ảnh phụ cho ${row.code}` });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function handleGalleryDelete(row: AdminProductRow, id: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products/gallery?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Không xoá được ảnh phụ" });
        return;
      }
      setMsg({ tone: "ok", text: `Đã bỏ một ảnh phụ khỏi ${row.code}` });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveImage(row: AdminProductRow, value: string) {
    const data = await call("PATCH", { code: row.code, imageUrl: value });
    if (!data) return;
    setEditingImage(null);
    setMsg({
      tone: "ok",
      text: value.trim()
        ? `Đã đổi ảnh cho ${row.code}`
        : `${row.code} dùng lại ảnh mặc định theo mã`,
    });
  }

  /**
   * Upload straight off the disk, then save in the same motion — picking a
   * file is already the decision, and a second "Lưu" after it would only be
   * a chance to forget.
   */
  async function handleImageFile(row: AdminProductRow, file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/admin/products/image", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Tải ảnh thất bại" });
        return;
      }
      setImageDraft(data.url as string);
      setBusy(false);
      await handleSaveImage(row, data.url as string);
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  /** All three lists in one save — each kind replaces only its own rows. */
  async function handleSaveSkins(row: AdminProductRow) {
    const toNames = (text: string) =>
      text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const lists = [
      { kind: "WEAPON_SKIN", names: toNames(skinText), label: "súng" },
      { kind: "AGENT", names: toNames(characterText), label: "nhân vật" },
      { kind: "BUDDY", names: toNames(gearText), label: "trang bị" },
    ];

    const saved: string[] = [];
    for (const list of lists) {
      const data = await call(
        "PUT",
        { code: row.code, names: list.names, kind: list.kind },
        "",
        "/skins",
      );
      // The failed list's error is already on screen; stopping here leaves
      // the editor open so nothing saved before it is misreported.
      if (!data) return;
      saved.push(`${data.count as number} ${list.label}`);
    }

    setEditingSkins(null);
    setMsg({ tone: "ok", text: `Đã lưu ${saved.join(", ")} cho ${row.code}` });
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const data = await call("POST", {
      code,
      categorySlug,
      rank,
      price: Number(price.replace(/\D/g, "")),
      oldPrice: Number((oldPrice || price).replace(/\D/g, "")),
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
      setRank("");
      setPrice("");
      setOldPrice("");
    }
  }

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
            <label className={LABEL}>Rank</label>
            <input
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="GOLD 1"
              className={FIELD}
            />
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

      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-white/10">
              {["Mã", "Ảnh", "Danh mục", "Rank", "Tag", "Súng", "Giá", "Trạng thái", ""].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <Fragment key={p.code}>
                <tr className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-xs font-black text-white">#{p.code}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleImage(p)}
                      title="Sửa ảnh của tài khoản này"
                      className={`relative block h-9 w-14 overflow-hidden rounded-lg border transition-colors ${
                        editingImage === p.code
                          ? "border-[var(--brand)]/60"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.code}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        // No upload yet: the storefront is showing the by-code
                        // default, so an icon says "nothing chosen" better than
                        // previewing a file that may not exist.
                        <span className="grid h-full w-full place-items-center bg-neutral-950 text-neutral-600">
                          <ImageIcon size={14} />
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral-400">{p.categoryName}</td>
                  <td className="px-5 py-3 text-xs text-neutral-300">{p.rank}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleTag(p)}
                      title="Sửa tag góc phải của card"
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors ${
                        editingTag === p.code
                          ? "border-[var(--brand)]/60 bg-[var(--brand)]/10 text-white"
                          : p.tag
                            ? "border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[#ff6c88] hover:border-[var(--brand)]/60"
                            : "border-white/10 text-neutral-500 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {p.tag || "Thêm"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSkins(p)}
                      title="Sửa danh sách súng của tài khoản này"
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors ${
                        editingSkins === p.code
                          ? "border-[var(--brand)]/60 bg-[var(--brand)]/10 text-white"
                          : "border-white/10 text-neutral-300 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <Swords size={12} />
                      {/* The count is the useful figure at a glance; "Thêm" is
                          what the button does when there is nothing to count. */}
                      {p.skinNames.length > 0 ? `${p.skinNames.length} súng` : "Thêm"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-xs font-bold text-white">
                    {formatVnd(p.price)}đ
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={p.status}
                      disabled={busy}
                      onChange={(e) =>
                        call("PATCH", { code: p.code, status: e.target.value })
                      }
                      className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-1 text-[11px] font-bold text-neutral-200"
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value} className="bg-neutral-900">
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {arming === p.code ? (
                      // The armed state spells out what will happen to this
                      // particular row, because the two outcomes differ and the
                      // admin cannot tell them apart from the table alone.
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] font-bold text-neutral-400 whitespace-nowrap">
                          {p.orderCount > 0
                            ? `Giữ ${p.orderCount} đơn cũ?`
                            : "Xoá hẳn?"}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(p)}
                          className="h-7 px-2.5 rounded-lg bg-red-500/90 hover:bg-red-500 disabled:opacity-60 transition-colors text-[10px] font-black uppercase tracking-widest text-white"
                        >
                          Xoá
                        </button>
                        <button
                          type="button"
                          onClick={() => setArming(null)}
                          className="h-7 px-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-[10px] font-black uppercase tracking-widest text-neutral-300"
                        >
                          Huỷ
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        title={
                          p.orderCount > 0
                            ? `Xoá khỏi cửa hàng — ${p.orderCount} đơn cũ được giữ lại`
                            : "Xoá sản phẩm"
                        }
                        onClick={() => setArming(p.code)}
                        className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>

                {/* The skin list, edited as plain text under its own row. A
                    line per weapon rather than a field per weapon: the shop
                    reads them off an inventory screen and types them straight
                    down, and pasting the lot at once has to work. */}
                {editingSkins === p.code ? (
                  <tr className="border-b border-white/5 bg-neutral-950/60">
                    <td colSpan={9} className="px-5 py-4">
                      <div className="flex flex-col gap-3">
                        {/* Three lists, one per inventory tab. Typed the same
                            way — a line per item — and saved together. */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className={LABEL}>
                              Súng của #{p.code} — mỗi dòng một cây
                            </label>
                            <textarea
                              value={skinText}
                              onChange={(e) => setSkinText(e.target.value)}
                              rows={6}
                              spellCheck={false}
                              placeholder={"M200 Dominator\nM4A1-S Prism Beast\nAK12-Knife Iron Spider"}
                              className={`${FIELD} resize-y leading-relaxed`}
                            />
                          </div>
                          <div>
                            <label className={LABEL}>Nhân vật</label>
                            <textarea
                              value={characterText}
                              onChange={(e) => setCharacterText(e.target.value)}
                              rows={6}
                              spellCheck={false}
                              placeholder={"Nikita\nSFG"}
                              className={`${FIELD} resize-y leading-relaxed`}
                            />
                          </div>
                          <div>
                            <label className={LABEL}>Trang bị</label>
                            <textarea
                              value={gearText}
                              onChange={(e) => setGearText(e.target.value)}
                              rows={6}
                              spellCheck={false}
                              placeholder={"C4 Vàng\nBăng đạn mở rộng"}
                              className={`${FIELD} resize-y leading-relaxed`}
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          Card ngoài cửa hàng chỉ in súng — {SKIN_CHIP_COUNT} tên đầu,
                          phần còn lại gộp thành “+N” — nên xếp cây đắt giá nhất lên
                          trên. Nhân vật và Trang bị chỉ hiện trong kho đồ ở trang chi
                          tiết. Để trống danh sách nào rồi lưu là xoá danh sách đó.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSaveSkins(p)}
                            className="h-9 px-4 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 transition-colors text-[10px] font-black uppercase tracking-widest text-white"
                          >
                            {busy ? "Đang lưu…" : "Lưu danh sách"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSkins(null)}
                            className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-[10px] font-black uppercase tracking-widest text-neutral-300"
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}

                {/* The picture editor. Choosing a file uploads and saves in one
                    motion; the path field is for pasting a link by hand, and
                    saving it empty goes back to the by-code default. */}
                {editingImage === p.code ? (
                  <tr className="border-b border-white/5 bg-neutral-950/60">
                    <td colSpan={9} className="px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="relative aspect-[16/10] w-full max-w-[240px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                          {imageDraft ? (
                            <Image
                              src={imageDraft}
                              alt={p.code}
                              fill
                              sizes="240px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-[11px] font-bold text-neutral-600">
                              Ảnh mặc định theo mã
                            </span>
                          )}
                        </div>

                        <div className="flex w-full flex-col gap-3">
                          <div>
                            <label className={LABEL}>Ảnh của #{p.code}</label>
                            <input
                              value={imageDraft}
                              onChange={(e) => setImageDraft(e.target.value)}
                              placeholder="/uploads/accounts/… hoặc để trống dùng ảnh mặc định"
                              className={FIELD}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => imageFileRef.current?.click()}
                              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 transition-colors text-[10px] font-black uppercase tracking-widest text-white"
                            >
                              <Upload size={12} />
                              Chọn từ máy
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleSaveImage(p, imageDraft)}
                              className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors text-[10px] font-black uppercase tracking-widest text-neutral-200"
                            >
                              Lưu đường dẫn
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingImage(null)}
                              className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-[10px] font-black uppercase tracking-widest text-neutral-300"
                            >
                              Huỷ
                            </button>
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            Chọn ảnh từ máy là lưu luôn. Ảnh hiện ở card ngoài cửa
                            hàng, trang chi tiết và ảnh chia sẻ SEO.
                          </p>

                          {/* Extra screenshots: what the detail gallery's
                              arrows page through. Separate from the main
                              picture on purpose — that one is the card face,
                              these are the tour behind it. */}
                          <div className="border-t border-white/5 pt-3">
                            <label className={LABEL}>
                              Ảnh phụ ({p.gallery.length}/12) — khách lướt bằng mũi
                              tên trên trang chi tiết
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                              {p.gallery.map((g) => (
                                <span
                                  key={g.id}
                                  className="group/thumb relative block h-12 w-[76px] overflow-hidden rounded-lg border border-white/10"
                                >
                                  <Image
                                    src={g.url}
                                    alt=""
                                    fill
                                    sizes="76px"
                                    className="object-cover"
                                  />
                                  <button
                                    type="button"
                                    disabled={busy}
                                    title="Bỏ ảnh này"
                                    onClick={() => handleGalleryDelete(p, g.id)}
                                    className="absolute inset-0 grid place-items-center bg-black/70 text-red-400 opacity-0 transition-opacity group-hover/thumb:opacity-100"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </span>
                              ))}
                              <button
                                type="button"
                                disabled={busy || p.gallery.length >= 12}
                                onClick={() => galleryFileRef.current?.click()}
                                className="grid h-12 w-[76px] place-items-center rounded-lg border border-dashed border-white/20 text-neutral-500 transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <input
                          ref={imageFileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) void handleImageFile(p, file);
                          }}
                        />
                        <input
                          ref={galleryFileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) void handleGalleryFile(p, file);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}

                {/* The tag & stats editor: the pieces of card-face metadata
                    that are typed rather than uploaded — the corner pill and
                    the strip's two labelled numbers. Saved empty, each comes
                    off the card. */}
                {editingTag === p.code ? (
                  <tr className="border-b border-white/5 bg-neutral-950/60">
                    <td colSpan={9} className="px-5 py-4">
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,320px)_120px_120px]">
                          <div>
                            <label className={LABEL}>
                              Tag góc phải card #{p.code}
                            </label>
                            <input
                              value={tagDraft}
                              onChange={(e) => setTagDraft(e.target.value)}
                              maxLength={30}
                              placeholder="DROP MAIL — trống là gỡ"
                              className={FIELD}
                            />
                          </div>
                          <div>
                            <label className={LABEL}>VIP</label>
                            <input
                              inputMode="numeric"
                              value={vipDraft}
                              onChange={(e) => setVipDraft(e.target.value)}
                              placeholder="7"
                              className={FIELD}
                            />
                          </div>
                          <div>
                            <label className={LABEL}>VIP Ingame</label>
                            <input
                              inputMode="numeric"
                              value={vipIngameDraft}
                              onChange={(e) => setVipIngameDraft(e.target.value)}
                              placeholder="9"
                              className={FIELD}
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          VIP và VIP Ingame hiện trên dải chỉ số của card, cạnh
                          Rank. Để trống ô nào thì card giấu chỉ số đó.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSaveTag(p)}
                            className="h-9 px-4 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 transition-colors text-[10px] font-black uppercase tracking-widest text-white"
                          >
                            {busy ? "Đang lưu…" : "Lưu tag"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTag(null)}
                            className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-[10px] font-black uppercase tracking-widest text-neutral-300"
                          >
                            Huỷ
                          </button>
                          {/* The one value this shop actually uses, one click
                              away instead of retyped each time. */}
                          <button
                            type="button"
                            onClick={() => setTagDraft("DROP MAIL")}
                            className="h-9 px-3 rounded-xl border border-[var(--brand)]/40 bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 transition-colors text-[10px] font-black uppercase tracking-widest text-[#ff6c88]"
                          >
                            ✉ Drop Mail
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Only drawn when there is something in it. A permanently visible
          "Đã xoá (0)" would be one more thing to read past on a screen whose
          job is the table above. */}
      {removed.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Đã xoá ({removed.length})
            </span>
            <p className="text-[11px] text-neutral-500 mt-1">
              Không hiện ngoài cửa hàng. Đơn hàng cũ vẫn xem được, và khôi phục
              lại thì tài khoản trở về đúng trạng thái trước khi xoá.
            </p>
          </div>
          <ul>
            {removed.map((p) => (
              <li
                key={p.code}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 border-b border-white/5 last:border-0"
              >
                <span className="text-xs font-black text-neutral-300">#{p.code}</span>
                <span className="text-xs text-neutral-500">{p.categoryName}</span>
                <span className="text-xs text-neutral-500">{p.rank}</span>
                <span className="text-[11px] text-neutral-600">
                  Xoá ngày {p.deletedLabel} · {p.orderCount} đơn
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleRestore(p)}
                  className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors text-[10px] font-black uppercase tracking-widest text-neutral-200"
                >
                  <RotateCcw size={12} />
                  Khôi phục
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
