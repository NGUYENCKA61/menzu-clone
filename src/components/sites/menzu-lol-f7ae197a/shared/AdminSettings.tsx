"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ShopSettings } from "@/lib/settings";
import { AdminError } from "./AdminStates";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const CARD = "rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4";
const HEADING = "text-[10px] font-black uppercase tracking-widest text-neutral-500";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** A labelled on/off switch. */
function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#7C3AED]"
      />
      <span>
        <span className="block text-xs font-bold text-white">{label}</span>
        <span className="block text-[11px] text-neutral-500 mt-0.5">{hint}</span>
      </span>
    </label>
  );
}

/**
 * Shop configuration.
 *
 * Everything on this screen was a constant in the source until now, so each
 * field says what it actually moves on the storefront — a number here with no
 * stated effect is a number nobody will dare change.
 */
export function AdminSettings({ settings }: { settings: ShopSettings }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [topUpMin, setTopUpMin] = useState(String(settings.topUpMin));
  const [presets, setPresets] = useState(settings.topUpPresets.join(", "));
  const [bank, setBank] = useState(settings.bankTopUpEnabled);
  const [card, setCard] = useState(settings.cardTopUpEnabled);
  const [purchases, setPurchases] = useState(settings.purchasesEnabled);
  const [closedMessage, setClosedMessage] = useState(settings.closedMessage);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topUpMin: Number(topUpMin.replace(/\D/g, "")),
          topUpPresets: presets
            .split(",")
            .map((part) => Number(part.replace(/\D/g, "")))
            .filter((value) => value > 0),
          bankTopUpEnabled: bank,
          cardTopUpEnabled: card,
          purchasesEnabled: purchases,
          closedMessage,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        topUpPresets?: number[];
      };
      if (!response.ok) {
        setError(data.error ?? "Không lưu được cấu hình");
        return;
      }
      // The server sorts and de-duplicates the presets, so show back what was
      // actually stored rather than what was typed.
      if (data.topUpPresets) setPresets(data.topUpPresets.join(", "));
      setSaved(true);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-[820px]">
      <section className={CARD}>
        <span className={HEADING}>Nạp tiền</span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="topup-min" className={LABEL}>
              Nạp tối thiểu (đ)
            </label>
            <input
              id="topup-min"
              inputMode="numeric"
              value={topUpMin}
              onChange={(event) => setTopUpMin(event.target.value)}
              className={`${FIELD} tabular-nums`}
            />
            <p className="mt-1.5 text-[11px] text-neutral-500">
              Hiện tại: nạp từ {formatVnd(Number(topUpMin.replace(/\D/g, "")) || 0)}đ trở
              lên. Máy chủ từ chối mọi hóa đơn thấp hơn mức này.
            </p>
          </div>
          <div>
            <label htmlFor="topup-presets" className={LABEL}>
              Mệnh giá gợi ý
            </label>
            <input
              id="topup-presets"
              value={presets}
              onChange={(event) => setPresets(event.target.value)}
              placeholder="50000, 200000, 500000"
              className={`${FIELD} tabular-nums`}
            />
            <p className="mt-1.5 text-[11px] text-neutral-500">
              Các nút số tiền ở trang Nạp thẻ, cách nhau bằng dấu phẩy. Mệnh giá thấp
              hơn mức tối thiểu sẽ bị từ chối khi lưu.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <Toggle
            checked={bank}
            onChange={setBank}
            label="Nhận nạp qua ngân hàng"
            hint="Tắt sẽ ẩn tab Ngân Hàng và máy chủ từ chối hóa đơn loại này."
          />
          <Toggle
            checked={card}
            onChange={setCard}
            label="Nhận nạp bằng thẻ cào"
            hint="Tắt sẽ ẩn tab Thẻ Cào cùng danh sách nhà mạng."
          />
          {!bank && !card ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[11px] font-semibold text-amber-400">
              Tắt cả hai nghĩa là khách không nạp được tiền vào ví bằng cách nào —
              trang Nạp thẻ sẽ chỉ còn thông báo tạm ngưng.
            </p>
          ) : null}
        </div>
      </section>

      <section className={CARD}>
        <span className={HEADING}>Bán hàng</span>

        <Toggle
          checked={purchases}
          onChange={setPurchases}
          label="Cho phép mua tài khoản"
          hint="Tắt khi cần tạm dừng bán: nút mua vẫn hiện nhưng máy chủ từ chối, nên không ai bị trừ tiền giữa chừng."
        />

        <div>
          <label htmlFor="closed-message" className={LABEL}>
            Thông báo khi tạm dừng bán
          </label>
          <input
            id="closed-message"
            value={closedMessage}
            onChange={(event) => setClosedMessage(event.target.value)}
            className={FIELD}
          />
          <p className="mt-1.5 text-[11px] text-neutral-500">
            Câu này hiện ra ngay chỗ khách bấm mua. Nói rõ khi nào bán lại thì khách
            còn quay lại, còn im lặng thì khách nghĩ shop hỏng.
          </p>
        </div>
      </section>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {saved ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
        >
          Đã lưu cấu hình. Thay đổi có hiệu lực ngay với khách đang truy cập.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="self-start h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
      >
        {busy ? "Đang lưu…" : "Lưu cấu hình"}
      </button>
    </form>
  );
}
