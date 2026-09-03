"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Boxes,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  KeyRound,
  RotateCcw,
  Save,
  Swords,
  Tag,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import { deliversAutomatically } from "@/lib/accountLogin";

import { AdminError } from "./AdminStates";
import { RichTextEditor } from "./RichTextEditor";

/** The shelf behind an "acc random" listing, as the page reads it. */
export interface PoolView {
  available: number;
  sold: number;
  shelf: { id: string; value: string }[];
  recent: { id: string; value: string; when: string; buyer: string; orderCode: string }[];
}

export interface AccountDetailView {
  code: string;
  /** The shop's own title, or "" - the storefront then titles by rank/skins. */
  name: string;
  /** Where "Xem trang khách" goes — the product's one public address. */
  publicHref: string;
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
  /** The stored description lifted to editor HTML on the server — legacy
   *  plain text arrives already converted. */
  descriptionHtml: string;
  /** The sign-in handed to the buyer, "" where the shop has typed nothing. */
  loginUsername: string;
  loginPassword: string;
  loginNote: string;
  /** Whoever holds the account now — the latest paid order — or null on the shelf. */
  buyer: { username: string; orderCode: string } | null;
  /** "Acc random": sold by the piece from the shelf below. */
  accountPool: boolean;
  pool: PoolView | null;
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
  const [descHtml, setDescHtml] = useState(account.descriptionHtml);
  /** What the database holds; advanced on every successful save. */
  const [descBaseline, setDescBaseline] = useState(account.descriptionHtml);

  const [price, setPrice] = useState(String(account.price));
  const [status, setStatus] = useState(account.status);
  const [rank, setRank] = useState(account.rank);
  const [name, setName] = useState(account.name);
  const [tag, setTag] = useState(account.tag);
  const [vip, setVip] = useState(account.vip > 0 ? String(account.vip) : "");
  const [vipIngame, setVipIngame] = useState(
    account.vipIngame > 0 ? String(account.vipIngame) : "",
  );
  const [skinText, setSkinText] = useState(account.skinNames.join("\n"));
  const [characterText, setCharacterText] = useState(account.characterNames.join("\n"));
  const [gearText, setGearText] = useState(account.gearNames.join("\n"));

  const [loginUser, setLoginUser] = useState(account.loginUsername);
  const [loginPass, setLoginPass] = useState(account.loginPassword);
  const [loginNote, setLoginNote] = useState(account.loginNote);
  const [showPass, setShowPass] = useState(false);
  /** What the database holds; advanced on every successful save, so the
   *  status line and the save button describe the row and not the form. */
  const [loginBaseline, setLoginBaseline] = useState({
    username: account.loginUsername,
    password: account.loginPassword,
    note: account.loginNote,
  });

  const [poolOn, setPoolOn] = useState(account.accountPool);
  const [poolText, setPoolText] = useState("");

  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const statusMeta = STATUS_META[account.status] ?? STATUS_META.HIDDEN!;

