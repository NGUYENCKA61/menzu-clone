import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Radar } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { StatusSubscribeSearch } from "@/components/sites/menzu-lol-f7ae197a/shared/StatusSubscribeSearch";
import { TYPE_ICONS, TYPE_TILE } from "@/components/sites/menzu-lol-f7ae197a/shared/announcementIcons";
import { currentAnnouncements } from "@/lib/announcementStore";
import { TYPE_LABELS } from "@/lib/announcements";
import { getCurrentUser } from "@/lib/session";
import {
  SOFTWARE_STATUS,
  STATUS_EVENT_COPY,
  STATUS_SUBSCRIBE_HREF,
  STATUS_TAB_HREF,
} from "@/lib/softwareStatus";
import {
  listSoftwareForStatus,
  listStatusEvents,
  subscribedProductIds,
  type StatusEventRow,
} from "@/lib/statusEvents";
import { shareCard } from "@/lib/shareCard";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Thông báo",
    alternates: { canonical: "/thong-bao" },
    ...(await shareCard({ url: "/thong-bao" })),
  };
}
export const dynamic = "force-dynamic";

/** The shop's clock, whatever machine renders the page. */
const TZ = "Asia/Ho_Chi_Minh";

function formatWhen(date: Date): string {
  return date.toLocaleString("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "Hôm nay" / "Hôm qua" / the date — the label over a day of history. */
function dayLabel(key: string, now: Date): string {
  if (key === dayKey(now)) return "Hôm nay";
  if (key === dayKey(new Date(now.getTime() - 24 * 3600000))) return "Hôm qua";
  return key;
}

/** The history in day groups, newest day first, order within a day kept. */
function groupByDay(events: StatusEventRow[]): { key: string; items: StatusEventRow[] }[] {
  const groups: { key: string; items: StatusEventRow[] }[] = [];
  for (const event of events) {
    const key = dayKey(event.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(event);
    else groups.push({ key, items: [event] });
  }
  return groups;
}

const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";
/** The line under the tabs saying what the open one is for. Two tabs both
 *  about hack status need telling apart, and their names alone do not do it:
 *  one is everything that happened, the other is what to be told about next.
 *
 *  Kept to one line on a desktop — no max-width holding it back and short
 *  enough to fit — because at two lines it stops reading as a caption on the
 *  tab and starts reading as the page opening with a paragraph. A phone still
 *  wraps it, which is fine: there it is the only thing on its line. */
const TAB_NOTE = "mb-5 text-[13px] leading-relaxed text-neutral-400";
const TAB =
  "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[11px] font-black uppercase tracking-widest transition-colors";
const TAB_ON = "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white";
const TAB_OFF =
  "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white";

/**
 * Where "Xem tất cả thông báo" lands, in three tabs.
 *
 * "Thông báo hệ thống" is the list the bell shows, in full rather than
 * truncated to a line each. Addressed notices are resolved against the
 * reader here exactly as they are for the dropdown, so a private notice is
 * not readable by opening this page signed out.
 *
 * "Trạng thái hack chung" is the history: every state a tool has moved
 * through, as a timeline by day.
 *
 * "Đăng ký nhận thông báo" is the shelf beside it — every live
 * tool, searchable, each with the follow chip. Its own tab rather than a
 * panel above the history, because the two answer different questions and
 * the history is long enough to bury anything put over it. Following a tool
 * — from here, or from the chip on its own page — is what puts its changes
 * on the reader's bell.
 */
export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const statusTab = tab === "trang-thai";
  const subscribeTab = tab === "dang-ky";
  const user = await getCurrentUser();
  const [announcements, events, tools, followed] = await Promise.all([
    currentAnnouncements(user?.id ?? null),
    listStatusEvents(),
    listSoftwareForStatus(),
    // A guest follows nothing; asking the database to confirm that costs a
    // query to learn what the missing session already said.
    user ? subscribedProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);
  const now = new Date();

  // Null rather than false for a guest: the chip has three faces, and "not
  // signed in" is the one that offers a sign-in instead of a silent no-op.
  const subscribeList = tools.map((tool) => ({
    code: tool.code,
    name: tool.name,
    href: tool.href,
    categoryName: tool.categoryName,
    categorySlug: tool.categorySlug,
    imageUrl: tool.imageUrl,
    status: tool.status,
    subscribed: user ? followed.has(tool.id) : null,
  }));

  return (
    <SimplePage title="Thông báo" crumb="Thông báo">
      <nav aria-label="Loại thông báo" className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/thong-bao"
          className={`${TAB} ${statusTab || subscribeTab ? TAB_OFF : TAB_ON}`}
        >
          Thông báo hệ thống
          <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[10px]">
            {announcements.length}
          </span>
        </Link>
        <Link href={STATUS_TAB_HREF} className={`${TAB} ${statusTab ? TAB_ON : TAB_OFF}`}>
          Trạng thái hack chung
          <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[10px]">
            {events.length}
          </span>
        </Link>
        {/* The count is how many the reader follows, not how many exist: on
            this tab that is the number they came to check, and a signed-out
            reader follows none. */}
        <Link
          href={STATUS_SUBSCRIBE_HREF}
          className={`${TAB} ${subscribeTab ? TAB_ON : TAB_OFF}`}
        >
          Đăng ký nhận thông báo
          <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[10px]">
            {followed.size}
          </span>
        </Link>
      </nav>

      {subscribeTab ? (
        // No heading of its own: the tab above it is lit and says the same
        // four words, and printing them twice a centimetre apart reads as a
        // mistake rather than as structure. The line below is not the heading
        // again — it says what this tab does that the other one does not.
        <>
          <p className={TAB_NOTE}>
            Nhận thông báo cho riêng từng bản hack — chỉ bản bạn chọn mới báo về
            chuông.
          </p>
          <StatusSubscribeSearch
            tools={subscribeList}
            loginNext={STATUS_SUBSCRIBE_HREF}
          />
        </>
      ) : statusTab ? (
        // No flex column around these two: its gap stacked on top of the
        // note's own margin and left the line floating in the middle of the
        // space instead of sitting under the tabs like its neighbour's does.
        <>
          <p className={TAB_NOTE}>
            Tình trạng và tình hình cập nhật của tất cả các bản hack, xếp theo
            ngày.
          </p>
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Radar size={14} className="text-[var(--menzu-accent)]" />
              <h2 className={LABEL}>Lịch sử trạng thái</h2>
            </div>
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
                <p className="text-sm font-bold text-white">Chưa có thay đổi nào</p>
                <p className="mt-1.5 text-[13px] text-neutral-400">
                  Mỗi lần shop đổi trạng thái một tool sẽ hiện ở đây.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 sm:p-6">
                {groupByDay(events).map((group) => (
                  <div key={group.key} className="mb-6 last:mb-0">
                    <p className={`mb-3 ${LABEL}`}>{dayLabel(group.key, now)}</p>
                    {/* A line down the left with a dot per change, the colour
                        of the state it moved to — the same dot the pill on
                        the tool's card wears. */}
                    <ol className="relative ml-1.5 border-l border-white/10 pl-6">
                      {group.items.map((event) => {
                        const state = SOFTWARE_STATUS[event.status];
                        return (
                          <li key={event.id} className="relative pb-5 last:pb-0">
                            <span
                              aria-hidden
                              className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-[#101114] ${state.dot}`}
                            />
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-[11px] font-semibold tabular-nums text-neutral-500">
                                {formatTime(event.at)}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
                              >
                                {state.label}
                              </span>
                              <span className="text-[11px] font-semibold text-neutral-500">
                                {event.scope === "category" ? "Cả danh mục" : event.categoryName}
                              </span>
                            </div>
                            <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-300">
                              <Link
                                href={event.productHref}
                                className="font-bold text-white transition-colors hover:text-[var(--menzu-accent)]"
                              >
                                {event.productName}
                              </Link>{" "}
                              {STATUS_EVENT_COPY[event.status]}
                            </p>
                            {/* The shop's own words for this particular
                                change, when it wrote any — a patch note, a
                                "wait 24h", something the state alone cannot
                                say. */}
                            {event.note ? (
                              <p className="mt-1.5 whitespace-pre-line break-words rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-neutral-400">
                                {event.note}
                              </p>
                            ) : null}
                            {event.imageUrl ? (
                              <a
                                href={event.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2.5 block w-full max-w-[420px] overflow-hidden rounded-xl border border-white/10 bg-neutral-950 transition-colors hover:border-white/25"
                              >
                                <Image
                                  src={event.imageUrl}
                                  alt={`Ảnh kèm thông báo ${event.productName}`}
                                  width={840}
                                  height={472}
                                  // Capped: a screenshot taken on a phone is
                                  // portrait and would otherwise push the next
                                  // change a screen and a half down. The whole
                                  // picture is one click away.
                                  className="max-h-[280px] w-full object-cover"
                                />
                              </a>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-sm font-bold text-white">Chưa có thông báo nào</p>
          <p className="mt-1.5 text-[13px] text-neutral-400">
            Thông báo từ shop sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  // Same glyph as the bell list and the notice itself.
                  const Icon = TYPE_ICONS[item.type];
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${TYPE_TILE}`}
                    >
                      <Icon size={12} />
                      {TYPE_LABELS[item.type]}
                    </span>
                  );
                })()}
                <span className="text-[11px] text-neutral-500">
                  {formatWhen(item.startAt)}
                </span>
              </div>

              <h2 className="mt-3 text-[17px] font-bold leading-snug text-white">
                {item.title}
              </h2>

              {/* Same frame as a status change's picture further down the
                  page: capped at 420 wide and 280 tall, the whole picture one
                  click away. Full-width it dwarfed the notice it illustrated. */}
              {item.imageUrl ? (
                <a
                  href={item.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-full max-w-[420px] overflow-hidden rounded-xl border border-white/10 bg-neutral-950 transition-colors hover:border-white/25"
                >
                  <Image
                    src={item.imageUrl}
                    alt=""
                    width={840}
                    height={472}
                    className="max-h-[280px] w-full object-cover"
                  />
                </a>
              ) : null}

              {/* Plain text, rendered as text — the same rule the modal keeps.
                  whitespace-pre-line preserves the shop's own line breaks. */}
              <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-neutral-300">
                {item.body}
              </p>

              {item.bullets.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {item.bullets.map((line, index) => (
                    <li key={index} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--menzu-accent)]"
                      />
                      <span className="text-[13.5px] leading-relaxed text-neutral-300">
                        {line}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {item.noticeTitle && item.noticeBody ? (
                <div className="mt-4 rounded-r-lg border-l-2 border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/[0.06] px-4 py-3">
                  <p className="text-[13px] font-semibold text-[var(--menzu-accent)]">
                    {item.noticeTitle}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
                    {item.noticeBody}
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </SimplePage>
  );
}
