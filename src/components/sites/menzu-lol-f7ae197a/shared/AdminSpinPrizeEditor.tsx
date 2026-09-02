"use client";

import { useRouter } from "next/navigation";
import { ImagePlus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  DESCRIPTION_MAX,
  maxShortLength,
  VOUCHER_DAYS_DEFAULT,
  MIN_SLICES,
  PRIZE_KINDS,
  PRIZE_KIND_LABEL,
  readWedgeColor,
  wedgeSwatch,
  WEDGE_COLOR_KEYS,
  WEDGE_COLORS,
  type Prize,
  type PrizeKind,
  type WedgeColor,
} from "@/lib/spin";

import { ConfirmDialog } from "./AdminStates";
import { SpinWheelFace } from "./SpinWheelFace";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-sm text-white outline-none transition-colors placeholder-neutral-600 focus:border-[var(--brand)]/60";
const LABEL =
  "mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-500";
const HINT = "mt-1.5 text-[11px] leading-relaxed text-neutral-500";
const ACTION =
  "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[11px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/**
 * One slice of the wheel, on its own page.
 *
 * The odds are shown as a percentage beside the weight and recomputed as it is
 * typed, because a weight of 7 means nothing on its own — the shop is tuning
 * "how often", and the number it actually cares about is the one the customer
 * reads on the odds table.
 *
 * The whole table travels with the save. Every rule that could refuse this
 * slice is a fact about the table it sits in — how many wedges there are, what
 * the other ids are — so the route rebuilds and checks the lot rather than
 * trusting a row in isolation.
 */