  async function api(
    method: "PATCH" | "PUT" | "POST" | "DELETE",
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

  async function togglePool(next: boolean) {
    const data = await api("PATCH", { code: account.code, accountPool: next });
    if (!data) return;
    setPoolOn(next);
    setMsg({
      tone: "ok",
      text: next
        ? "Đã bật acc random — dán tài khoản vào kho bên dưới"
        : "Đã tắt acc random — sản phẩm là một tài khoản duy nhất",
    });
  }

  async function addToPool() {
    if (!poolText.trim()) return;
    const data = await api("POST", { code: account.code, block: poolText }, "", "/pool");
    if (!data) return;
    setPoolText("");
    const filled = Number(data.filled ?? 0);
    setMsg({
      tone: "ok",
      text: `Đã thêm ${Number(data.added ?? 0)} tài khoản vào kho${
        filled > 0 ? `, giao ngay ${filled} đơn đang chờ` : ""
      } — còn ${Number(data.available ?? 0)}`,
    });
  }

  async function removeFromPool(keyId: string) {
    const data = await api("DELETE", { code: account.code, keyId }, "", "/pool");
    if (data) setMsg({ tone: "ok", text: "Đã xoá cặp tài khoản khỏi kho" });
  }

  async function saveDescription() {
    const data = await api("PATCH", { code: account.code, description: descHtml });
    if (data) {
      setDescBaseline(descHtml);
      setMsg({ tone: "ok", text: "Đã lưu mô tả sản phẩm" });
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
    const data = await api("PATCH", {
      code: account.code,
      price: value,
      status,
      rank: rank.trim(),
      name: name.trim(),
    });
    if (data) setMsg({ tone: "ok", text: "Đã lưu thông tin" });
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

  async function saveLogin() {
    const next = {
      username: loginUser.trim(),
      password: loginPass.trim(),
      note: loginNote.trim(),
    };
    const data = await api("PATCH", {
      code: account.code,
      loginUsername: next.username,
      loginPassword: next.password,
      loginNote: next.note,
    });
    if (!data) return;
    setLoginUser(next.username);
    setLoginPass(next.password);
    setLoginNote(next.note);
    setLoginBaseline(next);
    setMsg({
      tone: "ok",
      text: next.username
        ? account.buyer
          ? `Đã lưu — ${account.buyer.username} thấy ngay trong Lịch sử mua`
          : "Đã lưu — giao tự động khi bán"
        : "Đã xoá thông tin đăng nhập khỏi tài khoản này",
    });
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

  // Everything this card's save sends - the button wakes when any of it
  // differs from what the server last gave us, not only the price.
  const infoChanged =
    Number(price.replace(/\D/g, "")) !== account.price ||
    status !== account.status ||
    rank.trim() !== account.rank ||
    name.trim() !== account.name;

  const loginChanged =
    loginUser.trim() !== loginBaseline.username ||
    loginPass.trim() !== loginBaseline.password ||
    loginNote.trim() !== loginBaseline.note;
  /** Whether the row holds a sign-in a buyer could use — both halves. */
  const loginStored = loginBaseline.username !== "" && loginBaseline.password !== "";

  // What the sign-in card says above its fields. The saved tag decides the
  // mode: NFA goes out by itself, anything else the shop hands over in person
  // and the fields here are its own record. Within NFA, the four combinations
  // of "is there one" and "is anyone holding the account" — never a to-do,
  // only what the buyer did and did not get.
  const autoDelivery = deliversAutomatically(account.tag);
  const loginStatus = !autoDelivery
    ? {
        tone: "border-indigo-500/25 bg-indigo-500/10 text-indigo-300",
        text: `Tag ${account.tag || "trống"} — bàn giao tay: khách được báo liên hệ shop, thông tin ở đây chỉ để shop tra cứu. Gắn tag NFA nếu muốn giao tự động.`,
      }
    : loginStored
      ? account.buyer
        ? {
            tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
            text: `Đã giao tự động cho ${account.buyer.username} (đơn ${account.buyer.orderCode}) — khách thấy trong Lịch sử mua.`,
          }
        : {
            tone: "border-white/10 bg-white/[0.03] text-neutral-300",
            text: "NFA — sẵn sàng: bán xong là khách nhận ngay trong Lịch sử mua, không cần bàn giao tay.",
          }
      : account.buyer
        ? {
            tone: "border-white/10 bg-white/[0.03] text-neutral-300",
            text: `Đã bán cho ${account.buyer.username} (đơn ${account.buyer.orderCode}) khi chưa có thông tin đăng nhập — nhập vào thì khách thấy trong Lịch sử mua.`,
          }
        : {
            tone: "border-amber-500/30 bg-amber-500/10 text-amber-400",
            text: "NFA chưa có thông tin đăng nhập — bán xong khách sẽ không nhận được gì tự động, phải liên hệ shop.",
          };

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
            {account.rank ? <span>Rank {account.rank}</span> : null}
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
          href={account.publicHref}
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
                <label htmlFor="acc-name" className={LABEL}>
                  Tên sản phẩm
                </label>
                <input
                  id="acc-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="ACC VIP FULL SKIN"
                  className={`${FIELD} w-52`}
                />
              </div>
              <div>
                <label htmlFor="acc-rank" className={LABEL}>
                  Rank
                </label>
                <input
                  id="acc-rank"
                  value={rank}
                  onChange={(event) => setRank(event.target.value)}
                  placeholder="GOLD 1"
                  className={`${FIELD} w-36`}
                />
              </div>
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
                disabled={busy || !infoChanged}
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
                <select
                  id="acc-tag"
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  className={`${FIELD} w-44`}
                >
                  <option value="" className="bg-neutral-900">
                    — không tag —
                  </option>
                  <option value="NFA" className="bg-neutral-900">
                    NFA
                  </option>
                  <option value="FULL THÔNG TIN" className="bg-neutral-900">
                    FULL THÔNG TIN
                  </option>
                </select>
              </div>
              <div>
                <label htmlFor="acc-vip" className={LABEL}>
                  VIP
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
                <label htmlFor="acc-vipingame" className={LABEL}>
                  VIP Ingame
                </label>
                <input
                  id="acc-vipingame"
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
          {/* "Acc random": the listing is a kind of account and the shelf
              under it holds every sign-in of that kind. Sold by the piece. */}
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Users size={13} className="text-neutral-400" />
              Acc random — bán theo số lượng
            </span>
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-300">
              <input
                type="checkbox"
                checked={poolOn}
                disabled={busy}
                onChange={(event) => togglePool(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span>
                Bật kho tài khoản: nhiều cặp tài khoản/mật khẩu cùng loại, khách chọn số
                lượng, giao tự động từ kho. Rank, ảnh, mô tả ở trang này là đặc điểm
                chung của cả kho.
              </span>
            </label>
            {poolOn ? (
              <>
                <div className="flex flex-wrap gap-3 text-[11px] font-bold">
                  <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-400">
                    Còn {account.pool?.available ?? 0} tài khoản
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-neutral-400">
                    Đã giao {account.pool?.sold ?? 0}
                  </span>
                </div>
                <div>
                  <label htmlFor="acc-pool-block" className={LABEL}>
                    Thêm vào kho — mỗi dòng một cặp
                  </label>
                  <textarea
                    id="acc-pool-block"
                    rows={5}
                    value={poolText}
                    onChange={(event) => setPoolText(event.target.value)}
                    spellCheck={false}
                    placeholder={"taikhoan1|matkhau1\ntaikhoan2 matkhau2\nemail@x.com:matkhau3"}
                    className={`${FIELD} resize-y font-mono`}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={busy || !poolText.trim()}
                      onClick={addToPool}
                      className={ACTION}
                    >
                      <Save size={12} />
                      Thêm vào kho
                    </button>
                    <span className="text-[11px] text-neutral-500">
                      Nhận dấu |, dấu :, tab hoặc khoảng trắng giữa tài khoản và mật khẩu.
                      Cặp trùng bị bỏ qua.
                    </span>
                  </div>
                </div>
                {account.pool && account.pool.shelf.length > 0 ? (
                  <div>
                    <span className={LABEL}>Trong kho (mới nhất {account.pool.shelf.length})</span>
                    <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                      {account.pool.shelf.map((key) => (
                        <li
                          key={key.id}
                          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-neutral-950/60 px-2.5 py-1.5"
                        >
                          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-neutral-200">
                            {key.value.replace("|", "  |  ")}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeFromPool(key.id)}
                            aria-label="Xoá cặp này"
                            className="shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:text-rose-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {account.pool && account.pool.recent.length > 0 ? (
                  <div>
                    <span className={LABEL}>Đã giao gần đây</span>
                    <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                      {account.pool.recent.map((key) => (
                        <li
                          key={key.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-white/[0.06] bg-neutral-950/40 px-2.5 py-1.5 text-[11px]"
                        >
                          <span className="min-w-0 flex-1 truncate font-mono text-neutral-400">
                            {key.value.replace("|", "  |  ")}
                          </span>
                          <span className="text-neutral-500">
                            {key.buyer ? `${key.buyer} · ` : ""}
                            {key.orderCode ? `${key.orderCode} · ` : ""}
                            {key.when}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-[11px] text-neutral-500">
                Tắt: sản phẩm là một tài khoản duy nhất, giao thông tin đăng nhập ở ô bên dưới.
              </p>
            )}
          </section>

          {/* First in the column: what the buyer is handed the moment they
              pay. Everything else here makes the account sell; this makes
              the sale complete without anyone touching it. */}
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <KeyRound size={13} className="text-neutral-400" />
              Thông tin đăng nhập giao khách
            </span>
            {poolOn ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-400">
                Acc random giao từ kho ở trên — ô này không dùng.
              </p>
            ) : null}
            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-[11px] font-semibold leading-relaxed ${loginStatus.tone}`}
            >
              {loginStatus.text}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="acc-login-user" className={LABEL}>
                  Tên đăng nhập
                </label>
                <input
                  id="acc-login-user"
                  value={loginUser}
                  onChange={(event) => setLoginUser(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="riot_user"
                  className={`${FIELD} font-mono`}
                />
              </div>
              <div>
                <label htmlFor="acc-login-pass" className={LABEL}>
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="acc-login-pass"
                    type={showPass ? "text" : "password"}
                    value={loginPass}
                    onChange={(event) => setLoginPass(event.target.value)}
                    autoComplete="new-password"
                    spellCheck={false}
                    placeholder="••••••••"
                    className={`${FIELD} pr-9 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="acc-login-note" className={LABEL}>
                Ghi chú bàn giao <span className="text-neutral-600">(không bắt buộc)</span>
              </label>
              <textarea
                id="acc-login-note"
                value={loginNote}
                onChange={(event) => setLoginNote(event.target.value)}
                rows={3}
                placeholder="Mail khôi phục, mã 2FA, lưu ý đổi mật khẩu…"
                className={`${FIELD} resize-y leading-relaxed`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy || !loginChanged}
                onClick={saveLogin}
                className={ACTION}
              >
                <Save size={12} />
                Lưu thông tin đăng nhập
              </button>
              {loginChanged ? (
                <span className="text-[11px] text-neutral-500">Có thay đổi chưa lưu</span>
              ) : null}
            </div>
            <p className="text-[11px] text-neutral-500">
              Acc tag NFA giao tự động: khách thanh toán xong là thấy ngay trong Lịch
              sử mua của họ. Tag khác bàn giao tay. Trang sản phẩm ngoài kệ không
              hiện. Cần cả tên đăng nhập lẫn mật khẩu; để trống cả hai rồi lưu để xoá.
            </p>
          </section>

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

        </div>
      </div>


      {/* Full width below the grid — prose wants room the columns don't have.
          Same card the software desk has: an account with a story (full access,
          mail gốc, cam kết) deserves the same editor a tool gets. */}
      <section className={CARD}>
        <span className={CARD_HEAD}>
          <FileText size={13} className="text-neutral-400" />
          Mô tả sản phẩm
        </span>
        <RichTextEditor initialHtml={account.descriptionHtml} onUpdate={setDescHtml} />
        <p className="text-[11px] text-neutral-500">
          Có nội dung ở đây thì card ngoài danh mục và panel mua hiện lời này
          (rút thành chữ thường). Để trống rồi lưu thì quay về câu mặc định.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || descHtml === descBaseline}
            onClick={saveDescription}
            className={ACTION}
          >
            <Save size={12} />
            Lưu mô tả
          </button>
          {descHtml !== descBaseline ? (
            <span className="text-[11px] text-neutral-500">Có thay đổi chưa lưu</span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
