"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Package, Pencil, Plus, Trash2 } from "lucide-react";

import {
  autoLabel,
  durationValid,
  formatDurationInline,
  splitDuration,
  toHours,
  type DurationChoice,
} from "@/lib/duration";

import { ConfirmDialog } from "./AdminStates";
import { DurationSelect } from "./DurationSelect";

export interface PackageRowView {
  id: string;
  label: string;
  price: number;
  durationHours: number | null;
  orderCount: number;
  keysAvailable: number;
  keysPending: number;
}

const CARD = "rounded-xl border border-zinc-200 bg-white p-5 flex flex-col gap-4";
const CARD_HEAD =
  "flex items-center gap-2 text-[12px] font-semibold text-zinc-500";
const FIELD =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400";
const LABEL =
  "block text-[12px] font-semibold text-zinc-500 mb-1.5";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * One tool's tiers and nothing else — the page the list's "Quản lý gói"
 * button opens.
 *
 * It used to land on the full product editor scrolled to the tier card, which
 * put the description, the cover and three rich editors between the shop and
 * the one errand it came for. Here the shelf is the whole page: add a tier,
 * read each one's stock at a glance, and step into a tier's own desk for the
 * keys and edits.
 */
export function AdminSoftwarePackages({
  code,
  packages,
}: {
  code: string;
  packages: PackageRowView[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [length, setLength] = useState("");
  const [unit, setUnit] = useState<DurationChoice>("day");

  /** Which row is open for editing, and the draft it holds. */
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editLength, setEditLength] = useState("");
  const [editUnit, setEditUnit] = useState<DurationChoice>("day");
  /** The tier whose delete is awaiting a yes. */
  const [removing, setRemoving] = useState<PackageRowView | null>(null);

  function startEdit(pkg: PackageRowView) {
    setMsg(null);
    setEditing(pkg.id);
    setEditLabel(pkg.label);
    setEditPrice(String(pkg.price));
    const split = splitDuration(pkg.durationHours);
    setEditLength(split.value);
    setEditUnit(split.unit);
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/software/packages", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editing,
          label: editLabel,
          price: Number(editPrice.replace(/\D/g, "")),
          durationHours: toHours(editLength, editUnit),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Lưu thất bại" });
        return;
      }
      setMsg({ tone: "ok", text: `Đã lưu gói ${editLabel}` });
      setEditing(null);
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function removePackage() {
    if (!removing) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/software/packages?id=${encodeURIComponent(removing.id)}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Xoá thất bại" });
        return;
      }
      setMsg({ tone: "ok", text: `Đã xoá gói ${removing.label}` });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  async function addPackage(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/software/packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Un-named tiers are called by their duration — "7 ngày", "Vĩnh
        // viễn". The box only overrides that when the shop typed something.
        body: JSON.stringify({
          code,
          label: label.trim() || autoLabel(length, unit),
          price: Number(price.replace(/\D/g, "")),
          durationHours: toHours(length, unit),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Thêm gói thất bại" });
        return;
      }
      setMsg({ tone: "ok", text: `Đã thêm gói ${label.trim() || autoLabel(length, unit)}` });
      setLabel("");
      setPrice("");
      setLength("");
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {msg ? (
        <p
          role={msg.tone === "err" ? "alert" : "status"}
          className={
            msg.tone === "ok"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12px] font-semibold text-emerald-600"
              : "rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-semibold text-rose-600"
          }
        >
          {msg.text}
        </p>
      ) : null}

      <form onSubmit={addPackage} className={CARD}>
        <span className={CARD_HEAD}>
          <Plus size={13} className="text-zinc-500" />
          Thêm gói mới
        </span>
        {/* Tên → thời hạn → giá → đơn vị, as the shop ordered them. "Vĩnh
            viễn" is a choice in the unit picker, never a blank number: a
            skipped box used to quietly sell lifetime access. The name label
            carries no hint — the placeholder typing itself out as a duration
            is entered already shows what a blank name becomes. items-end keeps
            the four boxes on one baseline either way. */}
        <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="new-label" className={LABEL}>
              Tên gói
            </label>
            <input
              id="new-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={autoLabel(length, unit) || "1 ngày"}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="new-length" className={LABEL}>
              Thời hạn
            </label>
            <input
              id="new-length"
              inputMode="numeric"
              value={unit === "forever" ? "" : length}
              disabled={unit === "forever"}
              onChange={(event) =>
                setLength(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder={unit === "forever" ? "Vĩnh viễn" : "7"}
              className={`${FIELD} tabular-nums disabled:opacity-50`}
            />
          </div>
          <div>
            <label htmlFor="new-price" className={LABEL}>
              Giá (đ)
            </label>
            <input
              id="new-price"
              required
              inputMode="numeric"
              value={price ? formatVnd(Number(price.replace(/\D/g, "") || "0")) : ""}
              onChange={(event) =>
                setPrice(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="50.000"
              className={`${FIELD} tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor="new-unit" className={LABEL}>
              Đơn vị
            </label>
            <DurationSelect id="new-unit" value={unit} onChange={setUnit} className={FIELD} />
          </div>
        </div>
        <button
          type="submit"
          disabled={
            busy ||
            !price.replace(/\D/g, "") ||
            !durationValid(length, unit) ||
            // A name is only demanded when there is no duration to mint one
            // from — and durationValid above already guarantees there is.
            !(label.trim() || autoLabel(length, unit))
          }
          className="self-start h-[34px] px-4 rounded-lg bg-zinc-900 hover:bg-zinc-700 disabled:opacity-60 text-[12px] font-semibold text-zinc-900 transition-colors inline-flex items-center gap-1.5"
        >
          <Plus size={12} />
          {busy ? "Đang thêm…" : "Thêm gói"}
        </button>
      </form>

      <section className={CARD}>
        <span className={CARD_HEAD}>
          <Package size={13} className="text-zinc-500" />
          Gói hiện có ({packages.length})
        </span>

        {packages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-[11px] text-zinc-500">
            Chưa có gói nào, khách không có gì để mua cho tới khi gói đầu tiên lên kệ.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {packages.map((pkg) =>
              editing === pkg.id ? (
                // The row opens where it stands rather than in a dialog: the
                // three things being changed are the three the row was already
                // showing, and the tiers around it are the context for whether
                // a price is right.
                <div
                  key={pkg.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5"
                >
                  <div className="min-w-[110px] flex-1">
                    <label htmlFor={`edit-label-${pkg.id}`} className={LABEL}>
                      Tên gói
                    </label>
                    <input
                      id={`edit-label-${pkg.id}`}
                      value={editLabel}
                      onChange={(event) => setEditLabel(event.target.value)}
                      className={FIELD}
                    />
                  </div>
                  <div className="w-24">
                    <label htmlFor={`edit-length-${pkg.id}`} className={LABEL}>
                      Thời hạn
                    </label>
                    <input
                      id={`edit-length-${pkg.id}`}
                      inputMode="numeric"
                      value={editUnit === "forever" ? "" : editLength}
                      disabled={editUnit === "forever"}
                      onChange={(event) =>
                        setEditLength(event.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder={editUnit === "forever" ? "∞" : "7"}
                      className={`${FIELD} tabular-nums disabled:opacity-50`}
                    />
                  </div>
                  <div className="w-28">
                    <label htmlFor={`edit-price-${pkg.id}`} className={LABEL}>
                      Giá (đ)
                    </label>
                    <input
                      id={`edit-price-${pkg.id}`}
                      inputMode="numeric"
                      value={
                        editPrice
                          ? formatVnd(Number(editPrice.replace(/\D/g, "") || "0"))
                          : ""
                      }
                      onChange={(event) =>
                        setEditPrice(event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      className={`${FIELD} tabular-nums`}
                    />
                  </div>
                  <DurationSelect
                    value={editUnit}
                    onChange={setEditUnit}
                    className={`${FIELD} w-24`}
                  />
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !editLabel.trim() ||
                      !editPrice.replace(/\D/g, "") ||
                      !durationValid(editLength, editUnit)
                    }
                    onClick={() => void saveEdit()}
                    className="h-[30px] px-3 rounded-lg bg-zinc-900 hover:bg-zinc-700 disabled:opacity-60 text-[12px] font-semibold text-zinc-900 transition-colors"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="h-[30px] px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-[12px] font-semibold text-zinc-700 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
              // Facts on the left in two quiet lines, the three verbs on the
              // right — the row used to run name, chips, price and buttons in
              // one strip, which put the price in the middle of the controls
              // and made every row read as clutter.
              <div
                key={pkg.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-zinc-900">
                    {pkg.label}
                    <span className="ml-2 text-[11px] font-semibold text-zinc-500">
                      {formatDurationInline(pkg.durationHours)}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span className="font-black tabular-nums text-rose-600">
                      {formatVnd(pkg.price)}đ
                    </span>
                    <span className="tabular-nums text-zinc-500">
                      {pkg.orderCount} đơn
                    </span>
                    {/* Amber when a paid customer is waiting on stock — the
                        one figure on this page that demands action. */}
                    <span
                      className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                        pkg.keysPending > 0 ? "text-amber-600" : "text-zinc-500"
                      }`}
                    >
                      <KeyRound size={10} aria-hidden />
                      {pkg.keysPending > 0
                        ? `nợ ${pkg.keysPending} key`
                        : `${pkg.keysAvailable} key trong kho`}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/admin/packages/${encodeURIComponent(pkg.id)}`}
                  className="h-7 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 inline-flex items-center gap-1"
                >
                  <KeyRound size={10} aria-hidden />
                  Quản lý license
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(pkg)}
                  aria-label={`Sửa gói ${pkg.label}`}
                  className="h-7 w-7 shrink-0 rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-30 text-zinc-500 hover:text-zinc-900 transition-colors inline-flex items-center justify-center"
                >
                  <Pencil size={12} />
                </button>
                {/* A sold tier cannot be deleted — orders point at the row —
                    so the button says so instead of opening a dialog that
                    would only come back with an error. */}
                <button
                  type="button"
                  disabled={busy || pkg.orderCount > 0}
                  title={
                    pkg.orderCount > 0
                      ? "Gói đã có đơn, sửa được nhưng không xóa được"
                      : "Xoá gói"
                  }
                  onClick={() => setRemoving(pkg)}
                  aria-label={`Xoá gói ${pkg.label}`}
                  className="h-7 w-7 shrink-0 rounded-lg border border-zinc-200 bg-white hover:border-rose-200 hover:bg-rose-50 disabled:opacity-30 disabled:hover:border-zinc-200 disabled:hover:bg-white text-zinc-500 hover:text-rose-600 disabled:hover:text-zinc-500 transition-colors inline-flex items-center justify-center"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              ),
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={removing !== null}
        danger
        pending={busy}
        title="Xoá gói?"
        body={
          removing
            ? `"${removing.label}" chưa có đơn hàng nào nên sẽ bị xoá hẳn cùng ${removing.keysAvailable} key đang nằm trong kho của nó. Không hoàn tác được.`
            : ""
        }
        confirmLabel="Xoá gói"
        onCancel={() => setRemoving(null)}
        onConfirm={() => void removePackage()}
      />
    </div>
  );
}