export function AdminSpinPrizeEditor({
  prize,
  /** Its id when the page opened. Renaming moves the slice; this is how. */
  was,
  /** Every other slice's weight, for the odds this one works out to. */
  otherWeight,
  sliceCount,
  isNew,
  siblings,
  editingIndex,
}: {
  prize: Prize & { exchangePoints?: number | null; voucherDays?: number | null };
  was: string;
  otherWeight: number;
  sliceCount: number;
  isNew: boolean;
  /** The rest of the wheel, in order, so the preview is the whole wheel and
   *  not this slice on its own — a label only fits or does not fit relative to
   *  how many wedges there are. */
  siblings: (Prize & { exchangePoints?: number | null; voucherDays?: number | null })[];
  /** Where this one sits among them. */
  editingIndex: number;
}) {
  const router = useRouter();
  const [id, setId] = useState(prize.id);
  const [label, setLabel] = useState(prize.label);
  const [short, setShort] = useState(prize.short);
  const [description, setDescription] = useState(prize.description ?? "");
  const [kind, setKind] = useState<PrizeKind>(prize.kind);
  const [amount, setAmount] = useState(String(prize.amount));
  const [image, setImage] = useState(prize.image ?? "");
  const [weight, setWeight] = useState(String(prize.weight));
  const [color, setColor] = useState<WedgeColor>(readWedgeColor(prize.color));

  /** Wraps a setter so the "đã lưu" line disappears the moment anything is
   *  typed: it describes the last save, and a stale tick beside a changed
   *  field is a lie about what is stored. */
  function edit<T>(set: (v: T) => void) {
    return (v: T) => {
      setSaved(false);
      set(v);
    };
  }
  const [voucherDays, setVoucherDays] = useState(
    String(prize.voucherDays ?? VOUCHER_DAYS_DEFAULT),
  );
  const [exchange, setExchange] = useState(
    prize.exchangePoints == null ? "" : String(prize.exchangePoints),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A slice the reader pressed while this one has unsaved changes. */
  const [leaving, setLeaving] = useState<Prize | null>(null);
  const [saved, setSaved] = useState(false);

  const w = Number(weight) || 0;
  const share = otherWeight + w > 0 ? (w / (otherWeight + w)) * 100 : 0;
  const room = maxShortLength(sliceCount, image.trim() !== "");
  const over = short.trim().length > room;
  const unit = PRIZE_KIND_LABEL[kind].unit;

  /**
   * Sends the picture and keeps the path it answers with.
   *
   * Nothing is saved by this: the prize still has to be saved, so a shop that
   * picks the wrong file and leaves has changed nothing. The wedge beside it
   * redraws immediately either way, which is the point of choosing here.
   */
  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/admin/spin-prizes/image", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Không tải được ảnh");
        return;
      }
      setImage(data.url);
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/spin-prizes", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          was,
          prize: {
            id,
            label,
            short,
            description,
            kind,
            amount: Number(amount) || 0,
            image,
            color,
            exchangePoints: exchange.trim() === "" ? null : Number(exchange),
            voucherDays: Number(voucherDays) || VOUCHER_DAYS_DEFAULT,
            weight: Number(weight) || 0,
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Không lưu được");
        return;
      }
      setSaved(true);
      // Stays on the slice. Pressing save and being thrown back to the list is
      // the wrong answer to "I want to keep working on this one" — the list is
      // one press away either side.
      //
      // A renamed slice moves house, though: the address in the bar still
      // names the old id, and a refresh there would 404. replace, not push, so
      // Back does not walk into that dead address.
      if (id.trim().toLowerCase() !== was) {
        router.replace(`/admin/spin/${id.trim().toLowerCase()}`);
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/spin-prizes", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: was }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Không xoá được");
        return;
      }
      router.push("/admin/operations?tab=spin");
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  // Rebuilt on every keystroke from the form, not from the saved row: the
  // point of the preview is to show what has not been saved yet.
  const draft: Prize = {
    id: id.trim() || was,
    label,
    short,
    ...(description.trim() ? { description: description.trim() } : {}),
    kind,
    amount: Number(amount) || 0,
    weight: Number(weight) || 1,
    color,
    ...(image.trim() ? { image: image.trim() } : {}),
  };
  const wheel = siblings.map((p, i) => (i === editingIndex ? draft : p));

  // Compared against what the page opened with. Typing then pressing another
  // wedge is the one way to lose work here, and it is an easy press to make by
  // accident when the wheel is right there beside the fields.
  const dirty =
    id !== prize.id ||
    label !== prize.label ||
    short !== prize.short ||
    description !== (prize.description ?? "") ||
    kind !== prize.kind ||
    amount !== String(prize.amount) ||
    image !== (prize.image ?? "") ||
    weight !== String(prize.weight) ||
    color !== readWedgeColor(prize.color);

  function go(next: Prize, index: number) {
    if (index === editingIndex) return;
    if (dirty) {
      setLeaving(next);
      return;
    }
    router.push(`/admin/spin/${next.id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="prize-label" className={LABEL}>
            Tên đầy đủ
          </label>
          <input
            id="prize-label"
            value={label}
            onChange={(e) => edit(setLabel)(e.target.value)}
            placeholder="+2.000đ"
            className={FIELD}
          />
          <p className={HINT}>
            Hiện trong bảng cơ cấu giải thưởng và trên thẻ báo trúng.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="prize-desc" className={LABEL}>
            Mô tả phần quà (tuỳ chọn)
          </label>
          <textarea
            id="prize-desc"
            value={description}
            onChange={(e) => edit(setDescription)(e.target.value.slice(0, DESCRIPTION_MAX))}
            rows={2}
            placeholder="Pad chuột cỡ lớn 90×40cm, viền khâu, in logo shop."
            className={`${FIELD} resize-y leading-relaxed`}
          />
          <p className={HINT}>
            Hiện ở danh sách phần thưởng và trên thẻ báo trúng — không in lên nan,
            nan chỉ vừa vài chữ. {description.trim().length}/{DESCRIPTION_MAX}
          </p>
        </div>

        <div>
          <label htmlFor="prize-short" className={LABEL}>
            Chữ in trên nan bánh xe
          </label>
          <input
            id="prize-short"
            value={short}
            onChange={(e) => edit(setShort)(e.target.value)}
            placeholder="+2.000đ"
            className={`${FIELD} ${over ? "border-rose-500/60" : ""}`}
          />
          <p className={HINT}>
            <span className={over ? "font-bold text-rose-400" : "text-neutral-400"}>
              {short.trim().length}/{room} ký tự
            </span>{" "}
            — nan hẹp dần khi vòng quay nhiều ô, và hẹp thêm nữa nếu ô có ảnh.
          </p>
        </div>

        <div>
          <label htmlFor="prize-id" className={LABEL}>
            Mã phần quà
          </label>
          <input
            id="prize-id"
            value={id}
            onChange={(e) => edit(setId)(e.target.value)}
            placeholder="cash-2k"
            className={`${FIELD} font-mono`}
          />
          <p className={HINT}>
            Chữ thường, số và gạch ngang. Đổi mã thì lượt trúng cũ vẫn giữ
            nguyên tên và giá trị đã hứa lúc quay.
          </p>
        </div>

        <div>
          <label htmlFor="prize-kind" className={LABEL}>
            Loại phần quà
          </label>
          <select
            id="prize-kind"
            value={kind}
            onChange={(e) => edit(setKind)(e.target.value as PrizeKind)}
            className={FIELD}
          >
            {PRIZE_KINDS.map((k) => (
              <option key={k} value={k} className="bg-neutral-900">
                {PRIZE_KIND_LABEL[k].label}
              </option>
            ))}
          </select>
          <p className={HINT}>
            {kind === "ITEM"
              ? "Quà tặng phải gửi tay — mỗi lượt trúng hiện ở mục Quà cần gửi."
              : kind === "NOTHING"
                ? "Ô trượt, không cộng gì cho khách."
                : kind === "VOUCHER"
                  ? "Sinh mã giảm giá riêng cho người trúng, ngay khi quay xong."
                  : "Cộng thẳng cho khách ngay khi quay xong."}
          </p>
        </div>

        <div>
          <label htmlFor="prize-amount" className={LABEL}>
            Giá trị {unit ? `(${unit})` : ""}
          </label>
          <input
            id="prize-amount"
            type="number"
            min={0}
            step={1}
            value={amount}
            onChange={(e) => edit(setAmount)(e.target.value)}
            disabled={unit === null}
            className={`${FIELD} disabled:opacity-40`}
          />
          <p className={HINT}>
            {unit === null
              ? "Loại này không dùng tới giá trị."
              : kind === "VOUCHER"
                ? "Phần trăm giảm, từ 1 đến 100."
                : "Phải lớn hơn 0 — một ô hứa thưởng mà cộng 0 là ô trượt đội lốt."}
          </p>
        </div>

        <div>
          <label htmlFor="prize-weight" className={LABEL}>
            Tỉ lệ
          </label>
          <input
            id="prize-weight"
            type="number"
            min={1}
            step={1}
            value={weight}
            onChange={(e) => edit(setWeight)(e.target.value)}
            className={FIELD}
          />
          <p className={HINT}>
            Số càng lớn càng hay ra. Với các ô còn lại, ô này trúng khoảng{" "}
            <b className="text-[var(--brand)]">{share.toFixed(1)}%</b>.
          </p>
        </div>

        {kind === "VOUCHER" ? (
          <div className="sm:col-span-2">
            <label htmlFor="prize-vdays" className={LABEL}>
              Mã dùng được trong bao nhiêu ngày
            </label>
            <input
              id="prize-vdays"
              type="number"
              min={1}
              max={365}
              step={1}
              value={voucherDays}
              onChange={(e) => edit(setVoucherDays)(e.target.value)}
              className={`${FIELD} max-w-xs`}
            />
            <p className={HINT}>
              Mỗi lượt trúng sinh <b className="text-neutral-300">một mã riêng</b>,
              dùng được một lần. Một mã chung ai cũng xài được thì không còn là
              phần thưởng, mà là giảm giá cả shop.
            </p>
          </div>
        ) : null}

        {kind === "ITEM" ? (
          <div className="sm:col-span-2">
            <label htmlFor="prize-exchange" className={LABEL}>
              Đổi lại được bao nhiêu điểm (tuỳ chọn)
            </label>
            <input
              id="prize-exchange"
              type="number"
              min={1}
              step={1}
              value={exchange}
              onChange={(e) => edit(setExchange)(e.target.value)}
              placeholder="Bỏ trống nếu không cho đổi"
              className={`${FIELD} max-w-xs`}
            />
            <p className={HINT}>
              Khách trúng món này mà không có nhu cầu thì đổi lại lấy chừng này
              điểm để quay tiếp. Bỏ trống thì không cho đổi — shop gửi tận nơi.
            </p>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <span className={LABEL}>Màu nan</span>
          <div
            role="radiogroup"
            aria-label="Màu nan"
            className="flex flex-wrap items-center gap-2"
          >
            {WEDGE_COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={color === key}
                aria-label={WEDGE_COLORS[key].label}
                title={WEDGE_COLORS[key].label}
                onClick={() => edit(setColor)(key)}
                // A ring rather than a border on the chosen one: a border
                // would move the dot by a pixel and the row would twitch on
                // every click.
                style={wedgeSwatch(key)}
                className={`h-7 w-7 rounded-full border border-white/10 transition-all ${
                  color === key
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#0e0e11]"
                    : "opacity-70 hover:opacity-100"
                }`}
              />
            ))}
          </div>
          <p className={HINT}>
            {color === "auto"
              ? "Tự động: nan xen kẽ hai màu tối, ô hiếm tô tím — đúng như vòng quay vẫn chạy."
              : `Nan này tô ${WEDGE_COLORS[color].label.toLowerCase()}. Xem thử ở bánh xe bên phải.`}
          </p>
        </div>

        <div className="sm:col-span-2">
          <span className={LABEL}>Ảnh trong nan (tuỳ chọn)</span>
          <div className="flex flex-wrap items-center gap-3">
            {/* The thumbnail on the shop's own dark ground, not on white: a
                logo with a transparent background looks fine on paper and
                disappears into the wedge, and this is where that shows. */}
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#141419]">
              {image.trim() ? (
                // Plain img: the path is whatever the shop uploaded a moment
                // ago, and next/image would want it declared in the config.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.trim()}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImagePlus size={18} className="text-neutral-700" />
              )}
            </span>

            <label
              className={`${ACTION} cursor-pointer border border-white/12 bg-white/[0.04] text-neutral-300 hover:border-[var(--brand)]/50 hover:text-white ${
                uploading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <ImagePlus size={13} />
              {uploading ? "Đang tải…" : image.trim() ? "Đổi ảnh" : "Chọn ảnh từ máy"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) void upload(picked);
                  e.target.value = "";
                }}
              />
            </label>

            {image.trim() ? (
              <button
                type="button"
                onClick={() => edit(setImage)("")}
                className={`${ACTION} border border-white/12 bg-white/[0.04] text-neutral-400 hover:border-rose-500/40 hover:text-rose-300`}
              >
                <Trash2 size={13} />
                Bỏ ảnh
              </button>
            ) : null}
          </div>
          <p className={HINT}>
            PNG, JPG hoặc WebP · tối đa 5MB. Nền trong suốt hiện đẹp nhất trên
            nan. Có ảnh thì chữ bị đẩy xuống gần trục, còn ít chỗ hơn — số ký tự
            ở trên tự trừ theo.
          </p>
          {image.trim() ? (
            <p className="mt-1 truncate font-mono text-[10px] text-neutral-600">
              {image.trim()}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-300">
          Đã lưu. Vòng quay ngoài trang khách đổi theo ngay — bạn vẫn đang ở nan
          này, sửa tiếp được.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className={`${ACTION} bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]`}
        >
          <Save size={13} />
          {isNew ? "Thêm vào vòng quay" : "Lưu ô này"}
        </button>
        {isNew ? null : (
          <button
            type="button"
            disabled={busy || sliceCount <= MIN_SLICES}
            onClick={remove}
            title={
              sliceCount <= MIN_SLICES
                ? `Vòng quay phải còn ít nhất ${MIN_SLICES} ô`
                : "Xoá ô này khỏi vòng quay"
            }
            className={`${ACTION} border border-white/12 bg-white/[0.04] text-neutral-400 hover:border-rose-500/40 hover:text-rose-300`}
          >
            <Trash2 size={13} />
            Xoá ô này
          </button>
        )}
      </div>
      </div>

      {/* The customer's own wheel, drawn from the boxes on the left. Sticky so
          it stays put while the fields are worked through, and still rather
          than spinning — a wheel that turned while it was being typed into
          would show the reader everything except the thing they changed. */}
      <aside className="lg:sticky lg:top-6">
        <span className={LABEL}>Xem trước</span>
        <div className="rounded-xl border border-white/[0.08] bg-[#0b0b10] p-4">
          <SpinWheelFace
            prizes={wheel}
            onSlice={go}
            className="h-auto w-full rounded-full border-4 border-white/10"
          />
          <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
            Đây là bánh xe khách nhìn thấy, không thêm không bớt — vẽ bằng đúng
            đoạn mã vẽ bánh xe thật, nên chữ tràn nan ở đây thì trang khách cũng
            tràn. <b className="text-neutral-300">Bấm vào nan khác</b> để sửa
            ngay nan đó.
          </p>
        </div>
      </aside>

      <ConfirmDialog
        open={leaving !== null}
        title="Bỏ thay đổi chưa lưu?"
        body={`Nan "${prize.label}" đang có thay đổi chưa lưu. Sang nan "${leaving?.label ?? ""}" thì mất.`}
        confirmLabel="Sang nan đó"
        danger
        onConfirm={() => {
          const next = leaving;
          setLeaving(null);
          if (next) router.push(`/admin/spin/${next.id}`);
        }}
        onCancel={() => setLeaving(null)}
      />
    </div>
  );
}
