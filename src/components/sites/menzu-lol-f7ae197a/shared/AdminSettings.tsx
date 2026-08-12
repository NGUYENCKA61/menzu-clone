"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { HOME_BLOCKS, type ShopSettings } from "@/lib/settings";
import { AdminError } from "./AdminStates";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const CARD = "rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4";
const HEADING = "text-[10px] font-black uppercase tracking-widest text-neutral-500";
const HINT = "mt-1.5 text-[11px] text-neutral-500";
const ICON_BUTTON =
  "h-7 w-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-neutral-300 transition-colors inline-flex items-center justify-center";

const TABS = ["Bán hàng & nạp tiền", "Nhận diện", "Bố cục trang chủ"] as const;
type Tab = (typeof TABS)[number];

export interface SettingsCategory {
  slug: string;
  name: string;
}

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
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
      />
      <span>
        <span className="block text-xs font-bold text-white">{label}</span>
        {hint ? (
          <span className="block text-[11px] text-neutral-500 mt-0.5">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * Shop configuration: what it sells for, what it looks like, and what the home
 * page shows.
 *
 * Everything here was a constant in the source until now, so each field says
 * what it actually moves on the storefront — a value with no stated effect is
 * a value nobody will dare change.
 */
export function AdminSettings({
  settings,
  categories,
}: {
  settings: ShopSettings;
  categories: SettingsCategory[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [topUpMin, setTopUpMin] = useState(String(settings.topUpMin));
  const [presets, setPresets] = useState(settings.topUpPresets.join(", "));
  const [bank, setBank] = useState(settings.bankTopUpEnabled);
  const [card, setCard] = useState(settings.cardTopUpEnabled);
  const [purchases, setPurchases] = useState(settings.purchasesEnabled);
  const [closedMessage, setClosedMessage] = useState(settings.closedMessage);

  const [bankCode, setBankCode] = useState(settings.bankCode);
  const [bankName, setBankName] = useState(settings.bankName);
  const [bankAccount, setBankAccount] = useState(settings.bankAccount);
  const [bankHolder, setBankHolder] = useState(settings.bankHolder);

  const [auto, setAuto] = useState(settings.autoTopUpEnabled);
  const [apiKey, setApiKey] = useState(settings.topUpApiKey);
  const [apiUrl, setApiUrl] = useState(settings.topUpApiUrl);
  // Rendered after mount so the copied URL is the host the admin is actually on.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const [brandName, setBrandName] = useState(settings.brandName);
  const [brandLogo, setBrandLogo] = useState(settings.brandLogo);
  const [brandColor, setBrandColor] = useState(settings.brandColor);
  const [heroBanner, setHeroBanner] = useState(settings.heroBanner);
  const [zalo, setZalo] = useState(settings.contactZalo);
  const [facebook, setFacebook] = useState(settings.contactFacebook);
  const [hotline, setHotline] = useState(settings.contactHotline);

  const [blocks, setBlocks] = useState(settings.homeBlocks);
  const [valorantSlugs, setValorantSlugs] = useState(settings.homeValorantSlugs);
  const [tftSlugs, setTftSlugs] = useState(settings.homeTftSlugs);

  function moveBlock(index: number, delta: number) {
    const next = [...blocks];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  }

  function toggleBlock(index: number) {
    const next = [...blocks];
    next[index] = next[index].startsWith("-") ? next[index].slice(1) : `-${next[index]}`;
    setBlocks(next);
  }

  function toggleSlug(list: string[], set: (next: string[]) => void, slug: string) {
    set(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }

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
          bankCode,
          bankName,
          bankAccount,
          bankHolder,
          autoTopUpEnabled: auto,
          topUpApiKey: apiKey,
          topUpApiUrl: apiUrl,
          purchasesEnabled: purchases,
          closedMessage,
          brandName,
          brandLogo,
          brandColor,
          heroBanner,
          contactZalo: zalo,
          contactFacebook: facebook,
          contactHotline: hotline,
          homeBlocks: blocks,
          homeValorantSlugs: valorantSlugs,
          homeTftSlugs: tftSlugs,
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
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
            aria-pressed={tab === option}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
              tab === option
                ? "border-[var(--brand)] bg-[var(--brand)]/15 text-white"
                : "border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {tab === "Bán hàng & nạp tiền" ? (
        <>
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
                <p className={HINT}>
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
                <p className={HINT}>
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
            <span className={HEADING}>Tài khoản nhận chuyển khoản</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bank-code" className={LABEL}>
                  Mã ngân hàng
                </label>
                <input
                  id="bank-code"
                  value={bankCode}
                  onChange={(event) => setBankCode(event.target.value.toUpperCase())}
                  placeholder="VCB"
                  className={`${FIELD} font-mono uppercase`}
                />
                <p className={HINT}>
                  Mã VietQR: VCB, TCB, MB, ACB, VPB… hoặc số BIN dạng 970436. Đây là thứ
                  sinh ra mã QR cho khách quét.
                </p>
              </div>
              <div>
                <label htmlFor="bank-name" className={LABEL}>
                  Tên ngân hàng
                </label>
                <input
                  id="bank-name"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  placeholder="Vietcombank"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="bank-account" className={LABEL}>
                  Số tài khoản
                </label>
                <input
                  id="bank-account"
                  inputMode="numeric"
                  value={bankAccount}
                  onChange={(event) => setBankAccount(event.target.value)}
                  placeholder="1234567890"
                  className={`${FIELD} tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="bank-holder" className={LABEL}>
                  Chủ tài khoản
                </label>
                <input
                  id="bank-holder"
                  value={bankHolder}
                  onChange={(event) => setBankHolder(event.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  className={`${FIELD} uppercase`}
                />
              </div>
            </div>

            {bankCode && bankAccount && bankHolder ? (
              <p className="text-[11px] text-neutral-500">
                Khách sẽ thấy mã QR kèm số tiền và nội dung chuyển khoản
                <span className="font-mono text-neutral-400"> NAP &lt;mã lệnh&gt;</span>.
                Tiền chỉ vào ví sau khi bạn bấm Xác nhận ở mục Vận hành → Nạp tiền.
              </p>
            ) : (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[11px] font-semibold text-amber-400">
                Chưa điền đủ mã ngân hàng, số tài khoản và chủ tài khoản — tab Ngân Hàng
                của khách sẽ báo tạm chưa nhận chuyển khoản, và máy chủ từ chối tạo lệnh
                nạp qua ngân hàng.
              </p>
            )}
          </section>

          <section className={CARD}>
            <span className={HEADING}>Nạp tự động</span>

            <Toggle
              checked={auto}
              onChange={setAuto}
              label="Tự động cộng tiền khi nhận được chuyển khoản"
              hint="Bật thì không phải bấm Xác nhận nữa: hệ thống đọc nội dung chuyển khoản, khớp đúng mã và số tiền là cộng ví ngay."
            />

            <div>
              <label htmlFor="topup-key" className={LABEL}>
                API key
              </label>
              <input
                id="topup-key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Dán key từ sieuthicode / Casso / SePay"
                className={`${FIELD} font-mono`}
              />
              <p className={HINT}>
                Vừa là chìa khóa để gọi API đối soát, vừa là mật khẩu mà bên trung gian
                phải gửi kèm khi bắn dữ liệu sang. Không có key thì nạp tự động không bật
                được — nếu không ai cũng gọi được vào và tự cộng tiền.
              </p>
            </div>

            <div>
              <label htmlFor="topup-url" className={LABEL}>
                Địa chỉ API đối soát <span className="text-neutral-600">(nếu bên đó không tự bắn sang)</span>
              </label>
              <input
                id="topup-url"
                value={apiUrl}
                onChange={(event) => setApiUrl(event.target.value)}
                placeholder="https://api.sieuthicode.vn/..."
                className={`${FIELD} font-mono`}
              />
              <p className={HINT}>
                Dành cho dịch vụ kiểu hỏi–đáp như sieuthicode: web tự gọi sang lấy danh
                sách giao dịch mới trong lúc khách đang chờ ở màn chuyển khoản.
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-neutral-950/40 px-4 py-3">
              <span className={LABEL}>Địa chỉ để dán vào bên trung gian</span>
              <p className="font-mono text-xs text-neutral-300 break-all">
                {origin}/api/wallet/webhook
              </p>
              <p className="mt-1.5 text-[11px] text-neutral-500">
                Dành cho dịch vụ tự bắn dữ liệu sang (Casso, SePay). Chúng gửi kèm header{" "}
                <span className="font-mono">Authorization: Apikey &lt;key&gt;</span> — đúng
                key ở trên là chạy.
              </p>
            </div>

            {auto && !apiKey ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[11px] font-semibold text-amber-400">
                Bật nạp tự động thì bắt buộc phải có API key — lưu sẽ bị từ chối.
              </p>
            ) : null}

            <p className="text-[11px] text-neutral-500">
              Nút Xác nhận / Từ chối ở mục Vận hành vẫn còn để xử lý các ca lệch: khách
              quên ghi nội dung, ghi sai, hoặc chuyển thiếu tiền. Bật auto rồi thì bình
              thường bạn không phải đụng tới nó.
            </p>
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
              <p className={HINT}>
                Câu này hiện ra ngay chỗ khách bấm mua. Nói rõ khi nào bán lại thì khách
                còn quay lại, còn im lặng thì khách nghĩ shop hỏng.
              </p>
            </div>
          </section>
        </>
      ) : null}

      {tab === "Nhận diện" ? (
        <>
          <section className={CARD}>
            <span className={HEADING}>Tên và hình ảnh</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="brand-name" className={LABEL}>
                  Tên shop
                </label>
                <input
                  id="brand-name"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  className={FIELD}
                />
                <p className={HINT}>
                  Hiện ở logo góc trái, chân trang và tiêu đề tab trình duyệt. Từ đầu
                  tiên là dòng chữ lớn, phần còn lại là dòng nhỏ màu đỏ bên dưới.
                </p>
              </div>
              <div>
                <label htmlFor="brand-color" className={LABEL}>
                  Màu chủ đạo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="brand-color"
                    value={brandColor}
                    onChange={(event) => setBrandColor(event.target.value)}
                    placeholder="#7C3AED"
                    className={`${FIELD} font-mono uppercase`}
                  />
                  <input
                    type="color"
                    aria-label="Chọn màu chủ đạo"
                    value={/^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#7C3AED"}
                    onChange={(event) => setBrandColor(event.target.value.toUpperCase())}
                    className="h-9 w-10 shrink-0 rounded-lg border border-white/10 bg-neutral-950/60 cursor-pointer"
                  />
                </div>
                <p className={HINT}>
                  Màu của mọi nút bấm, viền đang chọn và nhãn nổi bật trên toàn site.
                  Sắc đậm hơn khi rê chuột được tính tự động từ màu này.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="brand-logo" className={LABEL}>
                Logo
              </label>
              <input
                id="brand-logo"
                value={brandLogo}
                onChange={(event) => setBrandLogo(event.target.value)}
                className={`${FIELD} font-mono`}
              />
              <p className={HINT}>
                Đường dẫn ảnh, bắt đầu bằng / nếu nằm trong thư mục public. Dùng cho
                logo header, chân trang và icon khi khách thêm shop vào màn hình chính.
              </p>
            </div>

            <div>
              <label htmlFor="hero-banner" className={LABEL}>
                Ảnh banner đầu trang
              </label>
              <input
                id="hero-banner"
                value={heroBanner}
                onChange={(event) => setHeroBanner(event.target.value)}
                className={`${FIELD} font-mono`}
              />
              <p className={HINT}>
                Ảnh lớn trên cùng trang chủ, cũng là ảnh hiện ra khi ai đó chia sẻ link
                shop lên Facebook hay Zalo.
              </p>
            </div>
          </section>

          <section className={CARD}>
            <span className={HEADING}>Liên hệ ở chân trang</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="contact-zalo" className={LABEL}>
                  Số Zalo
                </label>
                <input
                  id="contact-zalo"
                  value={zalo}
                  onChange={(event) => setZalo(event.target.value)}
                  placeholder="0900000000"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="contact-facebook" className={LABEL}>
                  Link Facebook
                </label>
                <input
                  id="contact-facebook"
                  value={facebook}
                  onChange={(event) => setFacebook(event.target.value)}
                  placeholder="https://facebook.com/..."
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="contact-hotline" className={LABEL}>
                  Hotline
                </label>
                <input
                  id="contact-hotline"
                  value={hotline}
                  onChange={(event) => setHotline(event.target.value)}
                  placeholder="1900 xxxx"
                  className={FIELD}
                />
              </div>
            </div>

            <p className={HINT}>
              Để trống thì icon ở chân trang vẫn hiện nhưng không dẫn đi đâu — giống hệt
              bản gốc. Điền vào thì icon Facebook và Zalo mở đúng địa chỉ của shop.
            </p>
          </section>
        </>
      ) : null}

      {tab === "Bố cục trang chủ" ? (
        <>
          <section className={CARD}>
            <span className={HEADING}>Các khối trên trang chủ</span>
            <p className="text-[11px] text-neutral-500">
              Bỏ tick để ẩn một khối, mũi tên để đổi thứ tự. Trang chủ hiển thị đúng
              theo thứ tự trong danh sách này.
            </p>

            <div className="flex flex-col gap-1.5">
              {blocks.map((entry, index) => {
                const id = entry.replace(/^-/, "");
                const enabled = !entry.startsWith("-");
                const label = HOME_BLOCKS.find((b) => b.id === id)?.label ?? id;

                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-neutral-950/40 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleBlock(index)}
                      aria-label={`Hiện khối ${label}`}
                      className="h-4 w-4 shrink-0 accent-[var(--brand)]"
                    />
                    <span
                      className={`flex-1 text-xs font-bold ${
                        enabled ? "text-white" : "text-neutral-600 line-through"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveBlock(index, -1)}
                      aria-label={`Đưa ${label} lên trên`}
                      className={ICON_BUTTON}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={index === blocks.length - 1}
                      onClick={() => moveBlock(index, 1)}
                      aria-label={`Đưa ${label} xuống dưới`}
                      className={ICON_BUTTON}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={CARD}>
            <span className={HEADING}>Danh mục trong từng hàng</span>
            <p className="text-[11px] text-neutral-500">
              Chọn danh mục nào xuất hiện ở hai hàng thẻ trên trang chủ. Bỏ chọn hết thì
              hàng đó biến mất.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <span className={LABEL}>Hàng &ldquo;Sản phẩm nổi bật&rdquo;</span>
                <div className="flex flex-col gap-1.5">
                  {categories.map((category) => (
                    <Toggle
                      key={`v-${category.slug}`}
                      checked={valorantSlugs.includes(category.slug)}
                      onChange={() =>
                        toggleSlug(valorantSlugs, setValorantSlugs, category.slug)
                      }
                      label={category.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className={LABEL}>Hàng &ldquo;Đấu trường chân lý&rdquo;</span>
                <div className="flex flex-col gap-1.5">
                  {categories.map((category) => (
                    <Toggle
                      key={`t-${category.slug}`}
                      checked={tftSlugs.includes(category.slug)}
                      onChange={() => toggleSlug(tftSlugs, setTftSlugs, category.slug)}
                      label={category.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {saved ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
        >
          Đã lưu cấu hình. Thay đổi có hiệu lực ngay với khách đang truy cập.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          {busy ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
        <span className="text-[11px] text-neutral-500">
          Lưu cả ba thẻ cùng lúc, kể cả thẻ bạn chưa mở.
        </span>
      </div>
    </form>
  );
}
