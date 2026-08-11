import Image from "next/image";

const IMG = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site";

interface PaymentChip {
  src: string;
  alt: string;
}

const PAYMENTS: PaymentChip[] = [
  { src: `${IMG}/images/acb.png`, alt: "ACB" },
  { src: `${IMG}/images/momo.png`, alt: "MoMo" },
  { src: `${IMG}/images/zalopay.png`, alt: "ZaloPay" },
  { src: `${IMG}/images/vnpay.png`, alt: "VNPay" },
  { src: `${IMG}/images/paypal.png`, alt: "PayPal" },
  { src: `${IMG}/images/crypto.png`, alt: "Crypto" },
];

interface FooterColumn {
  heading: string;
  links: string[];
}

const COLUMNS: FooterColumn[] = [
  {
    heading: "Về chúng tôi",
    links: ["Tin tức & Sự kiện", "Liên hệ", "Góp ý & Khiếu nại", "Cộng đồng"],
  },
  {
    heading: "Mua sắm",
    links: ["Thu cũ đổi mới", "Acc Valorant"],
  },
  {
    heading: "Công cụ",
    links: [
      "Check Skin Valorant",
      "Valorant Build",
      "Check Thư Welcome",
      "Trình Tạo Mã 2FA",
    ],
  },
  {
    heading: "Valorant Hub",
    links: [
      "Crosshair Library",
      "Lineups & Callouts",
      "Tìm Bạn Leo Rank",
      "Nhận Acc Free",
    ],
  },
];

/* The live site serves these four social glyphs from icons8 with signed query
 * strings that cannot be re-hosted; inline brand paths stand in at the same 20px box. */
function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function YoutubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
      <path d="M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.5 2.5 0 0 0-1.77 1.77A26.1 26.1 0 0 0 2 12a26.1 26.1 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77A26.1 26.1 0 0 0 22 12a26.1 26.1 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z" />
    </svg>
  );
}

function MessengerGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
      <path d="M12 2C6.3 2 2 6.2 2 11.7c0 2.9 1.2 5.4 3.2 7.2.2.2.3.4.3.6l.1 1.8c0 .6.6 1 1.1.7l2-.9c.2-.1.4-.1.6-.1 1 .3 2 .4 3 .4 5.7 0 10-4.2 10-9.7S17.7 2 12 2Zm6 7.5-2.9 4.6c-.5.7-1.4.9-2.1.4l-2.3-1.7a.6.6 0 0 0-.7 0l-3.1 2.4c-.4.3-.9-.2-.7-.7l2.9-4.6c.5-.7 1.4-.9 2.1-.4l2.3 1.7c.2.2.5.2.7 0l3.1-2.4c.4-.3.9.2.7.7Z" />
    </svg>
  );
}

function ZaloGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
      <path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.7 1.4 5.1 3.6 6.7-.1.9-.5 2.2-1.3 3.2-.2.3.1.7.4.6 1.9-.5 3.3-1.3 4.1-1.9.9.2 1.9.3 2.9.3 5.5 0 10-3.9 10-8.7S17.5 2 12 2Zm-4.6 6.1h3.4v.9L8.5 12.5h2.4v1H7.2v-.9l2.3-3.6H7.4v-.9Zm4.6 0h1v5.4h-1V8.1Zm3.6 1.4c1.2 0 2.1.9 2.1 2s-.9 2-2.1 2-2.1-.9-2.1-2 .9-2 2.1-2Zm0 .9c-.6 0-1.1.5-1.1 1.1s.5 1.1 1.1 1.1 1.1-.5 1.1-1.1-.5-1.1-1.1-1.1Z" />
    </svg>
  );
}

const SOCIALS = [FacebookGlyph, YoutubeGlyph, MessengerGlyph, ZaloGlyph];

function SocialIcons() {
  return (
    <div className="flex items-center gap-4">
      {SOCIALS.map((Glyph, i) => (
        <a
          key={i}
          href="#"
          className="block select-none hover:opacity-80 transition-opacity text-neutral-300"
        >
          <Glyph />
        </a>
      ))}
    </div>
  );
}

const SOCIAL_LABEL = "THEO DÕI & KẾT NỐI";

export function SiteFooter() {
  return (
    <footer className="relative z-10 w-full bg-[#050508] border-t border-white/10 mt-auto">
      <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-12 pb-28 sm:py-12 flex flex-col">
        {/* Row 1 — payment chips + (desktop) socials */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-8 border-b border-white/5 gap-6">
          <div className="flex flex-wrap items-center gap-2">
            {PAYMENTS.map((p, i) => (
              <div
                key={p.alt}
                className={`bg-white px-2.5 py-1 rounded-[4px] h-[26px] ${
                  i === 0 ? "flex" : "hidden sm:flex"
                } items-center justify-center select-none shadow-sm`}
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={40}
                  height={14}
                  className="h-3.5 w-auto object-contain"
                />
              </div>
            ))}
          </div>

          <div className="hidden lg:flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest select-none">
              {SOCIAL_LABEL}
            </span>
            <SocialIcons />
          </div>
        </div>

        {/* Row 2 — 4 link columns + 2-col promo block */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 py-10 border-b border-white/5">
          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <h4 className="text-white font-bold uppercase tracking-wider text-xs select-none">
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-3 text-xs font-semibold text-neutral-400">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 flex flex-col items-start lg:items-end justify-start">
            <div className="lg:hidden flex items-center gap-5 mb-6">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest select-none">
                {SOCIAL_LABEL}
              </span>
              <SocialIcons />
            </div>

            <div className="w-full max-w-[320px] h-[90px] rounded-xl border border-indigo-500/20 pl-16 pr-4 py-4 flex items-center justify-between shadow-lg relative overflow-hidden bg-[#0d0d12]">
              <Image
                src={`${IMG}/logos/menzu-logo.png`}
                alt="Menzu"
                width={34}
                height={34}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-[34px] h-[34px] object-contain"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-wide text-white leading-tight">
                  SĂN VOUCHER GIẢM TỚI 90%
                </span>
                <span className="text-[10px] text-neutral-400 leading-tight">
                  Hãy tải ứng dụng ngay bây giờ!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3 — copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-center md:justify-start gap-3">
          <Image
            src={`${IMG}/logos/menzu-logo.png`}
            alt="Menzu"
            width={28}
            height={28}
            className="hidden md:block w-7 h-7 object-contain"
          />
          <div className="flex flex-col md:flex-row items-center gap-1.5 md:gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <span className="text-neutral-400">© 2026 MENZU VALORANT</span>
            <span className="mx-2 text-white/10 select-none">•</span>
            <span className="text-neutral-400/70">ALL RIGHTS RESERVED</span>
            <span className="hidden md:inline mx-2 text-white/10 select-none">•</span>
            <span className="text-neutral-400/50">DESIGNED &amp; DEVELOPED BY</span>
            <span className="text-neutral-300">MENZU</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
