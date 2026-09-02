"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BellOff,
  CalendarClock,
  FileText,
  Megaphone,
  Search,
  type LucideIcon,
} from "lucide-react";

import { ConfirmDialog } from "./AdminStates";
import {
  AUDIENCE_LABELS,
  BODY_MAX,
  BULLETS_MAX,
  parseBullets,
  parseUsernames,
  PRIORITY_LABELS,
  STATE_LABELS,
  TITLE_MAX,
  TYPE_LABELS,
  type AnnouncementAudience,
  type AnnouncementPriority,
  type AnnouncementState,
  type AnnouncementStatus,
  type AnnouncementType,
} from "@/lib/announcements";

import { TYPE_ICONS, TYPE_TILE } from "./announcementIcons";

export interface AdminAnnouncementRow {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  audience: AnnouncementAudience;
  /** Usernames a targeted notice is addressed to; empty for a broadcast. */
  recipients: string[];
  bullets: string[];
  noticeTitle: string | null;
  noticeBody: string | null;
  /** Set when the notice owes each reader a parcel, and the name it travels under. */
  giftLabel: string | null;
  /** What the shop decided, crossed with the clock — computed on the server. */
  state: AnnouncementState;
  /** Pre-formatted for the datetime-local inputs. */
  startAtInput: string;
  endAtInput: string;
  startAt: string;
  endAt: string | null;
}

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";

const STATE_TINT: Record<AnnouncementState, string> = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  SCHEDULED: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  DRAFT: "border-white/10 bg-white/5 text-neutral-400",
  EXPIRED: "border-white/10 bg-white/5 text-neutral-500",
  DISABLED: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

/** HIGH shouts, LOW whispers — the list should read the same way the notice
 *  will land. */
const PRIORITY_TINT: Record<string, string> = {
  HIGH: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  NORMAL: "border-white/10 bg-white/5 text-neutral-300",
  LOW: "border-white/10 bg-white/5 text-neutral-500",
};

