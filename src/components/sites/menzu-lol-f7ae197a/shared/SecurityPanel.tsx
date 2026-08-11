"use client";

import { Link2, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useState } from "react";

type Tab = "security" | "linked" | "devices";

const TABS: { id: Tab; label: string; heading: string; icon: typeof ShieldCheck }[] = [
  { id: "security", label: "Bảo mật", heading: "Bảo mật tài khoản", icon: ShieldCheck },
  { id: "linked", label: "Liên kết", heading: "Liên kết nền tảng", icon: Link2 },
  { id: "devices", label: "Thiết bị", heading: "Quản lý thiết bị", icon: MonitorSmartphone },
];

const TAB_ACTIVE =
  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[#7C3AED] text-white transition-colors";
const TAB_INACTIVE =
  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";
const LABEL =
  "block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2";

/**
 * No credentials are submitted anywhere — every form here calls preventDefault()
 * and nothing else. Real account security actions land with the backend.
 */
export function SecurityPanel() {
  const [tab, setTab] = useState<Tab>("security");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={tab === id ? TAB_ACTIVE : TAB_INACTIVE}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
        {active.heading}
      </span>

      {tab === "security" ? (
        <div className="flex flex-col gap-4">
          <form
            onSubmit={(event) => event.preventDefault()}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-3"
          >
            <label className={LABEL}>Địa chỉ Email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="Nhập email mới của bạn"
              className={FIELD}
            />
            <button
              type="submit"
              className="self-start h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
            >
              Cập nhật
            </button>
          </form>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-3"
          >
            <label className={LABEL}>Đổi Mật Khẩu</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Nhập mật khẩu hiện tại"
              className={FIELD}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Nhập mật khẩu mới"
              className={FIELD}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Xác nhận lại mật khẩu mới"
              className={FIELD}
            />
            <button
              type="submit"
              className="self-start h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
            >
              Đổi Mật Khẩu
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center text-sm text-neutral-400">
          {tab === "linked"
            ? "Chưa liên kết nền tảng nào."
            : "Chưa có thiết bị nào được ghi nhận."}
        </div>
      )}
    </div>
  );
}
