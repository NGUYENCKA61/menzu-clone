import { Check, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const IMAGE_BASE = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload";

const MAIN_BANNER_SRC = `${IMAGE_BASE}/bannermung9-7-26.webp`;

/**
 * The four claims under the buttons. They carry a light purple of their own
 * rather than the shop's red: red on this page means "press me", and four
 * reassurances that look like four buttons send the eye to the wrong place.
 */
const USPS = ["Giao dịch nhanh chóng", "Hỗ trợ khách hàng", "Sản phẩm đa dạng", "Hệ thống tự động"];

/** #b9a0ff. Written out rather than made a token: it is spent here and
 *  nowhere else, and a variable used once hides where the colour lives. */
const USP_PURPLE = "text-[#b9a0ff]";

const CTA =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.14em] transition-colors";

/**
 * The top of the storefront: what the shop sells, said in words, beside the
 * artwork set in Cấu hình → Nhận diện.
 *
 * It used to be the artwork alone — a wide banner and four promo tiles, no
 * sentence anywhere saying what this place is. The banner still leads, now as
 * one half of the hero rather than the whole of it; the promo strip is gone,
 * and the catalogue rows below start straight after this.
 *
 * `banner` is that configured image.
 */
export function HeroBanners({ banner = MAIN_BANNER_SRC }: { banner?: string }) {
  return (
    <section className="w-full overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0f0f13] px-5 py-8 sm:px-8 sm:py-10 lg:px-14 lg:py-14">
      {/* One column until there is room for two. items-center keeps the
          artwork level with the copy rather than pinned to the top of a
          taller cell. */}
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-start">
          <span
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/[0.08] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--menzu-accent)]"
          >
            <Sparkles size={12} className={`shrink-0 ${USP_PURPLE}`} />
            Đại lý Valorant &amp; dịch vụ gaming
          </span>

          {/* The page had no h1 at all while the hero was pure imagery. */}
          <h1 className="mt-6 text-[28px] font-black uppercase leading-[1.06] tracking-tight text-white sm:text-[36px] lg:text-[46px]">
            <span className="block">Mua acc Valorant</span>
            <span className="block">&amp; dịch vụ gaming</span>
          </h1>

          <p className="mt-5 max-w-[460px] text-[14px] leading-relaxed text-neutral-400">
            Kho tài khoản Valorant, phần mềm và dịch vụ gaming. Giao dịch nhanh chóng, hỗ trợ
            tận tâm và cập nhật sản phẩm mỗi ngày.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/categories"
              className={`${CTA} bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]`}
            >
              Xem sản phẩm →
            </Link>
            <Link
              href="/docs"
              className={`${CTA} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`}
            >
              Xem hướng dẫn →
            </Link>
          </div>

          <ul className="mt-7 grid w-full max-w-[460px] grid-cols-1 gap-3 sm:grid-cols-2">
            {USPS.map((usp) => (
              <li
                key={usp}
                className={`flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[11px] font-bold ${USP_PURPLE}`}
              >
                <Check size={13} className="shrink-0" />
                {usp}
              </li>
            ))}
          </ul>
        </div>

        {/* The artwork, uncoloured and uncropped by anything but its frame.
            A wide banner in a frame this tall loses its edges to
            object-cover, so a squarer image reads better here. */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a0c]">
          <Image
            src={banner}
            alt="banner"
            fill
            sizes="(max-width: 1024px) 100vw, 620px"
            className="select-none object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}