function StatMini({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {label}
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tint}`}>
          <Icon size={15} />
        </span>
      </div>
      <span
        className={`text-[26px] font-black leading-none tabular-nums ${
          value === 0 ? "text-neutral-600" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

const EMPTY = {
  title: "",
  body: "",
  bullets: "",
  noticeTitle: "",
  noticeBody: "",
  giftLabel: "",
  type: "INFO" as AnnouncementType,
  priority: "NORMAL" as AnnouncementPriority,
  audience: "ALL" as AnnouncementAudience,
  usernames: "",
  startAt: "",
  endAt: "",
};

export function AdminAnnouncements({
  announcements,
}: {
  announcements: AdminAnnouncementRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState(EMPTY);
  // The id being edited, or null while the form is creating a new notice.
  const [editing, setEditing] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"" | AnnouncementState>("");
  const [typeFilter, setTypeFilter] = useState<"" | AnnouncementType>("");
  const [priorityFilter, setPriorityFilter] = useState<"" | AnnouncementPriority>("");
  const [removing, setRemoving] = useState<AdminAnnouncementRow | null>(null);

  const counts = useMemo(
    () => ({
      active: announcements.filter((r) => r.state === "ACTIVE").length,
      scheduled: announcements.filter((r) => r.state === "SCHEDULED").length,
      draft: announcements.filter((r) => r.state === "DRAFT").length,
      off: announcements.filter((r) => r.state === "DISABLED" || r.state === "EXPIRED")
        .length,
    }),
    [announcements],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return announcements.filter(
      (row) =>
        (!needle ||
          row.title.toLowerCase().includes(needle) ||
          row.body.toLowerCase().includes(needle)) &&
        (!stateFilter || row.state === stateFilter) &&
        (!typeFilter || row.type === typeFilter) &&
        (!priorityFilter || row.priority === priorityFilter),
    );
  }, [announcements, search, stateFilter, typeFilter, priorityFilter]);

  function reset() {
    setForm(EMPTY);
    setEditing(null);
  }

  async function send(
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, unknown>,
    okText: string,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setMsg(null);
    try {
      const url =
        method === "DELETE"
          ? `/api/admin/announcements?id=${encodeURIComponent(String(payload.id))}`
          : "/api/admin/announcements";
      const res = await fetch(url, {
        method,
        ...(method === "DELETE"
          ? {}
          : {
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Không thực hiện được" });
        return false;
      }
      setMsg({ tone: "ok", text: okText });
      router.refresh();
      return true;
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...(editing ? { id: editing } : {}),
      title: form.title,
      body: form.body,
      bullets: parseBullets(form.bullets),
      noticeTitle: form.noticeTitle,
      noticeBody: form.noticeBody,
      // Only a targeted gift can owe parcels, and the API says so rather than
      // trusting this — but sending it anywhere else would only earn an error
      // the admin cannot act on from the form they are looking at.
      giftLabel:
        form.type === "GIFT" && form.audience === "USERS" ? form.giftLabel : "",
      type: form.type,
      priority: form.priority,
      audience: form.audience,
      // Only meaningful for a targeted notice; the API ignores it otherwise
      // rather than storing recipients for something addressed to everyone.
      usernames: form.audience === "USERS" ? parseUsernames(form.usernames) : [],
      // An empty field means "no bound", which the API reads as null. Sent as
      // an empty string rather than omitted, so clearing an end date on an
      // existing notice actually clears it.
      startAt: form.startAt || null,
      endAt: form.endAt || null,
    };
    const ok = await send(
      editing ? "PATCH" : "POST",
      payload,
      editing ? "Đã lưu thay đổi" : "Đã tạo thông báo (đang ở trạng thái nháp)",
    );
    if (ok) reset();
  }

  function startEdit(row: AdminAnnouncementRow) {
    setEditing(row.id);
    setForm({
      title: row.title,
      body: row.body,
      bullets: row.bullets.join("\n"),
      noticeTitle: row.noticeTitle ?? "",
      noticeBody: row.noticeBody ?? "",
      giftLabel: row.giftLabel ?? "",
      type: row.type,
      priority: row.priority,
      audience: row.audience,
      usernames: row.recipients.join(", "),
      startAt: row.startAtInput,
      endAt: row.endAtInput,
    });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatMini
          label="Đang chạy"
          value={counts.active}
          icon={Megaphone}
          tint="border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
        />
        <StatMini
          label="Đã lên lịch"
          value={counts.scheduled}
          icon={CalendarClock}
          tint="border-sky-500/25 bg-sky-500/10 text-sky-400"
        />
        <StatMini
          label="Nháp"
          value={counts.draft}
          icon={FileText}
          tint="border-violet-500/25 bg-violet-500/10 text-violet-400"
        />
        <StatMini
          label="Đã tắt / hết hạn"
          value={counts.off}
          icon={BellOff}
          tint="border-amber-500/25 bg-amber-500/10 text-amber-400"
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
            <Megaphone size={13} className="text-neutral-400" />
            {editing ? "Sửa thông báo" : "Tạo thông báo"}
          </span>
          {editing ? (
            <button
              type="button"
              onClick={reset}
              className="text-[11px] font-bold text-neutral-400 hover:text-white transition-colors"
            >
              Hủy sửa
            </button>
          ) : null}
        </div>

        <div>
          <label className={LABEL}>Tiêu đề</label>
          <input
            required
            maxLength={TITLE_MAX}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Bảo trì hệ thống"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL}>
            Nội dung
            <span className="ml-2 font-bold normal-case tracking-normal text-neutral-600">
              {form.body.length}/{BODY_MAX} · chỉ chữ thường, không dùng HTML
            </span>
          </label>
          <textarea
            required
            rows={4}
            maxLength={BODY_MAX}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Shop bảo trì từ 2h đến 4h sáng mai. Trong thời gian này không nạp tiền được."
            className={`${FIELD} resize-y`}
          />
        </div>

        <div>
          <label className={LABEL}>
            Lưu ý — mỗi dòng một gạch đầu dòng
            <span className="ml-2 font-bold normal-case tracking-normal text-neutral-600">
              tối đa {BULLETS_MAX} dòng · để trống thì bỏ qua mục này
            </span>
          </label>
          <textarea
            rows={3}
            value={form.bullets}
            onChange={(e) => setForm({ ...form, bullets: e.target.value })}
            placeholder={"Vui lòng nhập đúng nội dung chuyển khoản được cung cấp.\nKhông chỉnh sửa nội dung chuyển khoản khi thực hiện thanh toán."}
            className={`${FIELD} resize-y`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Ô lưu ý quan trọng — tiêu đề</label>
            <input
              value={form.noticeTitle}
              onChange={(e) => setForm({ ...form, noticeTitle: e.target.value })}
              placeholder="Lưu ý quan trọng"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Ô lưu ý quan trọng — nội dung</label>
            <input
              value={form.noticeBody}
              onChange={(e) => setForm({ ...form, noticeBody: e.target.value })}
              placeholder="Không thực hiện nhiều giao dịch cùng lúc với cùng một mã nạp."
              className={FIELD}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Gửi cho ai</label>
            <select
              value={form.audience}
              onChange={(e) =>
                setForm({ ...form, audience: e.target.value as AnnouncementAudience })
              }
              className={FIELD}
            >
              {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="bg-neutral-900">
                  {label}
                </option>
              ))}
            </select>
          </div>
          {form.audience === "USERS" ? (
            <div>
              <label className={LABEL}>
                Tên tài khoản
                <span className="ml-2 font-bold normal-case tracking-normal text-neutral-600">
                  {parseUsernames(form.usernames).length} người · cách nhau bằng dấu phẩy
                  hoặc xuống dòng
                </span>
              </label>
              <textarea
                rows={2}
                value={form.usernames}
                onChange={(e) => setForm({ ...form, usernames: e.target.value })}
                placeholder="nguyenvana, tranthib"
                className={`${FIELD} resize-y`}
              />
            </div>
          ) : (
            <div className="flex items-end">
              <p className="pb-2.5 text-[11px] text-neutral-500">
                Hiện cho tất cả khách vào web, kể cả người chưa đăng nhập.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className={LABEL}>Loại</label>
            {/* Buttons rather than a <select>, so the glyph the customer will
                see is on screen while the kind is being chosen — a dropdown
                cannot show one. */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPE_LABELS) as AnnouncementType[]).map((value) => {
                const Icon = TYPE_ICONS[value];
                const on = form.type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setForm({ ...form, type: value })}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition-colors ${
                      on
                        ? "border-[var(--menzu-accent)]/60 bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)]"
                        : "border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Icon size={13} />
                    {TYPE_LABELS[value]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={LABEL}>Ưu tiên</label>
            <select
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as AnnouncementPriority })
              }
              className={FIELD}
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="bg-neutral-900">
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Bắt đầu</label>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Kết thúc</label>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              className={FIELD}
            />
          </div>
        </div>

        {/* A gift that has to travel. Shown only where it can be true: a
            broadcast cannot owe parcels, and a maintenance notice is not a
            present. Filling it in is what turns the notice into an errand —
            the reader gets an address form and the shop gets a queue row. */}
        {form.type === "GIFT" && form.audience === "USERS" ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3.5">
            <label className={LABEL}>
              Quà cần giao tận nơi
              <span className="ml-2 font-bold normal-case tracking-normal text-neutral-500">
                để trống nếu không phải gửi hàng
              </span>
            </label>
            <input
              value={form.giftLabel}
              onChange={(e) => setForm({ ...form, giftLabel: e.target.value })}
              maxLength={80}
              placeholder="Áo thun THICHTHIHACK size L"
              className={FIELD}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
              Điền tên quà thì thông báo sẽ có nút{" "}
              <span className="font-bold text-amber-300">Điền địa chỉ nhận</span> cho
              khách nhập tên, số điện thoại và địa chỉ — giống khi quay trúng quà
              tặng. Quà hiện trong mục{" "}
              <span className="font-bold text-neutral-300">Vận hành → Gửi quà</span>{" "}
              sau khi thông báo được đăng.
            </p>
          </div>
        ) : null}

        <p className="text-[11px] text-neutral-500">
          Để trống thời gian bắt đầu là chạy ngay, để trống kết thúc là chạy đến khi
          tự tắt. Thông báo mới luôn ở trạng thái nháp — bấm{" "}
          <span className="font-bold text-neutral-300">Đăng</span> ở bảng dưới mới hiện
          cho khách.
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

        <button
          type="submit"
          disabled={busy}
          className="self-start h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          {busy ? "Đang xử lý…" : editing ? "Lưu thay đổi" : "Tạo thông báo"}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <label className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc nội dung…"
            className="w-full h-10 rounded-lg border border-white/[0.08] bg-[#0e0e11] pl-9 pr-3 text-[13px] text-white outline-none focus:border-rose-500/50 transition-colors"
          />
        </label>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as "" | AnnouncementState)}
          className={FIELD}
        >
          <option value="" className="bg-neutral-900">
            Mọi trạng thái
          </option>
          {Object.entries(STATE_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-neutral-900">
              {label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "" | AnnouncementType)}
          className={FIELD}
        >
          <option value="" className="bg-neutral-900">
            Mọi loại
          </option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-neutral-900">
              {label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "" | AnnouncementPriority)}
          className={FIELD}
        >
          <option value="" className="bg-neutral-900">
            Mọi mức ưu tiên
          </option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-neutral-900">
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0e0e11]">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-white/10">
              {["Tiêu đề", "Gửi cho", "Loại", "Ưu tiên", "Lịch chạy", "Trạng thái", "Thao tác"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">
                  {announcements.length === 0
                    ? "Chưa có thông báo nào"
                    : "Không có thông báo nào khớp bộ lọc"}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 last:border-0 align-top transition-colors hover:bg-white/[0.015]"
                >
                  <td className="px-5 py-3 max-w-[280px]">
                    <p className="text-xs font-black text-white truncate">{row.title}</p>
                    <p className="mt-1 text-[11px] text-neutral-500 line-clamp-2">
                      {row.body}
                    </p>
                  </td>
                  <td className="px-5 py-3 max-w-[200px]">
                    <p className="text-xs text-neutral-300 whitespace-nowrap">
                      {row.audience === "ALL"
                        ? "Tất cả"
                        : `${row.recipients.length} người`}
                    </p>
                    {row.audience === "USERS" ? (
                      <p className="mt-1 text-[11px] text-neutral-500 truncate">
                        {row.recipients.join(", ")}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {/* The same glyph the customer sees on the notice itself. */}
                    <span className="inline-flex items-center gap-2 text-xs text-neutral-300">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md border ${TYPE_TILE}`}>
                        {(() => {
                          const Icon = TYPE_ICONS[row.type];
                          return <Icon size={12} />;
                        })()}
                      </span>
                      {TYPE_LABELS[row.type]}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                        PRIORITY_TINT[row.priority] ?? PRIORITY_TINT.NORMAL
                      }`}
                    >
                      {PRIORITY_LABELS[row.priority]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[11px] text-neutral-400 whitespace-nowrap">
                    {row.startAt}
                    <br />
                    <span className="text-neutral-600">
                      {row.endAt ? `đến ${row.endAt}` : "không giới hạn"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${STATE_TINT[row.state]}`}
                    >
                      {STATE_LABELS[row.state]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "PUBLISHED" ? (
                        <ActionButton
                          busy={busy}
                          tone="warn"
                          onClick={() =>
                            send("PATCH", { id: row.id, action: "disable" }, "Đã tắt thông báo")
                          }
                        >
                          Tắt
                        </ActionButton>
                      ) : (
                        <ActionButton
                          busy={busy}
                          tone="go"
                          onClick={() =>
                            send("PATCH", { id: row.id, action: "publish" }, "Đã đăng thông báo")
                          }
                        >
                          Đăng
                        </ActionButton>
                      )}
                      <ActionButton busy={busy} onClick={() => startEdit(row)}>
                        Sửa
                      </ActionButton>
                      <ActionButton busy={busy} tone="danger" onClick={() => setRemoving(row)}>
                        Xóa
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={removing !== null}
        danger
        pending={busy}
        title="Xóa thông báo?"
        body={
          removing
            ? `"${removing.title}" sẽ bị xóa hẳn cùng lịch sử đã-đọc của khách và không khôi phục được. Muốn ngừng hiện nhưng giữ lại thì bấm Tắt.`
            : ""
        }
        confirmLabel="Xóa thông báo"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          await send("DELETE", { id: removing.id }, "Đã xóa thông báo");
          setRemoving(null);
        }}
      />
    </div>
  );
}

const ACTION_TONE = {
  go: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
  danger: "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15",
  plain: "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10",
} as const;

function ActionButton({
  busy,
  tone = "plain",
  onClick,
  children,
}: {
  busy: boolean;
  tone?: keyof typeof ACTION_TONE;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 ${ACTION_TONE[tone]}`}
    >
      {children}
    </button>
  );
}
