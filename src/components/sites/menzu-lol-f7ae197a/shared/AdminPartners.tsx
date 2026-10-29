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
  "w-full rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400";
const LABEL = "block text-[12px] font-semibold text-zinc-500 mb-1.5";
const ICON_BUTTON =
  "h-8 w-8 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-zinc-100 text-zinc-700 transition-colors inline-flex items-center justify-center";

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
      setMsg({ tone: "ok", text: "Đã tải logo, bấm Thêm để lưu đối tác" });
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
        className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col gap-4"
      >
        <span className="text-[12px] font-semibold text-zinc-500">
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
              Mô tả ngắn <span className="text-zinc-400">(dưới logo)</span>
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
              Link <span className="text-zinc-400">(không bắt buộc)</span>
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
          <div className="relative h-12 w-[110px] shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="max-h-9 max-w-[96px] object-contain" />
            ) : (
              <span className="text-[12px] font-bold text-zinc-300">
                Chưa có logo
              </span>
            )}
          </div>
          <label
            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 ${
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
          <span className="text-[10px] text-zinc-400">
            PNG / JPG / WebP · nền trong suốt nhìn đẹp nhất · không logo thì hiện tên
          </span>
        </div>

        {msg ? (
          <p
            role="alert"
            className={
              msg.tone === "ok"
                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12px] font-semibold text-emerald-600"
                : "rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-semibold text-rose-600"
            }
          >
            {msg.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="self-start h-10 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 transition-colors text-[13px] font-semibold text-white"
        >
          {busy ? "Đang xử lý…" : "Thêm đối tác"}
        </button>
      </form>

      {partners.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500">
          Chưa có đối tác nào, mục &ldquo;Đối tác uy tín&rdquo; đang ẩn trên trang chủ.
        </p>
      ) : (
        <ul className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          {partners.map((p, index) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3 border-b border-zinc-200 last:border-0"
            >
              <div className="h-10 w-[92px] shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt="" className="max-h-7 max-w-[80px] object-contain" />
                ) : (
                  <span className="text-[12px] font-bold text-zinc-400">chữ</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900 truncate">
                  {p.name}
                  {p.tagline ? (
                    <span className="ml-2 text-[11px] font-semibold text-zinc-500">
                      {p.tagline}
                    </span>
                  ) : null}
                </p>
                {p.url ? (
                  <p className="text-[11px] text-zinc-500 truncate">{p.url}</p>
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
                className="p-2 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition-colors"
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
