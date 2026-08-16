"use client";

import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface AdminPartnerRow {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  url: string | null;
}

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const ICON_BUTTON =
  "h-8 w-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-neutral-300 transition-colors inline-flex items-center justify-center";

/**
 * The "Đối tác uy tín" strip's contents: add, reorder, retire.
 *
 * Order is the order the marquee cycles in, which is why the arrows are here
 * at all. The strip on the home page hides itself while this list is empty.
 */
export function AdminPartners({ partners }: { partners: AdminPartnerRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [url, setUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function call(
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, unknown> | null,
    query = "",
  ) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/partners${query}`, {
        method,
        ...(payload
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            }
          : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Thao tác thất bại" });
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

  async function uploadLogo(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/partners/image", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setMsg({ tone: "err", text: data.error ?? "Tải logo thất bại" });
        return;
      }
      setLogoUrl(data.url);
      setMsg({ tone: "ok", text: "Đã tải logo — bấm Thêm để lưu đối tác" });
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const ok = await call("POST", { name, tagline, url, logoUrl });
    if (ok) {
      setMsg({ tone: "ok", text: `Đã thêm ${name.trim()}` });
      setName("");
      setTagline("");
      setUrl("");
      setLogoUrl("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Thêm đối tác
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="pt-name" className={LABEL}>
              Tên đối tác
            </label>
            <input
              id="pt-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Riot Games"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="pt-tagline" className={LABEL}>
              Mô tả ngắn <span className="text-neutral-600">(dưới logo)</span>
            </label>
            <input
              id="pt-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ví điện tử"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="pt-url" className={LABEL}>
              Link <span className="text-neutral-600">(không bắt buộc)</span>
            </label>
            <input
              id="pt-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className={FIELD}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative h-12 w-[110px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 flex items-center justify-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="max-h-9 max-w-[96px] object-contain" />
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-700">
                Chưa có logo
              </span>
            )}
          </div>
          <label
            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-colors hover:bg-white/10 ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <ImagePlus size={13} />
            {uploading ? "Đang tải…" : "Chọn logo từ máy"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadLogo(file);
              }}
            />
          </label>
          <span className="text-[10px] text-neutral-600">
            PNG / JPG / WebP · nền trong suốt nhìn đẹp nhất · không logo thì hiện tên
          </span>
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
          disabled={busy || !name.trim()}
          className="self-start h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-50 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          {busy ? "Đang xử lý…" : "Thêm đối tác"}
        </button>
      </form>

      {partners.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-neutral-500">
          Chưa có đối tác nào — mục &ldquo;Đối tác uy tín&rdquo; đang ẩn trên trang chủ.
        </p>
      ) : (
        <ul className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
          {partners.map((p, index) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.07] last:border-0"
            >
              <div className="h-10 w-[92px] shrink-0 rounded-lg border border-white/10 bg-neutral-950 flex items-center justify-center overflow-hidden">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt="" className="max-h-7 max-w-[80px] object-contain" />
                ) : (
                  <span className="text-[9px] font-bold uppercase text-neutral-600">chữ</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">
                  {p.name}
                  {p.tagline ? (
                    <span className="ml-2 text-[11px] font-semibold text-neutral-500">
                      {p.tagline}
                    </span>
                  ) : null}
                </p>
                {p.url ? (
                  <p className="text-[11px] text-neutral-500 truncate">{p.url}</p>
                ) : null}
              </div>

              <button
                type="button"
                aria-label={`Đưa ${p.name} lên trước`}
                disabled={busy || index === 0}
                onClick={() => call("PATCH", { id: p.id, action: "move", direction: "up" })}
                className={ICON_BUTTON}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label={`Đưa ${p.name} xuống sau`}
                disabled={busy || index === partners.length - 1}
                onClick={() => call("PATCH", { id: p.id, action: "move", direction: "down" })}
                className={ICON_BUTTON}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                aria-label={`Xoá ${p.name}`}
                disabled={busy}
                onClick={() => call("DELETE", null, `?id=${encodeURIComponent(p.id)}`)}
                className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
