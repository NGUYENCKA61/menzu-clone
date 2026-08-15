"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminCategoryOption } from "./AdminProducts";

export interface AdminSoftwarePackage {
  id: string;
  label: string;
  price: number;
  durationDays: number | null;
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
  videoUrl: string;
  version: string;
  platform: string;
  packages: AdminSoftwarePackage[];
}

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const MINI =
  "rounded-lg border border-white/10 bg-neutral-950 px-2 py-1 text-[11px] font-bold text-neutral-200";

const SOFTWARE_STATUS: Record<string, string> = {
  UNDETECTED: "Undetected",
  DETECTED: "Detected",
  UPDATING: "Đang cập nhật",
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

  const [code, setCode] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // Which product's "add package" row is open, and what has been typed in it.
  const [adding, setAdding] = useState<string | null>(null);
  const [pkgLabel, setPkgLabel] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgDays, setPkgDays] = useState("");

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

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const data = await call("/api/admin/software", "POST", {
      code,
      categorySlug,
      name,
      description,
      price: Number(price.replace(/\D/g, "")),
    });
    if (!data) return;
    setMsg({
      tone: "ok",
      text: data.revived
        ? `Đã khôi phục ${code.toUpperCase()} — mã này thuộc một sản phẩm đã xoá`
        : `Đã thêm ${name}. Giờ hãy thêm các gói thời hạn bên dưới.`,
    });
    setCode("");
    setName("");
    setPrice("");
    setDescription("");
  }

  async function addPackage(productCode: string) {
    const data = await call("/api/admin/software/packages", "POST", {
      code: productCode,
      label: pkgLabel,
      price: Number(pkgPrice.replace(/\D/g, "")),
      durationDays: pkgDays ? Number(pkgDays.replace(/\D/g, "")) : null,
    });
    if (!data) return;
    setMsg({ tone: "ok", text: `Đã thêm gói ${pkgLabel}` });
    setPkgLabel("");
    setPkgPrice("");
    setPkgDays("");
    setAdding(null);
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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className={LABEL}>Mã</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VALTOOL01"
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
            <label className={LABEL}>Tên phần mềm</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Valorant Tool Premium"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Giá hiển thị</label>
            <input
              required
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="99000"
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

      {software.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-neutral-500">
          Chưa có phần mềm nào.
        </p>
      ) : null}

      {software.map((s) => (
        <div
          key={s.code}
          className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/10">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white truncate">{s.name}</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                #{s.code} · {s.categoryName}
              </p>
            </div>

            <select
              value={s.softwareStatus ?? "UNDETECTED"}
              disabled={busy}
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

            <button
              type="button"
              disabled={busy}
              title="Xoá phần mềm"
              onClick={() =>
                call(`/api/admin/products?code=${encodeURIComponent(s.code)}`, "DELETE", null)
              }
              className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="px-5 py-4">
            {/* Saved on blur rather than on every keystroke: a URL is pasted
                whole, and a request per character would be a request per
                character. */}
            <label className={LABEL}>Link tải tool &amp; hướng dẫn</label>
            <input
              defaultValue={s.downloadUrl}
              disabled={busy}
              placeholder="https://… — để trống thì thẻ sản phẩm ẩn nút tải"
              onBlur={(e) => {
                if (e.target.value.trim() === s.downloadUrl) return;
                call("/api/admin/software", "PATCH", {
                  code: s.code,
                  downloadUrl: e.target.value,
                });
              }}
              className={`${FIELD} mb-4`}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className={LABEL}>Phiên bản</label>
                <input
                  defaultValue={s.version}
                  disabled={busy}
                  placeholder="Premium 2.4.1 — trống thì ẩn ô này"
                  onBlur={(e) => {
                    if (e.target.value.trim() === s.version) return;
                    call("/api/admin/software", "PATCH", {
                      code: s.code,
                      version: e.target.value,
                    });
                  }}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Nền tảng</label>
                <input
                  defaultValue={s.platform}
                  disabled={busy}
                  placeholder="Windows 10 / 11 — trống thì ẩn ô này"
                  onBlur={(e) => {
                    if (e.target.value.trim() === s.platform) return;
                    call("/api/admin/software", "PATCH", {
                      code: s.code,
                      platform: e.target.value,
                    });
                  }}
                  className={FIELD}
                />
              </div>
            </div>

            <label className={LABEL}>Video YouTube (khung ảnh trang sản phẩm)</label>
            <input
              defaultValue={s.videoUrl}
              disabled={busy}
              placeholder="Dán link YouTube — để trống thì khung hiện ảnh sản phẩm"
              onBlur={(e) => {
                if (e.target.value.trim() === s.videoUrl) return;
                call("/api/admin/software", "PATCH", {
                  code: s.code,
                  videoUrl: e.target.value,
                });
              }}
              className={`${FIELD} mb-4`}
            />

            <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
              Gói thời hạn ({s.packages.length})
            </span>

            {s.packages.length === 0 ? (
              <p className="text-[12px] text-amber-400/90 mb-3">
                Chưa có gói nào — trang sản phẩm sẽ không mua được cho tới khi
                thêm ít nhất một gói.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2 mb-3">
                {s.packages.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] pl-3 pr-1.5 py-1.5"
                  >
                    <span className="text-[12px] font-bold text-white">{p.label}</span>
                    <span className="text-[12px] font-bold text-[var(--menzu-accent)]">
                      {formatVnd(p.price)}đ
                    </span>
                    <button
                      type="button"
                      disabled={busy || p.orderCount > 0}
                      title={
                        p.orderCount > 0
                          ? `Đã có ${p.orderCount} đơn — không xoá được`
                          : "Xoá gói"
                      }
                      onClick={() =>
                        call(
                          `/api/admin/software/packages?id=${encodeURIComponent(p.id)}`,
                          "DELETE",
                          null,
                        )
                      }
                      className="p-1 rounded text-neutral-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {adding === s.code ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-32">
                  <label className={LABEL}>Tên gói</label>
                  <input
                    value={pkgLabel}
                    onChange={(e) => setPkgLabel(e.target.value)}
                    placeholder="7 ngày"
                    className={FIELD}
                  />
                </div>
                <div className="w-32">
                  <label className={LABEL}>Giá</label>
                  <input
                    inputMode="numeric"
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(e.target.value)}
                    placeholder="99000"
                    className={FIELD}
                  />
                </div>
                <div className="w-32">
                  <label className={LABEL}>Số ngày</label>
                  <input
                    inputMode="numeric"
                    value={pkgDays}
                    onChange={(e) => setPkgDays(e.target.value)}
                    placeholder="trống = vĩnh viễn"
                    className={FIELD}
                  />
                </div>
                <button
                  type="button"
                  disabled={busy || !pkgLabel.trim() || !pkgPrice.trim()}
                  onClick={() => addPackage(s.code)}
                  className="h-10 px-4 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-50 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
                >
                  Lưu gói
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(null)}
                  className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-[11px] font-black uppercase tracking-widest text-neutral-300"
                >
                  Huỷ
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAdding(s.code);
                  setPkgLabel("");
                  setPkgPrice("");
                  setPkgDays("");
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-[10px] font-black uppercase tracking-widest text-neutral-300"
              >
                <Plus size={12} />
                Thêm gói
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
