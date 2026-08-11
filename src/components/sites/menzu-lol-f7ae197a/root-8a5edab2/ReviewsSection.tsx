import Image from "next/image";
import { ArrowRight, BadgeCheck, Star } from "lucide-react";

interface Review {
  name: string;
  date: string;
  body: string;
  amount: string;
  avatar: string;
}

const AVATAR_BASE = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/feedback/avatar";

const VERIFIED_BADGE_TEXT = "Tài khoản đã xác minh";

const REVIEWS: Review[] = [
  {
    name: "Duy Anh",
    date: "23/03/2024",
    body: "+1 uy tín đã giao dịch 4 lần",
    amount: "5.250.000đ",
    avatar: `${AVATAR_BASE}/fb-avatar-3c833108-c1b0-4492-8a30-78a3db774db5.webp`,
  },
  {
    name: "Quang Lâm",
    date: "05/02/2023",
    body: "Ut vs tận tâm nha ae",
    amount: "2.100.000đ",
    avatar: `${AVATAR_BASE}/fb-avatar-57655c36-1580-45c7-a1af-e8d5e65d3c7d.webp`,
  },
  {
    name: "Phạm Thế Cường",
    date: "26/04/2026",
    body: "Tuy mua trả góp nhg UT!",
    amount: "2.480.000đ",
    avatar: `${AVATAR_BASE}/fb-avatar-5a6a7b1c-bb9f-4d15-b22c-6e1537d86b83.webp`,
  },
  {
    name: "Nguyễn Tuấn Hùng",
    date: "01/10/2024",
    body: "+1 legit giao dịch nhanh gọn",
    amount: "2.400.000đ",
    avatar: `${AVATAR_BASE}/fb-avatar-d8dfdbc4-4045-4ff7-ac86-f4d450a99ffb.webp`,
  },
  {
    name: "Nguyễn Thành Xuyên",
    date: "02/08/2025",
    body: "+1 legit nha",
    amount: "2.000.000đ",
    avatar: `${AVATAR_BASE}/fb-avatar-2d4a2ff1-693f-4a6a-b222-57f910f9866c.webp`,
  },
];

export function ReviewsSection() {
  return (
    <div className="mb-12 lg:mb-16">
      <div className="mb-14 w-full border-t border-[#1b1c28] pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 items-stretch">
          <div className="lg:col-span-3 flex flex-col justify-center gap-3.5 lg:gap-4 pt-0 lg:pt-0 relative overflow-hidden">
            <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 text-[100px] font-black text-white/[0.015] select-none tracking-widest uppercase pointer-events-none -z-10">
              TRUST
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-[3px] h-5 bg-[#7C3AED] rounded-full shrink-0" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                ĐÁNH GIÁ KHÁCH HÀNG
              </h2>
            </div>

            <div className="flex flex-row items-end justify-between lg:flex-col lg:items-start lg:gap-4 w-full mt-1 lg:mt-0">
              <div>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">
                  5.0
                </div>
                <div className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest whitespace-nowrap leading-none">
                  600 ĐÁNH GIÁ THỰC
                </div>
              </div>

              <a
                href="#"
                className="group flex items-center gap-1 text-[10px] sm:text-xs font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest border-b border-neutral-700 hover:border-[#7C3AED]"
              >
                Xem tất cả
                <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="lg:col-span-9 relative min-w-0">
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar menzu-scroll-x overscroll-x-contain cursor-grab active:cursor-grabbing select-none">
              {REVIEWS.map((review) => (
                <div
                  key={review.avatar}
                  className="w-[280px] sm:w-[320px] lg:w-[calc((100%-32px)/3)] border border-[#25283b] p-5 rounded-2xl snap-start shrink-0 flex flex-col group relative overflow-hidden cursor-pointer hover:border-[#3a3e5a] transition-colors bg-[#0d0d12]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
                      <Image src={review.avatar} alt={review.name} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white truncate">{review.name}</span>
                      <div className="flex items-center gap-1">
                        <BadgeCheck size={11} className="text-indigo-400 shrink-0" />
                        <span className="text-[9px] text-neutral-500 font-semibold truncate">
                          {VERIFIED_BADGE_TEXT}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 mb-2">
                    {[0, 1, 2, 3, 4].map((star) => (
                      <Star key={star} size={12} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-[13px] text-neutral-300 leading-relaxed mb-4 flex-1">{review.body}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                    <span className="text-[10px] text-neutral-500 font-semibold">{review.date}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 font-semibold">Giao dịch:</span>
                      <span className="text-[11px] font-black text-emerald-400">{review.amount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
