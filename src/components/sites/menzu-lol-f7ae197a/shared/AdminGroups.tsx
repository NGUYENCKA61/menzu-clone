"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminError } from "./AdminStates";

export interface GroupCategoryOption {
  id: string;
  name: string;
  productCount: number;
}

export interface AdminGroupRow {
  id: string;
  slug: string;
  name: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  categoryIds: string[];
}

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const CARD = "rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4";
const ICON_BUTTON =
  "h-7 w-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-neutral-300 transition-colors inline-flex items-center justify-center";

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
  const [newIcon, setNewIcon] = useState("");

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

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      <section className={CARD}>
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Thêm nhóm
        </span>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-20">
            <span className={LABEL}>Icon</span>
            <input
              value={newIcon}
              onChange={(event) => setNewIcon(event.target.value)}
              className={FIELD}
              placeholder="🔥"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <span className={LABEL}>Tên nhóm</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className={FIELD}
              placeholder="Ví dụ: Hot trending tháng này"
            />
          </div>
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={async () => {
              if (await send("POST", { name: newName, icon: newIcon })) {
                setNewName("");
                setNewIcon("");
              }
            }}
            className="inline-flex h-[38px] items-center gap-1.5 rounded-xl bg-[var(--menzu-accent)] px-4 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50"
          >
            <Plus size={14} />
            Thêm
          </button>
        </div>
      </section>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-[12px] text-neutral-500">
          Chưa có nhóm nào. Trang chủ sẽ không hiện hàng danh mục nào cả.
        </p>
      ) : null}

      {groups.map((group, index) => (
        <section key={group.id} className={CARD}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-20">
              <span className={LABEL}>Icon</span>
              <input
                defaultValue={group.icon}
                onBlur={(event) => {
                  if (event.target.value !== group.icon) {
                    void send("PUT", { id: group.id, icon: event.target.value });
                  }
                }}
                aria-label={`Icon của ${group.name}`}
                className={FIELD}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <span className={LABEL}>Tên nhóm</span>
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
              className={`${ICON_BUTTON} mb-1`}
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              disabled={index === groups.length - 1 || busy}
              onClick={() => moveGroup(index, 1)}
              aria-label={`Đưa ${group.name} xuống dưới`}
              className={`${ICON_BUTTON} mb-1`}
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => send("DELETE", { id: group.id })}
              aria-label={`Xóa nhóm ${group.name}`}
              className={`${ICON_BUTTON} mb-1`}
            >
              <Trash2 size={12} />
            </button>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={group.isActive}
              onChange={(event) => send("PUT", { id: group.id, isActive: event.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
            />
            <span>
              <span className="block text-xs font-bold text-white">Hiện nhóm này trên trang chủ</span>
              <span className="mt-0.5 block text-[11px] text-neutral-500">
                Tắt thì giữ nguyên nhóm và các danh mục đã chọn, chỉ không hiện ra.
              </span>
            </span>
          </label>

          <div>
            <span className={LABEL}>Danh mục trong nhóm ({group.categoryIds.length})</span>
            {group.categoryIds.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-[11px] text-neutral-500">
                Chưa chọn danh mục nào — nhóm này sẽ không hiện trên trang chủ.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {group.categoryIds.map((categoryId, position) => {
                  const category = byId.get(categoryId);
                  return (
                    <div
                      key={categoryId}
                      className="flex items-center gap-2 rounded-xl border border-white/5 bg-neutral-950/40 px-3 py-2"
                    >
                      <span className="w-5 shrink-0 text-[10px] font-black uppercase tracking-widest text-neutral-600">
                        {position + 1}
                      </span>
                      <span className="flex-1 truncate text-xs font-bold text-white">
                        {category?.name ?? categoryId}
                      </span>
                      <span className="shrink-0 text-[10px] text-neutral-500">
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
                        className={ICON_BUTTON}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {categories
                .filter((category) => !group.categoryIds.includes(category.id))
                .map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleCategory(group, category.id)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    + {category.name}
                  </button>
                ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
