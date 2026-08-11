import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Crosshair, Gift, Target } from "lucide-react";

const MAIN_ART_SRC =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/images/valorant-hero.png";
const TRADE_ART_SRC =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/external/cmsassets-rgpub-io/0c67438c8b3a418b5ca28f9f234506745493ae42-854x484.png";

const MAIN_EYEBROW = "VALORANT UTILITIES HUB";
const MAIN_PARAGRAPH =
  "Nơi tổng hợp tất cả các công cụ và tài nguyên hữu ích hỗ trợ game thủ tối ưu hóa trải nghiệm chơi game và leo rank Valorant hiệu quả hơn.";
const MAIN_CTA = "Khám Phá Ngay";

const TRADE_EYEBROW = "THU CŨ ĐỔI MỚI";
const TRADE_PARAGRAPH =
  "Định giá nhanh chóng sát thị trường dựa trên skin thực tế.";
const TRADE_CTA = "Trade ngay";

interface UtilityLink {
  title: string;
  desc: string;
  icon: LucideIcon;
}

const UTILITY_LINKS: UtilityLink[] = [
  {
    title: "CHECK SKIN VALO",
    desc: "Kiểm tra chi tiết thông tin và súng của tài khoản",
    icon: Crosshair,
  },
  {
    title: "NHẬN ACC FREE",
    desc: "Phát tài khoản và code game miễn phí hàng ngày",
    icon: Gift,
  },
  {
    title: "TÂM NGẮM PRO",
    desc: "Sao chép mã tâm ngắm chuẩn tuyển thủ chuyên nghiệp",
    icon: Target,
  },
];

export function UtilitiesHub() {
  return (
    <div className="w-full">
      <div className="w-full relative z-10 my-3">
        {/* Desktop (>=1024px) */}
        <div className="hidden lg:grid grid-cols-12 gap-3 items-stretch">
          {/* Main panel */}
          <div className="lg:col-span-8 relative overflow-hidden rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-[#0d0d12] py-3.5 px-4 flex flex-col justify-between transition-all duration-300">
            <div className="absolute inset-0 z-0">
              <Image
                src={MAIN_ART_SRC}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-[0.07]"
              />
            </div>

            <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              <div className="flex flex-col justify-center gap-2">
                <span className="text-[8.5px] font-black text-indigo-400 uppercase tracking-[0.12em]">
                  {MAIN_EYEBROW}
                </span>
                <p className="text-[11.5px] text-neutral-400 leading-normal max-w-[95%]">
                  {MAIN_PARAGRAPH}
                </p>
                <a
                  href="#"
                  className="group inline-flex items-center justify-center gap-1.5 self-start w-32 h-7 rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white transition-colors duration-200"
                >
                  <span className="text-[9.5px] font-black uppercase tracking-wider">
                    {MAIN_CTA}
                  </span>
                  <ArrowRight
                    size={12}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </a>
              </div>

              <div className="flex flex-col justify-center gap-1.5">
                <span className="text-[8.5px] font-black uppercase tracking-[0.12em] text-indigo-400">
                  TIỆN ÍCH CHƠI GAME
                </span>
                {UTILITY_LINKS.map(({ title, desc, icon: Icon }) => (
                  <div
                    key={title}
                    className="group/slider rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.04] transition-colors"
                  >
                    <a
                      href="#"
                      className="flex items-center gap-2 w-full h-full group/item"
                    >
                      <div className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 text-indigo-400">
                        <Icon size={13} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="block text-[9.5px] font-bold text-neutral-200 group-hover/slider:text-indigo-400 tracking-wide uppercase transition-colors duration-200 truncate">
                          {title}
                        </span>
                        <span className="text-[9.5px] text-neutral-400 group-hover/slider:text-neutral-300 transition-colors duration-200 leading-tight truncate">
                          {desc}
                        </span>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trade panel */}
          <div className="lg:col-span-4 relative overflow-hidden rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-[#0d0d12] py-3.5 px-4 flex flex-col justify-between gap-3 transition-all duration-300">
            <div className="absolute inset-0 z-0">
              <Image
                src={TRADE_ART_SRC}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-[0.07]"
              />
            </div>

            <div className="relative z-10 space-y-2">
              <span className="text-[8.5px] font-black text-indigo-400 uppercase tracking-[0.12em]">
                {TRADE_EYEBROW}
              </span>
              <p className="text-[11.5px] text-neutral-400 leading-normal">
                {TRADE_PARAGRAPH}
              </p>
            </div>

            <a
              href="#"
              className="group inline-flex items-center justify-center gap-1.5 self-start w-32 h-7 rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white transition-colors duration-200"
            >
              <span className="text-[9.5px] font-black uppercase tracking-wider">
                {TRADE_CTA}
              </span>
              <ArrowRight
                size={12}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </a>
          </div>
        </div>

        {/* Mobile (<1024px) */}
        <div className="grid lg:hidden grid-cols-2 gap-2">
          {/* Tile 1 + 2 — one column each */}
          {(
            [
              { art: MAIN_ART_SRC, eyebrow: "VALORANT HUB", body: MAIN_PARAGRAPH, cta: "Khám phá" },
              { art: TRADE_ART_SRC, eyebrow: TRADE_EYEBROW, body: TRADE_PARAGRAPH, cta: TRADE_CTA },
            ] as const
          ).map((tile) => (
            <div
              key={tile.eyebrow}
              className="col-span-1 relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0d0d12] py-3 px-3 flex flex-col justify-between gap-2.5 min-h-[155px]"
            >
              <div className="absolute inset-0 z-0">
                <Image src={tile.art} alt="" fill className="object-cover opacity-[0.07]" />
              </div>
              <div className="relative z-10 flex flex-col gap-1.5">
                <span className="text-[7.5px] font-black text-indigo-400 uppercase tracking-wider truncate">
                  {tile.eyebrow}
                </span>
                <p className="text-[10px] text-neutral-400 leading-normal line-clamp-3">
                  {tile.body}
                </p>
              </div>
              <span className="relative z-10 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white">
                {tile.cta}
                <ArrowRight size={11} />
              </span>
            </div>
          ))}

          {/* Tile 3 — full width, the utility link list */}
          <div className="col-span-2 relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0d0d12] py-3 px-3 flex flex-col justify-between gap-2.5">
            <div className="absolute inset-0 z-0">
              <Image src={MAIN_ART_SRC} alt="" fill className="object-cover opacity-[0.07]" />
            </div>
            <div className="relative z-10 flex flex-col gap-1.5">
              <span className="text-[7.5px] font-black text-indigo-400 uppercase tracking-wider truncate">
                TIỆN ÍCH CHƠI GAME
              </span>
              {UTILITY_LINKS.map((link) => (
                <div
                  key={link.title}
                  className="group/slider rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.04] transition-colors"
                >
                  <a href="#" className="flex items-center gap-2 w-full h-full group/item">
                    <div className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 text-indigo-400">
                      <link.icon size={13} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="block text-[9.5px] font-bold text-neutral-200 group-hover/slider:text-indigo-400 tracking-wide uppercase transition-colors duration-200 truncate">
                        {link.title}
                      </span>
                      <span className="text-[9.5px] text-neutral-400 group-hover/slider:text-neutral-300 transition-colors duration-200 leading-tight truncate">
                        {link.desc}
                      </span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
