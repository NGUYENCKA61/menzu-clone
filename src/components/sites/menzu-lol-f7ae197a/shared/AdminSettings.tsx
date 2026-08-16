"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";

import {
  DEFAULT_SETTINGS,
  HOME_BLOCKS,
  ROW_COUNT_MAX,
  ROW_COUNT_MIN,
  type BankAccountConfig,
  type FaqEntry,
  type ShopSettings,
} from "@/lib/settings";
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

/**
 * Picks rows by slug and keeps the order, because the order is the setting:
 * the home page renders these in the sequence they appear here.
 *
 * Chosen rows sit at the top with arrows and a remove button; everything else
 * is listed below to be added. A plain checkbox list cannot express order, and
 * a drag handle needs a library and a keyboard fallback to be usable at all.
 */
function SlugPicker({
  options,
  selected,
  onChange,
  empty,
}: {
  options: SettingsCategory[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** What the home page does when nothing is picked. */
  empty: string;
}) {
  const bySlug = new Map(options.map((option) => [option.slug, option.name]));
  const rest = options.filter((option) => !selected.includes(option.slug));

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-[11px] text-neutral-500">
          {empty}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {selected.map((slug, index) => (
            <div
              key={slug}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-neutral-950/40 px-3 py-2"
            >
              <span className="w-5 shrink-0 text-[10px] font-black uppercase tracking-widest text-neutral-600">
                {index + 1}
              </span>
              <span className="flex-1 truncate text-xs font-bold text-white">
                {bySlug.get(slug) ?? slug}
              </span>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label={`Đưa ${bySlug.get(slug) ?? slug} lên trên`}
                className={ICON_BUTTON}
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                disabled={index === selected.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`Đưa ${bySlug.get(slug) ?? slug} xuống dưới`}
                className={ICON_BUTTON}
              >
                <ArrowDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => onChange(selected.filter((entry) => entry !== slug))}
                aria-label={`Bỏ ${bySlug.get(slug) ?? slug}`}
                className={ICON_BUTTON}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {rest.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {rest.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => onChange([...selected, option.slug])}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              + {option.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
  docs,
}: {
  settings: ShopSettings;
  categories: SettingsCategory[];
  docs: SettingsCategory[];
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

  const [accounts, setAccounts] = useState<BankAccountConfig[]>(settings.bankAccounts);

  function updateAccount(index: number, patch: Partial<BankAccountConfig>) {
    setAccounts(accounts.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const [auto, setAuto] = useState(settings.autoTopUpEnabled);
  const [apiKey, setApiKey] = useState(settings.topUpApiKey);
  const [tsSite, setTsSite] = useState(settings.turnstileSiteKey);
  const [tsSecret, setTsSecret] = useState(settings.turnstileSecretKey);
  // Rendered after mount so the copied URL is the host the admin is actually on.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  /**
   * Calls the provider once and reports what came back. Saves nothing and
   * shows no transaction — the point is only "can this shop read that feed".
   */
  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/admin/topups/test", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        hint?: string;
        results?: { bank: string; ok: boolean; itemKeys?: string[] }[];
      };
      if (!response.ok) {
        setTestResult({ ok: false, text: data.error ?? "Không kiểm tra được" });
        return;
      }
      const keys = data.results?.find((row) => row.itemKeys?.length)?.itemKeys;
      setTestResult({
        ok: Boolean(data.ok),
        text: `${data.hint ?? ""}${keys ? ` · Trường đọc được: ${keys.join(", ")}` : ""}`,
      });
    } catch {
      setTestResult({ ok: false, text: "Không kết nối được máy chủ" });
    } finally {
      setTesting(false);
    }
  }

  const [brandName, setBrandName] = useState(settings.brandName);
  const [brandLogo, setBrandLogo] = useState(settings.brandLogo);
  const [brandColor, setBrandColor] = useState(settings.brandColor);
  const [heroBanner, setHeroBanner] = useState(settings.heroBanner);
  const [siteBackground, setSiteBackground] = useState(settings.siteBackground);
  const [siteBgUploading, setSiteBgUploading] = useState(false);
  const [siteBgMsg, setSiteBgMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  /**
   * Uploads the picked file and drops the stored path into the field. Upload
   * is not save — the picture applies only when the admin presses Lưu, like
   * every other picker on this screen.
   */
  async function uploadSiteBackground(file: File) {
    setSiteBgUploading(true);
    setSiteBgMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/site/background", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setSiteBgMsg({ tone: "err", text: data.error ?? "Tải ảnh thất bại" });
        return;
      }
      setSiteBackground(data.url);
      setSiteBgMsg({ tone: "ok", text: "Đã tải ảnh — nhớ bấm Lưu để áp dụng" });
    } catch {
      setSiteBgMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setSiteBgUploading(false);
    }
  }

  const [panelImages, setPanelImages] = useState<string[]>(settings.authPanelImages);
  const [slideOn, setSlideOn] = useState(settings.authSlideEnabled);
  const [slideSeconds, setSlideSeconds] = useState(String(settings.authSlideSeconds));
  // Which picture the preview is showing. Also what the reorder buttons act on.
  const [picked, setPicked] = useState(0);
  const [panelSubtitle, setPanelSubtitle] = useState(settings.authPanelSubtitle);
  const [loginTitle, setLoginTitle] = useState(settings.authLoginTitle);
  const [signupTitle, setSignupTitle] = useState(settings.authSignupTitle);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [zalo, setZalo] = useState(settings.contactZalo);
  const [facebook, setFacebook] = useState(settings.contactFacebook);
  const [hotline, setHotline] = useState(settings.contactHotline);

  const [blocks, setBlocks] = useState(settings.homeBlocks);
  // No longer edited here — the groups table replaced these two rows. They are
  // still sent back untouched so saving this form does not wipe the lists that
  // the group migration reads if it ever has to be run again.
  const [categorySlugs, setCategorySlugs] = useState(settings.homeCategorySlugs);
  const [docSlugs, setDocSlugs] = useState(settings.homeDocSlugs);
  const [rowCount, setRowCount] = useState(String(settings.homeRowCount));

  const [heroTitle, setHeroTitle] = useState(settings.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle);
  const [heroCtaLabel, setHeroCtaLabel] = useState(settings.heroPrimaryLabel);
  const [heroCtaHref, setHeroCtaHref] = useState(settings.heroPrimaryHref);
  const [heroAltLabel, setHeroAltLabel] = useState(settings.heroSecondaryLabel);
  const [heroAltHref, setHeroAltHref] = useState(settings.heroSecondaryHref);
  const [shootingStars, setShootingStars] = useState(settings.heroShootingStars);
  const [heroVideo, setHeroVideo] = useState(settings.heroVideo);
  const [heroVideoUploading, setHeroVideoUploading] = useState(false);
  const [heroVideoMsg, setHeroVideoMsg] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);

  /**
   * Sends the picked file and drops the stored path into the text field.
   * Uploading is not saving: nothing reaches the settings until Lưu, the
   * same contract as every other picker on this screen.
   */
  async function uploadHeroVideo(file: File) {
    setHeroVideoUploading(true);
    setHeroVideoMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/hero/video", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        mode?: "encoded" | "remuxed" | "stored";
        inBytes?: number;
        outBytes?: number;
      };
      if (!res.ok || !data.url) {
        setHeroVideoMsg({ tone: "err", text: data.error ?? "Tải video thất bại" });
        return;
      }
      setHeroVideo(data.url);
      const mb = (n?: number) =>
        typeof n === "number" ? `${(n / 1048576).toFixed(1)}MB` : "?";
      const text =
        data.mode === "encoded"
          ? `Đã nén ${mb(data.inBytes)} → ${mb(data.outBytes)} — nhớ bấm Lưu để áp dụng`
          : data.mode === "remuxed"
            ? `Video đã nhẹ sẵn (${mb(data.outBytes)}), giữ nguyên chất lượng — nhớ bấm Lưu để áp dụng`
            : data.mode === "stored"
              ? `Đã tải video ${mb(data.outBytes)} nhưng server chưa nén được file này — nhớ bấm Lưu để áp dụng`
              : "Đã tải video — nhớ bấm Lưu để áp dụng";
      setHeroVideoMsg({ tone: "ok", text });
    } catch {
      setHeroVideoMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setHeroVideoUploading(false);
    }
  }

  const [seoHeading, setSeoHeading] = useState(settings.seoHeading);
  const [seoBody, setSeoBody] = useState(settings.seoBody);
  const [faq, setFaq] = useState<FaqEntry[]>(settings.seoFaq);

  function updateFaq(index: number, patch: Partial<FaqEntry>) {
    setFaq(faq.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

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

  // The per-section switches and the ordering list below them read and write
  // the same array, so a section switched off in one place is off in both.
  function blockOn(id: string): boolean {
    return blocks.includes(id);
  }

  function setBlockOn(id: string, on: boolean) {
    setBlocks(
      blocks.map((entry) => (entry.replace(/^-/, "") === id ? (on ? id : `-${id}`) : entry)),
    );
  }

  /**
   * The on/off switch a section card carries. A function returning markup
   * rather than a component declared here: a component defined during render
   * is a new type every render, and React throws its state away each time.
   */
  function sectionSwitch(id: string, hint: string) {
    return (
      <Toggle
        checked={blockOn(id)}
        onChange={(next) => setBlockOn(id, next)}
        label="Hiện khối này trên trang chủ"
        hint={hint}
      />
    );
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
          bankAccounts: accounts,
          autoTopUpEnabled: auto,
          topUpApiKey: apiKey,
          turnstileSiteKey: tsSite,
          turnstileSecretKey: tsSecret,
          purchasesEnabled: purchases,
          closedMessage,
          brandName,
          brandLogo,
          brandColor,
          heroBanner,
          siteBackground,
          authPanelImages: panelImages,
          authSlideEnabled: slideOn,
          authSlideSeconds: Number(slideSeconds) || 5,
          authPanelSubtitle: panelSubtitle,
          authLoginTitle: loginTitle,
          authSignupTitle: signupTitle,
          contactZalo: zalo,
          contactFacebook: facebook,
          contactHotline: hotline,
          homeBlocks: blocks,
          homeValorantSlugs: settings.homeValorantSlugs,
          homeTftSlugs: settings.homeTftSlugs,
          homeCategorySlugs: categorySlugs,
          homeDocSlugs: docSlugs,
          homeRowCount: Number(rowCount) || DEFAULT_SETTINGS.homeRowCount,
          heroTitle,
          heroSubtitle,
          heroPrimaryLabel: heroCtaLabel,
          heroPrimaryHref: heroCtaHref,
          heroSecondaryLabel: heroAltLabel,
          heroSecondaryHref: heroAltHref,
          heroVideo,
          heroShootingStars: shootingStars,
          // Blank boxes are not empty claims, they are boxes nobody filled in.
          seoHeading,
          seoBody,
          seoFaq: faq,
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
            <p className="text-[11px] text-neutral-500">
              Khai bao nhiêu ngân hàng cũng được. Khách chọn một bên để chuyển, còn hệ
              thống đối soát tất cả — tiền về bên nào cũng khớp được lệnh nạp.
            </p>

            {accounts.length === 0 ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[11px] font-semibold text-amber-400">
                Chưa có tài khoản nào — tab Ngân Hàng của khách sẽ báo tạm chưa nhận
                chuyển khoản, và máy chủ từ chối tạo lệnh nạp qua ngân hàng.
              </p>
            ) : null}

            {accounts.map((account, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/5 bg-neutral-950/40 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Tài khoản {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAccounts(accounts.filter((_, i) => i !== index))}
                    className="h-7 px-3 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-400 transition-colors"
                  >
                    Xóa
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`bank-code-${index}`} className={LABEL}>
                      Mã ngân hàng
                    </label>
                    <input
                      id={`bank-code-${index}`}
                      value={account.code}
                      onChange={(event) =>
                        updateAccount(index, { code: event.target.value.toUpperCase() })
                      }
                      placeholder="VCB / OCB"
                      className={`${FIELD} font-mono uppercase`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`bank-name-${index}`} className={LABEL}>
                      Tên ngân hàng
                    </label>
                    <input
                      id={`bank-name-${index}`}
                      value={account.name}
                      onChange={(event) => updateAccount(index, { name: event.target.value })}
                      placeholder="Vietcombank"
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor={`bank-number-${index}`} className={LABEL}>
                      Số tài khoản
                    </label>
                    <input
                      id={`bank-number-${index}`}
                      inputMode="numeric"
                      value={account.account}
                      onChange={(event) =>
                        updateAccount(index, { account: event.target.value })
                      }
                      placeholder="0040100036036009"
                      className={`${FIELD} tabular-nums`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`bank-holder-${index}`} className={LABEL}>
                      Chủ tài khoản
                    </label>
                    <input
                      id={`bank-holder-${index}`}
                      value={account.holder}
                      onChange={(event) =>
                        updateAccount(index, { holder: event.target.value.toUpperCase() })
                      }
                      placeholder="NGUYEN VAN A"
                      className={`${FIELD} uppercase`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`bank-api-${index}`} className={LABEL}>
                    Địa chỉ API đối soát của tài khoản này
                  </label>
                  <input
                    id={`bank-api-${index}`}
                    value={account.apiUrl}
                    onChange={(event) => updateAccount(index, { apiUrl: event.target.value })}
                    placeholder="https://api.sieuthicode.vn/..."
                    className={`${FIELD} font-mono`}
                  />
                  <p className={HINT}>
                    Mỗi ngân hàng một đường riêng — token trong đó chỉ đọc được đúng tài
                    khoản này. Dán nguyên cả URL kèm token.
                  </p>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setAccounts([
                  ...accounts,
                  { code: "", name: "", account: "", holder: "", apiUrl: "" },
                ])
              }
              className="self-start h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors"
            >
              + Thêm ngân hàng
            </button>
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
              <p className="text-[11px] text-neutral-500">
                Địa chỉ đối soát khai riêng ở từng ngân hàng phía trên. Nút dưới đây gọi
                thử tất cả và cho biết đọc được giao dịch hay không.
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestConnection}
                  className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors"
                >
                  {testing ? "Đang gọi…" : "Kiểm tra kết nối"}
                </button>
                <span className="text-[11px] text-neutral-500">
                  Lưu cấu hình trước rồi bấm — máy chủ gọi thử và cho biết có đọc được
                  giao dịch không.
                </span>
              </div>

              {testResult ? (
                <p
                  role="status"
                  className={`mt-2.5 rounded-xl border px-4 py-2.5 text-[11px] font-semibold ${
                    testResult.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}
                >
                  {testResult.text}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/5 bg-neutral-950/40 px-4 py-3">
              <span className={LABEL}>Địa chỉ chạy nền 24/7 (khuyến nghị)</span>
              <p className="font-mono text-xs text-neutral-300 break-all">
                {origin}/api/wallet/sync?key=&lt;API-KEY&gt;
              </p>
              <p className="mt-1.5 text-[11px] text-neutral-500">
                Dán vào một dịch vụ hẹn giờ miễn phí (cron-job.org…) và cho chạy mỗi phút,
                thay <span className="font-mono">&lt;API-KEY&gt;</span> bằng key ở trên.
                Không có cái này thì web chỉ đối soát lúc có khách đang mở màn hình chờ —
                khách chuyển tiền xong tắt trang là phải đợi rất lâu.
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

            {auto && !apiKey && !accounts.some((account) => account.apiUrl) ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[11px] font-semibold text-amber-400">
                Bật nạp tự động thì cần địa chỉ API đối soát ở ít nhất một ngân hàng,
                hoặc API key cho webhook — lưu sẽ bị từ chối.
              </p>
            ) : null}

            <div className="border-t border-white/5 pt-5">
              <span className={LABEL}>CAPTCHA đăng nhập (Cloudflare Turnstile)</span>
              <p className={HINT}>
                Lấy hai khóa ở dash.cloudflare.com → Turnstile → Add site. Phải điền
                <span className="font-bold text-neutral-300"> cả hai</span> thì CAPTCHA
                mới bật; để trống một ô là coi như tắt, trang đăng nhập giữ nguyên như cũ.
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ts-site" className={LABEL}>
                    Site key
                  </label>
                  <input
                    id="ts-site"
                    autoComplete="off"
                    value={tsSite}
                    onChange={(event) => setTsSite(event.target.value)}
                    placeholder="0x4AAAAAAA…"
                    className={`${FIELD} font-mono`}
                  />
                  <p className={HINT}>Công khai — nằm trong mã nguồn trang đăng nhập.</p>
                </div>
                <div>
                  <label htmlFor="ts-secret" className={LABEL}>
                    Secret key
                  </label>
                  <input
                    id="ts-secret"
                    type="password"
                    autoComplete="off"
                    value={tsSecret}
                    onChange={(event) => setTsSecret(event.target.value)}
                    placeholder="0x4AAAAAAA…"
                    className={`${FIELD} font-mono`}
                  />
                  <p className={HINT}>
                    Bí mật — chỉ máy chủ dùng để hỏi Cloudflare. Đừng dán ra ngoài.
                  </p>
                </div>
              </div>

              {Boolean(tsSite) !== Boolean(tsSecret) ? (
                <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[11px] font-semibold text-amber-400">
                  Mới có một khóa. CAPTCHA vẫn đang tắt cho tới khi điền đủ cả hai.
                </p>
              ) : null}
            </div>

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

            <div>
              <span className={LABEL}>Ảnh nền toàn web</span>
              <div className="flex flex-col gap-3 sm:flex-row">
                {/* Preview at the backdrop's own wide shape, under the same 70%
                    dim it gets on the page, so this shows what visitors see. */}
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#111111] sm:w-[200px]">
                  {siteBackground ? (
                    // A plain img: the value can be any path the shop typed, and
                    // next/image would need each one in its allow-list.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={siteBackground}
                      alt="Xem trước ảnh nền toàn web"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[#0a0a0d]/70" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    value={siteBackground}
                    onChange={(event) => setSiteBackground(event.target.value)}
                    className={`${FIELD} font-mono`}
                    placeholder="/uploads/site/… hoặc đường dẫn ảnh"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-colors hover:bg-white/10 ${
                        siteBgUploading ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      <Upload size={13} />
                      {siteBgUploading ? "Đang tải lên…" : "Chọn ảnh từ máy"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void uploadSiteBackground(file);
                        }}
                      />
                    </label>
                    <span className="text-[10px] text-neutral-600">
                      PNG / JPG / WebP · tối thiểu 960×540
                    </span>
                  </div>
                  {siteBgMsg ? (
                    <p
                      role="alert"
                      className={
                        siteBgMsg.tone === "ok"
                          ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-400"
                          : "rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-400"
                      }
                    >
                      {siteBgMsg.text}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className={HINT}>
                Ảnh cố định phía sau mọi trang, đã phủ tối 70% để chữ dễ đọc. Để trống thì
                dùng lại ảnh mặc định.
              </p>
            </div>
          </section>

          <section className={CARD}>
            <span className={HEADING}>Bố cục trang đăng nhập / đăng ký</span>
            <p className="text-[11px] text-neutral-500 -mt-2">
              Ảnh lớn bên trái hai trang đó, và dòng chữ đè lên nó.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Preview at the panel's own shape — tall and half a card — so
                  what is judged here is what the visitor will see, not a
                  square thumbnail of the same file. */}
              <div className="relative w-full sm:w-[150px] shrink-0 aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-[#111111]">
                {panelImages[Math.min(picked, panelImages.length - 1)] ? (
                  // A plain img: the value can be any path the shop typed, and
                  // next/image would need each one in its allow-list.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={panelImages[Math.min(picked, panelImages.length - 1)]}
                    alt="Xem trước ảnh nền trang đăng nhập"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-center">
                  <span className="block text-[7px] font-black uppercase tracking-[0.4em] text-[var(--menzu-accent)]">
                    {panelSubtitle}
                  </span>
                  <span className="mt-0.5 block text-[15px] font-black uppercase leading-none text-white">
                    {loginTitle.split("\n").map((line, index) => (
                      <span key={index} className="block">
                        {line}
                      </span>
                    ))}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div>
                  <span className={LABEL}>
                    Danh sách ảnh ({panelImages.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {panelImages.map((src, index) => (
                      <div
                        key={`${src}-${index}`}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                          index === picked
                            ? "border-[var(--menzu-accent)]/50 bg-[var(--menzu-accent)]/10"
                            : "border-white/10 bg-neutral-950/60"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setPicked(index)}
                          title="Xem trước ảnh này"
                          className="flex-1 min-w-0 truncate text-left font-mono text-[11px] text-neutral-300"
                        >
                          {index + 1}. {src}
                        </button>
                        <button
                          type="button"
                          className={ICON_BUTTON}
                          disabled={index === 0}
                          aria-label="Đưa lên trên"
                          onClick={() => {
                            const next = [...panelImages];
                            [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                            setPanelImages(next);
                            setPicked(index - 1);
                          }}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className={ICON_BUTTON}
                          disabled={index === panelImages.length - 1}
                          aria-label="Đưa xuống dưới"
                          onClick={() => {
                            const next = [...panelImages];
                            [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                            setPanelImages(next);
                            setPicked(index + 1);
                          }}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          // The last one cannot go: an empty list renders a
                          // panel with no image source, which throws and takes
                          // the sign-in page with it.
                          disabled={panelImages.length === 1}
                          title={
                            panelImages.length === 1
                              ? "Phải còn ít nhất một ảnh"
                              : "Xóa ảnh này"
                          }
                          aria-label="Xóa ảnh"
                          onClick={() => {
                            setPanelImages(panelImages.filter((_, i) => i !== index));
                            setPicked(0);
                          }}
                          className="h-7 w-7 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-30 disabled:hover:bg-red-500/10 inline-flex items-center justify-center"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className={HINT}>
                    JPG, PNG hoặc WebP · tối thiểu 600×600px · tối đa 5MB. Ảnh dọc hợp
                    hơn vì khung bên trái cao gấp đôi chiều ngang. Thứ tự ở đây là thứ
                    tự chạy.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className={`inline-flex h-9 cursor-pointer items-center rounded-lg bg-[var(--menzu-accent)] px-4 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] ${
                      uploading ? "opacity-70 cursor-wait" : ""
                    }`}
                  >
                    {uploading ? "Đang tải…" : "Thêm ảnh"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        // Cleared straight away so picking the same file twice
                        // after a failure still fires a change event.
                        event.target.value = "";
                        if (!file) return;

                        setUploading(true);
                        setUploadError(null);
                        try {
                          const body = new FormData();
                          body.append("file", file);
                          const response = await fetch("/api/admin/auth-panel", {
                            method: "POST",
                            body,
                          });
                          const data = (await response.json().catch(() => ({}))) as {
                            url?: string;
                            error?: string;
                          };
                          if (!response.ok || !data.url) {
                            setUploadError(data.error ?? "Không tải được ảnh lên");
                            return;
                          }
                          // Appended rather than replacing: adding a second
                          // picture is what this button is for, and the list
                          // is what gets saved.
                          setPanelImages((current) => [...current, data.url!]);
                          setPicked(panelImages.length);
                        } catch {
                          setUploadError("Không kết nối được máy chủ");
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setPanelImages(DEFAULT_SETTINGS.authPanelImages);
                      setPicked(0);
                      setUploadError(null);
                    }}
                    className="h-9 rounded-lg border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/10"
                  >
                    Khôi phục ảnh mặc định
                  </button>
                </div>

                <div className="rounded-lg border border-white/10 bg-neutral-950/40 px-3 py-3 flex flex-col gap-3">
                  <Toggle
                    checked={slideOn}
                    onChange={setSlideOn}
                    label="Tự động chuyển ảnh"
                    hint="Chỉ chạy khi có từ 2 ảnh trở lên. Một ảnh thì panel đứng yên."
                  />
                  <div className="flex items-center gap-2">
                    <label htmlFor="slide-seconds" className="text-[11px] text-neutral-400">
                      Mỗi ảnh giữ
                    </label>
                    <input
                      id="slide-seconds"
                      type="number"
                      min={2}
                      max={60}
                      value={slideSeconds}
                      onChange={(event) => setSlideSeconds(event.target.value)}
                      disabled={!slideOn}
                      className={`${FIELD} w-20 disabled:opacity-40`}
                    />
                    <span className="text-[11px] text-neutral-400">giây (2–60)</span>
                  </div>
                </div>

                {uploadError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[11px] font-semibold text-red-400"
                  >
                    {uploadError}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label htmlFor="auth-subtitle" className={LABEL}>
                Dòng nhỏ phía trên
              </label>
              <input
                id="auth-subtitle"
                value={panelSubtitle}
                onChange={(event) => setPanelSubtitle(event.target.value)}
                className={FIELD}
              />
              <p className={HINT}>Hiện trên cả hai trang, chữ nhỏ màu đỏ.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="auth-login-title" className={LABEL}>
                  Tiêu đề lớn — trang đăng nhập
                </label>
                <textarea
                  id="auth-login-title"
                  rows={2}
                  value={loginTitle}
                  onChange={(event) => setLoginTitle(event.target.value)}
                  className={`${FIELD} resize-y`}
                />
                <p className={HINT}>Mỗi dòng xuống hàng là một dòng chữ trên ảnh.</p>
              </div>
              <div>
                <label htmlFor="auth-signup-title" className={LABEL}>
                  Tiêu đề lớn — trang đăng ký
                </label>
                <textarea
                  id="auth-signup-title"
                  rows={2}
                  value={signupTitle}
                  onChange={(event) => setSignupTitle(event.target.value)}
                  className={`${FIELD} resize-y`}
                />
                <p className={HINT}>Ví dụ: Join / Us.</p>
              </div>
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
            <span className={HEADING}>Hero</span>
            {sectionSwitch("hero", "Tắt thì trang chủ bắt đầu thẳng từ khối kế tiếp.")}

            <div>
              <span className={LABEL}>Tiêu đề H1</span>
              <textarea
                value={heroTitle}
                onChange={(event) => setHeroTitle(event.target.value)}
                rows={2}
                className={`${FIELD} resize-y`}
              />
              <p className={HINT}>
                Mỗi dòng ở đây là một dòng trên trang chủ. Thiết kế dựng cho hai dòng.
              </p>
            </div>

            <div>
              <span className={LABEL}>Mô tả</span>
              <textarea
                value={heroSubtitle}
                onChange={(event) => setHeroSubtitle(event.target.value)}
                rows={3}
                className={`${FIELD} resize-y`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className={LABEL}>Nút chính — chữ</span>
                <input
                  value={heroCtaLabel}
                  onChange={(event) => setHeroCtaLabel(event.target.value)}
                  className={FIELD}
                />
              </div>
              <div>
                <span className={LABEL}>Nút chính — link</span>
                <input
                  value={heroCtaHref}
                  onChange={(event) => setHeroCtaHref(event.target.value)}
                  className={FIELD}
                  placeholder="/categories"
                />
              </div>
              <div>
                <span className={LABEL}>Nút phụ — chữ</span>
                <input
                  value={heroAltLabel}
                  onChange={(event) => setHeroAltLabel(event.target.value)}
                  className={FIELD}
                  placeholder="Để trống thì ẩn nút phụ"
                />
              </div>
              <div>
                <span className={LABEL}>Nút phụ — link</span>
                <input
                  value={heroAltHref}
                  onChange={(event) => setHeroAltHref(event.target.value)}
                  className={FIELD}
                  placeholder="/docs"
                />
              </div>
            </div>

            <div>
              <span className={LABEL}>Video hero</span>
              <input
                value={heroVideo}
                onChange={(event) => setHeroVideo(event.target.value)}
                className={FIELD}
                placeholder="/videos/hero.mp4 — để trống thì dùng ảnh"
              />

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label
                  className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-colors hover:bg-white/10 ${
                    heroVideoUploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <Upload size={13} />
                  {heroVideoUploading ? "Đang tải & nén video…" : "Chọn video từ máy"}
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      // Cleared so picking the same file twice fires change
                      // again — otherwise a failed upload could not be retried
                      // with that file.
                      event.target.value = "";
                      if (file) void uploadHeroVideo(file);
                    }}
                  />
                </label>
                <span className="text-[10px] text-neutral-600">
                  MP4 / WebM · tối đa 200MB · server tự nén sau khi tải lên, file nặng
                  chờ 1–3 phút
                </span>
              </div>

              {heroVideoMsg ? (
                <p
                  role="alert"
                  className={
                    heroVideoMsg.tone === "ok"
                      ? "mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-400"
                      : "mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-400"
                  }
                >
                  {heroVideoMsg.text}
                </p>
              ) : null}

              <p className={HINT}>
                Có video thì video thay chỗ ảnh, ảnh banner ở thẻ Nhận diện thành khung
                chờ trong lúc video tải. Video chạy tự động, lặp lại và luôn tắt tiếng.
              </p>
            </div>

            <Toggle
              checked={shootingStars}
              onChange={setShootingStars}
              label="Hiệu ứng sao băng"
              hint="Vài vệt sao băng chạy chéo phía sau hero. Tắt thì chỉ còn nền sao tĩnh lấp lánh."
            />
          </section>

          <section className={CARD}>
            <span className={HEADING}>Danh mục sản phẩm</span>
            {sectionSwitch("featured", "Cụm 4 thẻ lớn ngay dưới hero.")}
            <SlugPicker
              options={categories}
              selected={categorySlugs}
              onChange={setCategorySlugs}
              empty="Chưa chọn danh mục nào — trang chủ giữ 4 thẻ mặc định như hiện tại."
            />
            <p className={HINT}>
              Thẻ lấy ảnh và tên từ chính danh mục. Danh mục chưa có ảnh sẽ bị bỏ qua vì
              thẻ gần như toàn là ảnh.
            </p>
          </section>

          <section className={CARD}>
            <span className={HEADING}>Xem hướng dẫn</span>
            {sectionSwitch("docs", "Các bài trong mục Wiki & hướng dẫn.")}
            <SlugPicker
              options={docs}
              selected={docSlugs}
              onChange={setDocSlugs}
              empty="Chưa chọn bài nào — trang chủ lấy 4 bài đầu trong nhóm Hướng dẫn."
            />
          </section>

          <section className={CARD}>
            <span className={HEADING}>Hàng sản phẩm</span>

            <div className="max-w-[200px]">
              <span className={LABEL}>Số thẻ mỗi hàng</span>
              <input
                type="number"
                min={ROW_COUNT_MIN}
                max={ROW_COUNT_MAX}
                value={rowCount}
                onChange={(event) => setRowCount(event.target.value)}
                className={FIELD}
              />
              <p className={HINT}>
                Áp dụng cho cả bốn hàng thẻ. Cắt bớt chứ không bỏ chọn, nên tăng lại là
                các mục cũ quay về.
              </p>
            </div>

            <div className="border-t border-white/[0.07] pt-4">
              <span className={LABEL}>Các nhóm danh mục</span>
              {sectionSwitch("groups", "Toàn bộ hàng nhóm, theo thứ tự đã sắp.")}
              <p className={HINT}>
                Tên nhóm và danh mục trong từng nhóm nằm ở{" "}
                <a href="/admin/groups" className="font-bold text-[var(--menzu-accent)] underline">
                  Nhóm danh mục
                </a>
                . Một danh mục nằm được trong nhiều nhóm mà vẫn chỉ là một bản ghi, nên sửa
                tên hay ảnh một lần là mọi nhóm cùng đổi.
              </p>
            </div>
          </section>


          <section className={CARD}>
            <span className={HEADING}>SEO Content</span>
            {sectionSwitch("seo", "Đoạn chữ và FAQ ở cuối trang chủ.")}

            <div>
              <span className={LABEL}>Tiêu đề</span>
              <input
                value={seoHeading}
                onChange={(event) => setSeoHeading(event.target.value)}
                className={FIELD}
                placeholder="Ví dụ: Mua acc Valorant giá rẻ, uy tín"
              />
            </div>

            <div>
              <span className={LABEL}>Nội dung</span>
              <textarea
                value={seoBody}
                onChange={(event) => setSeoBody(event.target.value)}
                rows={6}
                className={`${FIELD} resize-y`}
              />
              <p className={HINT}>
                Cách một dòng trống để sang đoạn mới. Nội dung hiện ra đúng như chữ bạn
                gõ, thẻ HTML sẽ không chạy.
              </p>
            </div>

            <div>
              <span className={LABEL}>FAQ</span>
              <div className="flex flex-col gap-2">
                {faq.map((entry, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-xl border border-white/5 bg-neutral-950/40 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={entry.q}
                        onChange={(event) => updateFaq(index, { q: event.target.value })}
                        aria-label={`Câu hỏi ${index + 1}`}
                        className={FIELD}
                        placeholder="Câu hỏi"
                      />
                      <button
                        type="button"
                        onClick={() => setFaq(faq.filter((_, i) => i !== index))}
                        aria-label={`Xóa câu hỏi ${index + 1}`}
                        className={ICON_BUTTON}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <textarea
                      value={entry.a}
                      onChange={(event) => updateFaq(index, { a: event.target.value })}
                      aria-label={`Trả lời ${index + 1}`}
                      rows={2}
                      className={`${FIELD} resize-y`}
                      placeholder="Câu trả lời"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFaq([...faq, { q: "", a: "" }])}
                className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                + Thêm câu hỏi
              </button>
              <p className={HINT}>
                Câu hỏi thiếu phần trả lời sẽ bị bỏ khi lưu. Danh sách này cũng được gắn
                dữ liệu FAQ cho Google đọc.
              </p>
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
