"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Boxes,
  ExternalLink,
  ImagePlus,
  RotateCcw,
  Save,
  ShieldAlert,
  Swords,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";

import { AdminError, ConfirmDialog } from "./AdminStates";

export interface AccountDetailView {
  code: string;
  rank: string;
  status: string;
  price: number;
  oldPrice: number;
  categoryName: string;
  orderCount: number;
  imageUrl: string;
  gallery: { id: string; url: string }[];
  tag: string;
  vip: number;
  vipIngame: number;
  skinNames: string[];
  characterNames: string[];
  gearNames: string[];
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

const STATUS_META: Record<string, { label: string; tint: string }> = {
  AVAILABLE: {
    label: "Đang bán",
    tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  RESERVED: {
    label: "Đang giữ",
    tint: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  SOLD: { label: "Đã bán", tint: "border-rose-500/30 bg-rose-500/10 text-rose-400" },
  HIDDEN: { label: "Đã ẩn", tint: "border-white/10 bg-white/5 text-neutral-500" },
};

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * One account, full page — the list's one-at-a-time inline editors laid out
 * side by side. Every button talks to the same /api/admin/products routes the
 * list uses; this page adds no API of its own.
 */
export function AdminAccountDetail({ account }: { account: AccountDetailView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const [price, setPrice] = useState(String(account.price));
  const [status, setStatus] = useState(account.status);
  const [tag, setTag] = useState(account.tag);
  const [vip, setVip] = useState(account.vip > 0 ? String(account.vip) : "");
  const [vipIngame, setVipIngame] = useState(
    account.vipIngame > 0 ? String(account.vipIngame) : "",
  );
  const [skinText, setSkinText] = useState(account.skinNames.join("\n"));
  const [characterText, setCharacterText] = useState(account.characterNames.join("\n"));
  const [gearText, setGearText] = useState(account.gearNames.join("\n"));

  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const statusMeta = STATUS_META[account.status] ?? STATUS_META.HIDDEN!;

  async function api(
    method: "PATCH" | "PUT" | "DELETE",
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

  /** Uploads one picture through the shared uploader, returns its path. */
  async function upload(file: File): Promise<string | null> {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/admin/products/image", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Tải ảnh thất bại" });
        return null;
      }
      return data.url as string;
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function savePriceStatus() {
    const value = Number(price.replace(/\D/g, ""));
    const data = await api("PATCH", { code: account.code, price: value, status });
    if (data) setMsg({ tone: "ok", text: "Đã lưu giá và trạng thái" });
  }

  async function saveTag() {
    const data = await api("PATCH", {
      code: account.code,
      tag: tag.trim(),
      vip: Number(vip.replace(/\D/g, "")) || 0,
      vipIngame: Number(vipIngame.replace(/\D/g, "")) || 0,
    });
    if (data) setMsg({ tone: "ok", text: "Đã lưu tag và chỉ số" });
  }

  async function saveSkins() {
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
      const data = await api(
        "PUT",
        { code: account.code, names: list.names, kind: list.kind },
        "",
        "/skins",
      );
      if (!data) return;
      saved.push(`${data.count as number} ${list.label}`);
    }
    setMsg({ tone: "ok", text: `Đã lưu ${saved.join(", ")}` });
  }

  async function changeCover(file: File) {
    const url = await upload(file);
    if (!url) return;
    const data = await api("PATCH", { code: account.code, imageUrl: url });
    if (data) setMsg({ tone: "ok", text: "Đã đổi ảnh bìa" });
  }

  async function addGallery(file: File) {
    const url = await upload(file);
    if (!url) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products/gallery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: account.code, url }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Không thêm được ảnh phụ" });
        return;
      }
      setMsg({ tone: "ok", text: "Đã thêm ảnh phụ" });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteGallery(id: string) {
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
      setMsg({ tone: "ok", text: "Đã bỏ một ảnh phụ" });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  const priceChanged =
    Number(price.replace(/\D/g, "")) !== account.price || status !== account.status;

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

      {/* The account's papers. */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-wrap items-center gap-5">
        <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
          {account.imageUrl ? (
            <Image src={account.imageUrl} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-neutral-600">
              <Boxes size={20} />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-base font-black text-white">#{account.code}</span>
            <span
              className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${statusMeta.tint}`}
            >
              {statusMeta.label}
            </span>
            {account.tag ? (
              <span className="rounded border border-indigo-500/25 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-400">
                {account.tag}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
            <span>{account.categoryName}</span>
            <span>Rank {account.rank}</span>
            <span className="tabular-nums">{account.orderCount} đơn</span>
            <span className="font-black tabular-nums text-rose-400">
              {formatVnd(account.price)}đ
            </span>
            {account.oldPrice > account.price ? (
              <span className="tabular-nums text-neutral-600 line-through">
                {formatVnd(account.oldPrice)}đ
              </span>
            ) : null}
          </p>
        </div>
        <a
          href={`/account/${encodeURIComponent(account.code)}`}
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
              <Wallet size={13} className="text-neutral-400" />
              Giá & trạng thái
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="acc-price" className={LABEL}>
                  Giá bán (đ)
                </label>
                <input
                  id="acc-price"
                  inputMode="numeric"
                  value={price ? formatVnd(Number(price.replace(/\D/g, "") || "0")) : ""}
                  onChange={(event) =>
                    setPrice(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className={`${FIELD} w-40 tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="acc-status" className={LABEL}>
                  Trạng thái
                </label>
                <select
                  id="acc-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={`${FIELD} w-40`}
                >
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value} className="bg-neutral-900">
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={busy || !priceChanged}
                onClick={savePriceStatus}
                className={ACTION}
              >
                <Save size={12} />
                Lưu
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              &ldquo;Đã ẩn&rdquo; rút tài khoản khỏi kệ nhưng giữ nguyên link; &ldquo;Đã
              bán&rdquo; hiện nhãn hết hàng trên trang khách.
            </p>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Tag size={13} className="text-neutral-400" />
              Tag & chỉ số trên card
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="acc-tag" className={LABEL}>
                  Tag góc card <span className="text-neutral-600">(trống = ẩn)</span>
                </label>
                <input
                  id="acc-tag"
                  value={tag}
                  maxLength={30}
                  onChange={(event) => setTag(event.target.value)}
                  placeholder="DROP MAIL"
                  className={`${FIELD} w-44`}
                />
              </div>
              <div>
                <label htmlFor="acc-vip" className={LABEL}>
                  VP
                </label>
                <input
                  id="acc-vip"
                  inputMode="numeric"
                  value={vip}
                  onChange={(event) =>
                    setVip(event.target.value.replace(/\D/g, "").slice(0, 7))
                  }
                  placeholder="0"
                  className={`${FIELD} w-28 tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="acc-rp" className={LABEL}>
                  RP
                </label>
                <input
                  id="acc-rp"
                  inputMode="numeric"
                  value={vipIngame}
                  onChange={(event) =>
                    setVipIngame(event.target.value.replace(/\D/g, "").slice(0, 7))
                  }
                  placeholder="0"
                  className={`${FIELD} w-28 tabular-nums`}
                />
              </div>
              <button type="button" disabled={busy} onClick={saveTag} className={ACTION}>
                <Save size={12} />
                Lưu
              </button>
            </div>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Swords size={13} className="text-neutral-400" />
              Vật phẩm trong tài khoản
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  ["Súng", skinText, setSkinText],
                  ["Nhân vật", characterText, setCharacterText],
                  ["Trang bị", gearText, setGearText],
                ] as const
              ).map(([label, value, set]) => (
                <div key={label}>
                  <span className={LABEL}>
                    {label}
                    <span className="ml-1.5 font-bold normal-case tracking-normal text-neutral-600">
                      {value.split("\n").filter((l) => l.trim()).length}
                    </span>
                  </span>
                  <textarea
                    value={value}
                    onChange={(event) => set(event.target.value)}
                    rows={10}
                    placeholder="Mỗi dòng một tên"
                    aria-label={`Danh sách ${label}`}
                    className={`${FIELD} resize-y leading-relaxed`}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" disabled={busy} onClick={saveSkins} className={ACTION}>
                <Save size={12} />
                Lưu vật phẩm
              </button>
              <span className="text-[11px] text-neutral-500">
                Mỗi dòng một tên, thứ tự trên xuống là thứ tự hiện trên card.
              </span>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <ImagePlus size={13} className="text-neutral-400" />
              Ảnh bìa
            </span>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/[0.06] bg-neutral-950">
              {account.imageUrl ? (
                <Image
                  src={account.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-600">
                  <Boxes size={22} />
                  <span className="text-[11px]">Đang dùng ảnh mặc định theo mã</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => coverRef.current?.click()}
                className={ACTION}
              >
                <ImagePlus size={12} />
                Đổi ảnh bìa
              </button>
              {account.imageUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const data = await api("PATCH", { code: account.code, imageUrl: "" });
                    if (data) setMsg({ tone: "ok", text: "Đã về ảnh mặc định theo mã" });
                  }}
                  className="h-[34px] px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  Về ảnh mặc định
                </button>
              ) : null}
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
            </div>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <ImagePlus size={13} className="text-neutral-400" />
              Ảnh phụ ({account.gallery.length})
            </span>
            {account.gallery.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-neutral-500">
                Chưa có ảnh phụ — trang khách chỉ hiện ảnh bìa.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {account.gallery.map((shot) => (
                  <div
                    key={shot.id}
                    className="group relative aspect-video overflow-hidden rounded-lg border border-white/[0.06] bg-neutral-950"
                  >
                    <Image
                      src={shot.url}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteGallery(shot.id)}
                      aria-label="Xóa ảnh phụ này"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-neutral-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="self-start h-[34px] px-4 rounded-lg border border-dashed border-white/15 bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-neutral-400 transition-colors inline-flex items-center gap-1.5"
            >
              <ImagePlus size={12} />
              Thêm ảnh phụ
            </button>
            <input
              ref={galleryRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void addGallery(file);
              }}
            />
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
                {account.orderCount > 0
                  ? `${account.orderCount} đơn cũ giữ nguyên — khôi phục được ở tab Tài khoản.`
                  : "Chưa có đơn nào nên sẽ xóa hẳn, không khôi phục được."}
              </span>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={removing}
        danger
        pending={busy}
        title="Gỡ tài khoản khỏi cửa hàng?"
        body={
          account.orderCount > 0
            ? `#${account.code} rời kệ ngay. ${account.orderCount} đơn cũ vẫn nguyên, và tài khoản khôi phục được từ mục "đã gỡ" trong tab Tài khoản.`
            : `#${account.code} chưa có đơn nào nên sẽ bị xóa hẳn và không khôi phục được.`
        }
        confirmLabel="Gỡ khỏi cửa hàng"
        onCancel={() => setRemoving(false)}
        onConfirm={async () => {
          const data = await api(
            "DELETE",
            null,
            `?code=${encodeURIComponent(account.code)}`,
          );
          setRemoving(false);
          if (data) router.push("/admin/products");
        }}
      />
    </div>
  );
}
