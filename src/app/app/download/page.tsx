import type { Metadata } from "next";
import Image from "next/image";
import {
  Apple,
  BellRing,
  CheckCircle2,
  Download,
  Package,
  Smartphone,
  Zap,
} from "lucide-react";
import QRCode from "qrcode";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { FaqAccordion, type FaqEntry } from "@/components/sites/menzu-lol-f7ae197a/shared/FaqAccordion";
import { getAppRelease } from "@/lib/queries";
import { SITE_URL } from "@/lib/seo";

const IMAGES = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images";
const BACKDROP = `${IMAGES}/behance/e4307d166239615.6418bdb0084a4.webp`;
const APP_ICON = `${IMAGES}/app/iconapp.webp`;
const SCREENSHOTS = [11, 22, 33, 44, 55, 66].map((n) => `${IMAGES}/app/wlist${n}.webp`);

export const metadata: Metadata = {
  title: "Tải App Menzu Valorant",
  description:
    "Tải ứng dụng Menzu Valorant cho Android và iOS — theo dõi Daily Shop, nhận thông báo đẩy khi skin yêu thích xuất hiện, quản lý kho đồ và số dư VP/RP.",
  alternates: { canonical: "/app/download" },
};

const FEATURES = [
  {
    icon: BellRing,
    title: "Theo Dõi Cửa Hàng Ngày",
    body: "Nhận thông báo đẩy ngay lập tức khi skin yêu thích xuất hiện tại Daily Shop của bất kỳ tài khoản nào.",
  },
  {
    icon: Package,
    title: "Quản Lý Kho Đồ Tự Động",
    body: "Quét và thống kê chi tiết kho đồ skin súng, xem số dư VP/RP, hiển thị xếp hạng rank với giao diện trực quan.",
  },
  {
    icon: Zap,
    title: "Giao Dịch Siêu Tốc",
    body: "Hỗ trợ các giao dịch tự động nhanh chóng, bảo mật thông tin tối đa và xử lý tức thì chỉ trong vài giây.",
  },
];

const ANDROID_STEPS = [
  {
    title: "Tải tệp tin cài đặt",
    body: "Bấm vào nút tải màu xanh để tải trực tiếp tệp .apk về máy.",
  },
  {
    title: "Cấp quyền cài đặt ứng dụng",
    body: 'Nếu hệ thống chặn nguồn lạ, chọn Cài đặt rồi bật "Cho phép từ nguồn này".',
  },
  {
    title: "Mở app & trải nghiệm",
    body: "Mở ứng dụng, đăng nhập Riot và bắt đầu theo dõi Daily Shop.",
  },
];

const IOS_METHODS = [
  {
    title: "Cách 1: Sideload qua PC (miễn phí)",
    body: "Tải tệp .ipa, kết nối iPhone với máy tính qua cáp và dùng Sideloadly để cài. Cần cắm lại máy tính để ký lại sau mỗi 7 ngày.",
  },
  {
    title: "Cách 2: Dùng chứng chỉ ký",
    body: "Dùng chứng chỉ (miễn phí hoặc trả phí) để cài và ký trực tiếp trên điện thoại qua ESign hoặc Scarlet, không cần PC.",
  },
];

const FAQ: FaqEntry[] = [
  {
    question: "Tải và cài đặt ứng dụng Android (APK) như thế nào?",
    answer:
      "Bấm nút tải APK ở đầu trang để tải tệp về điện thoại, sau đó mở tệp và cài đặt. Nếu máy cảnh báo ứng dụng không rõ nguồn gốc, vào Cài đặt → Bảo mật và bật cho phép cài từ nguồn không xác định.",
  },
  {
    question: "Tải và cài đặt ứng dụng iOS (IPA) như thế nào?",
    answer:
      "Bấm nút tải IPA để tải tệp về máy tính, rồi sideload lên iPhone bằng Sideloadly, AltStore, TrollStore hoặc thông qua chứng chỉ ký app của bên thứ ba.",
  },
  {
    question: "Tại sao ứng dụng không có trên Google Play hoặc App Store?",
    answer:
      "Ứng dụng đang trong giai đoạn thử nghiệm và tối ưu hiệu năng, nên hiện được phát hành dưới dạng tệp cài đặt trực tiếp để người dùng trải nghiệm sớm.",
  },
  {
    question: "Đăng nhập tài khoản Riot Games vào app có an toàn không?",
    answer:
      "Ứng dụng dùng cổng đăng nhập chính thức Riot Sign-On. Thông tin được gửi thẳng tới máy chủ Riot để lấy token đọc dữ liệu; ứng dụng không lưu trữ và không nhìn thấy mật khẩu của bạn.",
  },
  {
    question: "Bật thông báo đẩy Daily Shop như thế nào?",
    answer:
      'Sau khi đăng nhập và quét tài khoản, vào mục "Cài đặt thông báo" (Watchlist), chọn tài khoản và bật tính năng. Khi cửa hàng xoay tua có skin trong Watchlist, hệ thống gửi thông báo ngay lên điện thoại.',
  },
];

