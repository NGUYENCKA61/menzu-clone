"use client";

import { Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export interface AdminWeaponImageRow {
  name: string;
  url: string;
  width: number;
  height: number;
  sourceUrl: string | null;
}

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";

/**
 * The shared weapon-picture library.
 *
 * One picture per weapon, reused by every account listing it — which is the
 * whole reason this is a screen of its own rather than a field on an account.
 * Sourcing an M200 picture is a job done once, not once per account.
 *
 * Two ways to add, because the pictures live in two different places. A wiki
 * page's image can be handed over as a link and the server fetches it; anything
 * else gets saved to disk first and uploaded. Both end up as the shop's own file
 * on the shop's own domain.
 */
export function AdminWeaponImages({
  images,
  missing,
  missingTotal,
}: {
  images: AdminWeaponImageRow[];
  /** Weapon names listed on accounts that have no picture yet. */
  missing: string[];
  missingTotal: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [arming, setArming] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [link, setLink] = useState("");

  async function send(init: RequestInit, query = ""): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/weapons/image${query}`, init);
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg({ tone: "err", text: (data.error as string) ?? "Thao tác thất bại" });
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(event: React.FormEvent) {
    event.preventDefault();
    const ok = await send({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, sourceUrl: link }),
    });
    if (ok) {
      setMsg({ tone: "ok", text: `Đã tải ảnh cho ${name.trim()}` });
      setName("");
      setLink("");
    }
  }

  /** Upload straight off the disk, using whatever is in the name field. */
  async function handleFile(file: File) {
    if (!name.trim()) {
      setMsg({ tone: "err", text: "Điền tên vật phẩm trước khi chọn ảnh" });
      return;
    }
    const form = new FormData();
    form.set("name", name);
    form.set("file", file);
    const ok = await send({ method: "POST", body: form });
    if (ok) {
      setMsg({ tone: "ok", text: `Đã lưu ảnh cho ${name.trim()}` });
      setName("");
      setLink("");
    }
  }

  async function handleDelete(row: AdminWeaponImageRow) {
    setArming(null);
    const ok = await send(
      { method: "DELETE" },
      `?name=${encodeURIComponent(row.name)}`,
    );
    if (ok) {
      setMsg({
        tone: "ok",
        text: `Đã bỏ ${row.name} khỏi kho — card sẽ hiện lại tên thay cho ảnh`,
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleLink}
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Thêm ảnh vật phẩm
        </span>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] gap-3">
          <div>
            <label className={LABEL}>Tên vật phẩm</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="M200 Dominator"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Link ảnh từ wiki</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://static.wikia.nocookie.net/…/BI_M200_Dominator.png"
              className={FIELD}
            />
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-neutral-500">
          Mở trang súng trên wiki → chuột phải vào ảnh → <em>Copy image address</em> →
          dán vào đây. Máy chủ tự tải ảnh về, card đọc ảnh từ web mình chứ không
          mượn của người ta. Tên phải khớp tên gõ trong danh sách vật phẩm của tài
          khoản (không phân biệt hoa thường).
        </p>

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

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
          >
            {busy ? "Đang xử lý…" : "Tải từ link"}
          </button>

          {/* The disk route, for a picture on a host the server will not fetch
              from. Same row, because to the shop these are one job. */}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors text-[11px] font-black uppercase tracking-widest text-neutral-200"
          >
            <Upload size={13} />
            Chọn từ máy
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
        </div>
      </form>

      {/* What still has no picture. Without this the library is a list of what
          is done, with no way to see what is left — and the names come straight
          off the accounts, so this is the actual worklist. */}
      {missing.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Chưa có ảnh ({missingTotal})
          </span>
          <p className="mt-1 text-[11px] text-neutral-500">
            Vật phẩm đang được liệt kê trên tài khoản mà kho chưa có ảnh. Card hiện
            tên thay cho ảnh, vẫn bán được bình thường.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {missing.map((n) => (
              <button
                key={n}
                type="button"
                title="Điền tên này vào ô trên"
                onClick={() => setName(n)}
                className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-1 text-[11px] font-bold text-neutral-400 transition-colors hover:border-[var(--brand)]/50 hover:text-white"
              >
                {n}
              </button>
            ))}
            {missingTotal > missing.length ? (
              <span className="px-2 py-1 text-[11px] font-bold text-neutral-600">
                và {missingTotal - missing.length} cây nữa…
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Trong kho ({images.length})
            </span>
          </div>
          <ul>
            {images.map((row) => (
              <li
                key={row.name}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 border-b border-white/5 last:border-0"
              >
                <span className="relative h-8 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
                  <Image
                    src={row.url}
                    alt={row.name}
                    fill
                    sizes="56px"
                    className="object-contain p-0.5"
                  />
                </span>
                <span className="text-xs font-black text-white">{row.name}</span>
                <span className="text-[11px] text-neutral-600">
                  {row.width}×{row.height}
                  {row.sourceUrl ? " · từ link" : " · từ máy"}
                </span>

                {arming === row.name ? (
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(row)}
                      className="h-7 px-2.5 rounded-lg bg-red-500/90 hover:bg-red-500 disabled:opacity-60 transition-colors text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      Bỏ
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
                    title="Bỏ khỏi kho"
                    onClick={() => setArming(row.name)}
                    className="ml-auto p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
