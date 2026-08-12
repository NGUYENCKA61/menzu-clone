import Image from "next/image";

interface SubBanner {
  src: string;
  alt: string;
}

const IMAGE_BASE = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload";

const MAIN_BANNER_SRC = `${IMAGE_BASE}/bannermung9-7-26.webp`;

const SUB_BANNERS: SubBanner[] = [
  { src: `${IMAGE_BASE}/subbanner3.webp`, alt: "Sub Banner" },
  { src: `${IMAGE_BASE}/subbanner4.webp`, alt: "Sub Banner" },
  { src: `${IMAGE_BASE}/subbanner2.webp`, alt: "Sub Banner" },
  { src: `${IMAGE_BASE}/subbanner1.webp`, alt: "Sub Banner" },
];

/**
 * `banner` is the wide image at the very top, set in Cấu hình → Nhận diện.
 * The four sub-banners below it stay as captured — they are a fixed promo
 * strip rather than something a shop swaps per campaign.
 */
export function HeroBanners({ banner = MAIN_BANNER_SRC }: { banner?: string }) {
  return (
    <div className="w-full space-y-8">
      {/* Desktop (>=768px) */}
      <div className="hidden md:block w-full">
        <div className="grid grid-cols-4 gap-4 lg:gap-6 mb-4 lg:mb-6">
          <div className="col-span-4 h-[320px] lg:h-[400px] w-full relative rounded-2xl overflow-hidden group">
            <div className="w-full h-full flex">
              <div className="w-full h-full flex-shrink-0 relative overflow-hidden">
                <Image
                  src={banner}
                  alt="banner"
                  width={1920}
                  height={600}
                  className="absolute inset-0 w-full h-full select-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-12">
          {SUB_BANNERS.map((banner) => (
            <div
              key={banner.src}
              className="relative h-[117px] lg:h-[147px] rounded-2xl overflow-hidden group cursor-pointer bg-[#0a0a0a]"
            >
              <a href="#" className="absolute inset-0 z-20" />
              <Image
                src={banner.src}
                alt={banner.alt}
                width={1000}
                height={500}
                className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500 object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile (<768px) */}
      <div className="md:hidden w-full">
        <div className="relative h-[180px] w-full rounded-2xl overflow-hidden group">
          <Image
            src={banner}
            alt="banner"
            width={1920}
            height={600}
            className="absolute inset-0 w-full h-full select-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {SUB_BANNERS.map((banner) => (
            <div
              key={banner.src}
              className="relative h-[90px] rounded-2xl overflow-hidden group cursor-pointer bg-[#0a0a0a]"
            >
              <a href="#" className="absolute inset-0 z-20" />
              <Image
                src={banner.src}
                alt={banner.alt}
                width={1000}
                height={500}
                className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500 object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