const SECTION_HEADING = "text-2xl sm:text-3xl font-black uppercase tracking-wider text-white";
const STAT_LABEL = "text-neutral-500 uppercase text-[8px] tracking-wider font-extrabold";

export default async function AppDownloadPage() {
  const release = await getAppRelease();

  // The QR encodes this page rather than the binary: it always resolves, and
  // scanning it on a phone lands you where the right build can be chosen.
  const qr = await QRCode.toDataURL(`${SITE_URL}/app/download`, {
    margin: 0,
    width: 198,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const released = release
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(release.releasedAt)
    : "—";

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="text-white overflow-hidden pt-4 sm:pt-12 pb-12 px-4 sm:px-6 lg:px-8 relative font-sans">
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] scale-105">
              <Image src={BACKDROP} alt="" fill sizes="100vw" className="object-cover object-center" />
            </div>
          </div>

          <div className="max-w-6xl mx-auto relative z-10 space-y-12 sm:space-y-20">
            {/* Hero: identity and download card on the left, screenshots right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4 sm:pt-8">
              <div className="lg:col-span-5 space-y-8 sm:space-y-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 max-w-[460px] mx-auto lg:mx-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-[24%] overflow-hidden border border-zinc-800 shadow-2xl relative">
                    <Image src={APP_ICON} alt="Biểu tượng ứng dụng Menzu Valorant" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h1 className="text-lg sm:text-2xl lg:text-[25px] font-extrabold leading-snug text-white tracking-tight">
                      Menzu Valorant App
                    </h1>
                    <p className="text-neutral-400 text-[11px] sm:text-xs leading-relaxed">
                      Theo dõi Daily Shop, nhận thông báo đẩy tức thì và quản lý
                      tài khoản Valorant dễ dàng ở bất cứ nơi nào bạn đến.
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-7 bg-[#121216] border border-zinc-800/80 rounded-2xl max-w-[460px] mx-auto lg:mx-0 space-y-5 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-[115px] h-[115px] bg-white p-2 rounded-xl shrink-0 hidden sm:flex items-center justify-center sm:-translate-y-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element -- generated data URI, nothing for the image optimiser to fetch */}
                      <img src={qr} alt="Mã QR mở trang tải app" width={99} height={99} className="object-contain" />
                    </div>

                    <div className="w-full sm:flex-1 flex flex-col gap-2.5">
                      <DownloadButton
                        href={release?.androidUrl ?? null}
                        label="Tải Android (.apk)"
                        note="★ Khuyên dùng — xem hướng dẫn cài đặt"
                        tone="android"
                      />
                      <DownloadButton
                        href={release?.iosUrl ?? null}
                        label="Tải iOS (.ipa)"
                        note="IPA không hỗ trợ thông báo đẩy"
                        tone="ios"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-500 leading-normal hidden sm:block">
                    * Quét mã QR để mở trang này trên điện thoại.
                  </p>

                  <div className="pt-5 border-t border-zinc-800/50 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-neutral-400">
                    <div className="flex flex-col gap-1 border-r border-zinc-800/50">
                      <span className={STAT_LABEL}>Phiên bản</span>
                      <span className="text-white">
                        {release ? `v${release.version} (${release.buildNumber})` : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 border-r border-zinc-800/50">
                      <span className={STAT_LABEL}>Cập nhật</span>
                      <span className="text-white">{released}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={STAT_LABEL}>Dung lượng</span>
                      <span className="text-white">{release?.sizeLabel ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Native scroll-snap rather than a JS carousel: it keeps
                  keyboard, touch and trackpad behaviour for free. */}
              <div className="lg:col-span-7 w-full lg:max-w-[576px] lg:ml-auto relative py-4">
                <div className="flex gap-[18px] overflow-x-auto py-4 px-4 lg:px-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {SCREENSHOTS.map((src, index) => (
                    <div key={src} className="w-[180px] h-[390px] shrink-0 snap-start relative">
                      <Image
                        src={src}
                        alt={`Ảnh chụp màn hình ứng dụng ${index + 1}`}
                        fill
                        sizes="180px"
                        className="object-cover rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.35)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <section className="space-y-8">
              <header className="text-center space-y-2">
                <h2 className={SECTION_HEADING}>Tính Năng Nổi Bật</h2>
                <p className="text-xs text-neutral-400">
                  Khám phá các tính năng được thiết kế tối ưu cho trải nghiệm của bạn.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="p-6 rounded-2xl border border-zinc-800/80 bg-[#121216] space-y-3 hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">{title}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="detailed-guide" className="space-y-8 scroll-mt-28">
              <header className="text-center space-y-2">
                <h2 className={SECTION_HEADING}>Hướng Dẫn Cài Đặt Chi Tiết</h2>
                <p className="text-xs text-neutral-400">
                  Thực hiện theo các bước dưới đây để cài ứng dụng lên thiết bị.
                </p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div id="android-guide" className="p-6 rounded-2xl border border-zinc-800/80 bg-[#121216] space-y-5 scroll-mt-28">
                  <div className="flex items-center gap-3">
                    <Smartphone size={18} className="text-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Cài Đặt Android</h3>
                    <span className="ml-auto text-[10px] font-bold text-neutral-500">
                      {release?.minAndroid ?? "—"}
                    </span>
                  </div>

                  <ol className="space-y-4">
                    {ANDROID_STEPS.map((step, index) => (
                      <li key={step.title} className="flex gap-3">
                        <span className="w-6 h-6 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white">{step.title}</h4>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">{step.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div id="ios-guide" className="p-6 rounded-2xl border border-zinc-800/80 bg-[#121216] space-y-5 scroll-mt-28">
                  <div className="flex items-center gap-3">
                    <Apple size={18} className="text-neutral-300" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Cài Đặt iOS</h3>
                    <span className="ml-auto text-[10px] font-bold text-neutral-500">
                      {release?.minIos ?? "—"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {IOS_METHODS.map((method) => (
                      <div key={method.title} className="space-y-1">
                        <h4 className="text-xs font-bold text-white">{method.title}</h4>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">{method.body}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2 leading-relaxed">
                    Lưu ý: bản iOS (.ipa) không hỗ trợ nhận thông báo đẩy.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-8 max-w-3xl mx-auto w-full">
              <header className="text-center space-y-2">
                <h2 className={SECTION_HEADING}>Câu Hỏi Thường Gặp</h2>
                <p className="text-xs text-neutral-400">
                  Giải đáp nhanh một số thắc mắc phổ biến.
                </p>
              </header>

              <FaqAccordion entries={FAQ} />
            </section>
          </div>
        </div>

        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}

/**
 * A download link, or an explicit unavailable state.
 *
 * This clone hosts no binaries, so the URLs are null until someone puts real
 * builds under public/downloads/ and sets them on the AppRelease row. A
 * disabled control that says so beats a live-looking button that 404s.
 */
function DownloadButton({
  href,
  label,
  note,
  tone,
}: {
  href: string | null;
  label: string;
  note: string;
  tone: "android" | "ios";
}) {
  const enabled =
    tone === "android"
      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
      : "bg-[#18181b] hover:bg-[#27272a] border border-zinc-800 text-neutral-300";

  return (
    <div className="w-full flex flex-col items-center">
      {href ? (
        <a
          href={href}
          download
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${enabled}`}
        >
          <Download size={14} />
          <span>{label}</span>
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="w-full py-2.5 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-neutral-500 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Download size={14} />
          <span>{label} — chưa có bản tải</span>
        </span>
      )}

      <a
        href="#detailed-guide"
        className={`text-[10px] mt-1.5 font-bold flex items-center gap-1 hover:underline ${
          tone === "android" ? "text-emerald-500" : "text-neutral-500"
        }`}
      >
        {tone === "android" ? <CheckCircle2 size={11} /> : null}
        {note}
      </a>
    </div>
  );
}
