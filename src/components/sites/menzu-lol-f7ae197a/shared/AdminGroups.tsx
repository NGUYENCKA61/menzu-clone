"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  LayoutGrid,
  type LucideIcon,
  Plus,
  Tags,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminError, ConfirmDialog } from "./AdminStates";

export interface GroupCategoryOption {
  id: string;
  name: string;
  productCount: number;
}

export interface AdminGroupRow {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  categoryIds: string[];
}

const FIELD =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400";
const LABEL = "block text-[12px] font-semibold text-zinc-500 mb-1.5";
const ICON_BUTTON =
  "h-7 w-7 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-white text-zinc-500 hover:text-zinc-900 transition-colors inline-flex items-center justify-center";
/** The trash cans: quiet until hovered, then unmistakably red. */
const DANGER_BUTTON =
  "h-7 w-7 rounded-lg border border-zinc-200 bg-white hover:border-rose-200 hover:bg-rose-50 disabled:opacity-30 text-zinc-500 hover:text-rose-600 transition-colors inline-flex items-center justify-center";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tint: string;
}) {
  const idle = value === "0";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-zinc-500">
          {label}
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500`}>
          <Icon size={15} />
        </span>
      </div>
      <span
        className={`text-[26px] font-black leading-none tabular-nums ${
          idle ? "text-zinc-400" : "text-zinc-900"
        }`}
      >
        {value}
      </span>
      <span className="text-[11px] text-zinc-500">{sub}</span>
    </div>
  );
}

/**
 * The rows of category tiles on the home page, and which categories each one
 * shows.
 *
 * A group holds no categories of its own — it points at the ones the shop
 * already has. Putting Valorant in a second group adds a line to the join
 * table; it does not copy the category, so its products, its stock count and
 * its URL stay in one place however many rows it appears in. That is why this
 * screen only ever ticks boxes and never offers to create a category.
 */
export function AdminGroups({
  groups,
  categories,
}: {
  groups: AdminGroupRow[];
  categories: GroupCategoryOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [removing, setRemoving] = useState<AdminGroupRow | null>(null);

  async function send(method: "POST" | "PUT" | "DELETE", body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/groups", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Không lưu được nhóm");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Không kết nối được máy chủ");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(group: AdminGroupRow, categoryId: string) {
    const next = group.categoryIds.includes(categoryId)
      ? group.categoryIds.filter((id) => id !== categoryId)
      : [...group.categoryIds, categoryId];
    await send("PUT", { id: group.id, categoryIds: next });
  }

  async function moveCategory(group: AdminGroupRow, index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= group.categoryIds.length) return;
    const next = [...group.categoryIds];
    [next[index], next[target]] = [next[target]!, next[index]!];
    await send("PUT", { id: group.id, categoryIds: next });
  }

  async function moveGroup(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= groups.length) return;
    // Swap the two sort values rather than renumbering the list.
    await send("PUT", { id: groups[index]!.id, sortOrder: groups[target]!.sortOrder });
    await send("PUT", { id: groups[target]!.id, sortOrder: groups[index]!.sortOrder });
  }

  const byId = new Map(categories.map((category) => [category.id, category]));

  const activeCount = groups.filter((group) => group.isActive).length;
  const usedIds = new Set(groups.flatMap((group) => group.categoryIds));
  const usedCount = categories.filter((category) => usedIds.has(category.id)).length;
  const orphanCount = categories.length - usedCount;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Nhóm danh mục"
          value={String(groups.length)}
          sub="hàng hiển thị trên trang chủ"
          icon={LayoutGrid}
          tint="border-indigo-200 bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Đang hiện"
          value={String(activeCount)}
          sub={
            groups.length === 0
              ? "chưa có nhóm nào"
              : activeCount === groups.length
                ? "tất cả nhóm đều đang hiện"
                : `${groups.length - activeCount} nhóm đang ẩn`
          }
          icon={Eye}
          tint="border-emerald-200 bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Đã xếp nhóm"
          value={String(usedCount)}
          sub={`trên tổng ${categories.length} danh mục`}
          icon={Tags}
          tint="border-violet-200 bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Chưa vào nhóm"
          value={String(orphanCount)}
          sub={orphanCount > 0 ? "khách không thấy các mục này" : "mọi danh mục đều có mặt"}
          icon={TriangleAlert}
          tint={
            orphanCount > 0
              ? "border-amber-200 bg-amber-50 text-amber-600"
              : "border-zinc-200 bg-zinc-50 text-zinc-500"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Plus
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && newName.trim() && !busy) {
                void (async () => {
                  if (await send("POST", { name: newName })) setNewName("");
                })();
              }
            }}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3.5 text-[13px] text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
            placeholder="Tên nhóm mới, ví dụ: Hot trending tháng này"
          />
        </div>
        <button
          type="button"
          disabled={busy || !newName.trim()}
          onClick={async () => {
            if (await send("POST", { name: newName })) {
              setNewName("");
            }
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          <Plus size={14} />
          Thêm nhóm
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-[12px] text-zinc-500">
          Chưa có nhóm nào. Trang chủ sẽ không hiện hàng danh mục nào cả.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group, index) => (
        <section
          key={group.id}
          className={`overflow-hidden rounded-xl border border-zinc-200 bg-white transition-opacity ${group.isActive ? "" : "opacity-70"}`}
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-5 py-4">
            {/* The row's face: which slot on the home page this group holds. */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
              <LayoutGrid size={15} />
            </span>
            <div className="min-w-[200px] flex-1">
              <span className={LABEL}>
                Nhóm #{index + 1}
                <span
                  className={`ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] font-semibold ${
                    group.isActive
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-500"
                  }`}
                >
                  {group.isActive ? <Eye size={9} /> : <EyeOff size={9} />}
                  {group.isActive ? "Đang hiện" : "Đang ẩn"}
                </span>
              </span>
              <input
                defaultValue={group.name}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value && value !== group.name) {
                    void send("PUT", { id: group.id, name: value });
                  }
                }}
                aria-label={`Tên nhóm ${group.name}`}
                className={FIELD}
              />
            </div>
            <button
              type="button"
              disabled={index === 0 || busy}
              onClick={() => moveGroup(index, -1)}
              aria-label={`Đưa ${group.name} lên trên`}
              className={ICON_BUTTON}
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              disabled={index === groups.length - 1 || busy}
              onClick={() => moveGroup(index, 1)}
              aria-label={`Đưa ${group.name} xuống dưới`}
              className={ICON_BUTTON}
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRemoving(group)}
              aria-label={`Xóa nhóm ${group.name}`}
              className={DANGER_BUTTON}
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div className="flex flex-col gap-4 p-5">
          <label className="flex cursor-pointer flex-wrap items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5">
            <input
              type="checkbox"
              checked={group.isActive}
              onChange={(event) => send("PUT", { id: group.id, isActive: event.target.checked })}
              className="h-4 w-4 shrink-0 accent-zinc-900"
            />
            <span className="text-xs font-bold text-zinc-900">Hiện trên trang chủ</span>
            <span className="text-[11px] text-zinc-500">, tắt vẫn giữ nguyên nhóm và các danh mục đã chọn
            </span>
          </label>

          <div>
            <span className={LABEL}>Danh mục trong nhóm ({group.categoryIds.length})</span>
            {group.categoryIds.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-3 text-[11px] text-zinc-500">
                Chưa chọn danh mục nào, nhóm này sẽ không hiện trên trang chủ.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {group.categoryIds.map((categoryId, position) => {
                  const category = byId.get(categoryId);
                  return (
                    <div
                      key={categoryId}
                      className="flex items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 transition-colors hover:border-zinc-200"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-[10px] font-black tabular-nums text-zinc-500">
                        {position + 1}
                      </span>
                      <span className="flex-1 truncate text-xs font-bold text-zinc-900">
                        {category?.name ?? categoryId}
                      </span>
                      <span className="shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-500">
                        {category?.productCount ?? 0} sp
                      </span>
                      <button
                        type="button"
                        disabled={position === 0 || busy}
                        onClick={() => moveCategory(group, position, -1)}
                        aria-label="Lên trên"
                        className={ICON_BUTTON}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={position === group.categoryIds.length - 1 || busy}
                        onClick={() => moveCategory(group, position, 1)}
                        aria-label="Xuống dưới"
                        className={ICON_BUTTON}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleCategory(group, categoryId)}
                        aria-label="Bỏ khỏi nhóm"
                        className={DANGER_BUTTON}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {categories.some((category) => !group.categoryIds.includes(category.id)) ? (
              <div className="mt-3">
                <span className="mb-1.5 block text-[12px] font-semibold text-zinc-400">
                  Thêm vào nhóm
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {categories
                    .filter((category) => !group.categoryIds.includes(category.id))
                    .map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        disabled={busy}
                        onClick={() => toggleCategory(group, category.id)}
                        className="rounded-lg border border-dashed border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 transition-colors hover:border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                      >
                        + {category.name}
                      </button>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
          </div>
        </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={removing !== null}
        danger
        pending={busy}
        title="Xóa nhóm danh mục?"
        body={
          removing
            ? `Nhóm "${removing.name}" biến mất khỏi trang chủ ngay. Các danh mục bên trong không bị xóa, chúng chỉ rời khỏi nhóm này. Muốn tạm giấu thì tắt "Hiện nhóm" thay vì xóa.`
            : ""
        }
        confirmLabel="Xóa nhóm"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          await send("DELETE", { id: removing.id });
          setRemoving(null);
        }}
      />
    </div>
  );
}
