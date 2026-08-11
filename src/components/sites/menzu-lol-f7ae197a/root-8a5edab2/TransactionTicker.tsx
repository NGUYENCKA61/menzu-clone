import Image from "next/image";

export interface TickerEntry {
  agentId: string;
  user: string;
  amount: string;
  code: string;
  time: string;
}

const AVATAR_BASE = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/valorant-api/agents";

const TICKER_ENTRIES: TickerEntry[] = [
  { agentId: "e370fa57-4757-3604-3648-499e1f642d3f", user: "user 4***", amount: "1.590.000đ", code: "#vlr0089", time: "24 phút trước" },
  { agentId: "dade69b4-4f5a-8528-247b-219e5a1facd6", user: "user 1***", amount: "230.000đ", code: "#vlr1749", time: "1 giờ 15 phút trước" },
  { agentId: "5f8d3a7f-467b-97f3-062c-13acf203c006", user: "Ke***", amount: "380.000đ", code: "#vlr1272", time: "2 giờ 38 phút trước" },
  { agentId: "cc8b64c8-4b25-4ff9-6e7f-37b4da43d235", user: "user 1***", amount: "3.740.000đ", code: "#vlr0795", time: "2 giờ 52 phút trước" },
  { agentId: "b444168c-4e35-8076-db47-ef9bf368f384", user: "user 1***", amount: "1.870.000đ", code: "#vlr0318", time: "4 giờ 26 phút trước" },
  { agentId: "f94c3b30-42be-e959-889c-5aa313dba261", user: "user 1***", amount: "20.000đ", code: "#vlr1978", time: "6 giờ 5 phút trước" },
  { agentId: "22697a3d-45bf-8dd7-4fec-84a9e28c69d7", user: "user 1***", amount: "300.000đ", code: "#vlr1501", time: "10 giờ 30 phút trước" },
  { agentId: "601dbbe7-43ce-be57-2a40-4abd24953621", user: "user 1***", amount: "5.850.000đ", code: "#vlr1024", time: "12 giờ 18 phút trước" },
  { agentId: "6f2a04ca-43e0-be17-7f36-b3908627744d", user: "ho***", amount: "8.000đ", code: "#vlr0547", time: "13 giờ 45 phút trước" },
  { agentId: "117ed9e3-49f3-6512-3ccf-0cada7e3823b", user: "user 1***", amount: "2.760.000đ", code: "#vlr0070", time: "13 giờ 56 phút trước" },
  { agentId: "320b2a48-4d9b-a075-30f1-1f93a9b638fa", user: "user 1***", amount: "1.040.000đ", code: "#vlr1730", time: "15 giờ 17 phút trước" },
  { agentId: "7c8a4701-4de6-9355-b254-e09bc2a34b72", user: "le***", amount: "4.200.000đ", code: "#vlr1253", time: "16 giờ 31 phút trước" },
  { agentId: "1e58de9c-4950-5125-93e9-a0aee9f98746", user: "user 8***", amount: "20.000đ", code: "#vlr0776", time: "16 giờ 55 phút trước" },
  { agentId: "95b78ed7-4637-86d9-7e41-71ba8c293152", user: "user 4***", amount: "1.725.000đ", code: "#vlr0299", time: "17 giờ 8 phút trước" },
  { agentId: "efba5359-4016-a1e5-7626-b1ae76895940", user: "user 1***", amount: "2.775.000đ", code: "#vlr1959", time: "18 giờ 24 phút trước" },
  { agentId: "707eab51-4836-f488-046a-cda6bf494859", user: "user 1***", amount: "8.800.000đ", code: "#vlr1482", time: "19 giờ 6 phút trước" },
  { agentId: "eb93336a-449b-9c1b-0a54-a891f7921d69", user: "user 1***", amount: "20.000đ", code: "#vlr1005", time: "20 giờ 20 phút trước" },
  { agentId: "92eeef5d-43b5-1d4a-8d03-b3927a09034b", user: "user 1***", amount: "3.710.000đ", code: "#vlr0528", time: "21 giờ 5 phút trước" },
  { agentId: "41fb69c1-4189-7b37-f117-bcaf1e96f1bf", user: "user 1***", amount: "1.250.000đ", code: "#vlr0051", time: "22 giờ 33 phút trước" },
  { agentId: "9f0d8ba9-4140-b941-57d3-a7ad57c6b417", user: "user 1***", amount: "8.000đ", code: "#vlr1711", time: "22 giờ 46 phút trước" },
];

const TICKER_STYLES = `
@keyframes ticker-scroll {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(calc(-1 * var(--ticker-width, 50%)), 0, 0); }
}
.ticker-animate {
  animation: ticker-scroll var(--ticker-duration, 30s) linear infinite;
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  perspective: 1000px;
  -webkit-perspective: 1000px;
  contain: layout paint;
}
.ticker-item {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translate3d(0, 0, 0);
}
`;

function TickerItem({ entry, ariaHidden }: { entry: TickerEntry; ariaHidden?: boolean }) {
  return (
    <div
      className="ticker-item flex items-center gap-3 bg-[#0d1117] border border-neutral-800 rounded-xl px-3.5 py-2.5 shrink-0 hover:border-neutral-700 hover:bg-[#151515] transition-colors cursor-default"
      aria-hidden={ariaHidden ? "true" : undefined}
    >
      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/10">
        <Image
          src={`${AVATAR_BASE}/${entry.agentId}.png`}
          alt={entry.user}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-bold text-white truncate max-w-[80px] leading-normal">
            {entry.user}
          </span>
          <span className="text-[11px] font-black text-emerald-400 text-right leading-normal">
            {entry.amount}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] font-semibold text-neutral-500 leading-normal">
            {entry.code}
          </span>
          <span className="text-[10px] text-neutral-600 leading-normal whitespace-nowrap">
            {entry.time}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TransactionTicker({ entries = TICKER_ENTRIES }: { entries?: TickerEntry[] } = {}) {
  return (
    <div className="w-full overflow-hidden mb-8 relative">
      <style dangerouslySetInnerHTML={{ __html: TICKER_STYLES }} />
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          Giao dịch gần đây
        </span>
      </div>
      <div className="relative overflow-hidden py-1">
        <div className="ticker-animate flex gap-3">
          {entries.map((entry) => (
            <TickerItem key={`${entry.code}-0`} entry={entry} />
          ))}
          {entries.map((entry) => (
            <TickerItem key={`${entry.code}-1`} entry={entry} ariaHidden />
          ))}
        </div>
      </div>
    </div>
  );
}
