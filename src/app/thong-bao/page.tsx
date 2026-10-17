import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { sentenceCase } from "@/lib/displayCase";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import {
  PILL_TAB,
  PILL_TAB_COUNT,
  PILL_TAB_OFF,
  PILL_TAB_ON,
} from "@/components/sites/menzu-lol-f7ae197a/shared/pillTab";
import { StatusNote } from "@/components/sites/menzu-lol-f7ae197a/shared/StatusNote";
import { StatusSubscribeSearch } from "@/components/sites/menzu-lol-f7ae197a/shared/StatusSubscribeSearch";
import { UrlPager } from "@/components/sites/menzu-lol-f7ae197a/shared/UrlPager";
import { NoticeTypeChip } from "@/components/sites/menzu-lol-f7ae197a/shared/NoticeTypeChip";
import { activeAnnouncements } from "@/lib/announcementStore";
import { getCurrentUser } from "@/lib/session";
import {
  SOFTWARE_STATUS,
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

// A description of its own rather than the home page's inherited one (the
// owner's SEO review, 13/10/2026).
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Thông báo & trạng thái",
    description:
      "Trạng thái hack theo từng game: an toàn, đang cập nhật hay đã bị phát hiện, cập nhật liên tục.",
    alternates: { canonical: "/thong-bao" },
    ...(await shareCard({ url: "/thong-bao" })),
  };
}
export const dynamic = "force-dynamic";

/** Notices on one page, and how many the list reads at most. */
const NOTICES_PER_PAGE = 10;
const NOTICES_MAX = 100;

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

/** The line under the tabs saying what the open one is for. Two tabs both
 *  about hack status need telling apart, and their names alone do not do it:
 *  one is everything that happened, the other is what to be told about next.
 *
 *  Kept to one line on a desktop — no max-width holding it back and short
 *  enough to fit — because at two lines it stops reading as a caption on the
 *  tab and starts reading as the page opening with a paragraph. A phone still
 *  wraps it, which is fine: there it is the only thing on its line. */
const TAB_NOTE = "mb-5 text-[15px] leading-relaxed text-mist";

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
  searchParams: Promise<{ tab?: string; trang?: string }>;
}) {
  const { tab, trang } = await searchParams;
  const statusTab = tab === "trang-thai";
  const subscribeTab = tab === "dang-ky";
  const user = await getCurrentUser();
  const [announcements, events, tools, followed] = await Promise.all([
    // The whole list, not the header's five: this page is where every
    // notice can be read, ten to a page (the owner, 01/10/2026: "có phân
    // trang?").
    activeAnnouncements(user?.id ?? null, new Date(), NOTICES_MAX),
    listStatusEvents(),
    listSoftwareForStatus(),
    // A guest follows nothing; asking the database to confirm that costs a
    // query to learn what the missing session already said.
    user ? subscribedProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);
  const now = new Date();
  const noticePages = Math.max(1, Math.ceil(announcements.length / NOTICES_PER_PAGE));
  const noticePage = Math.min(Math.max(1, Number(trang) || 1), noticePages) - 1;
  const pageOfNotices = announcements.slice(
    noticePage * NOTICES_PER_PAGE,
    noticePage * NOTICES_PER_PAGE + NOTICES_PER_PAGE,
  );

  // Null rather than false for a guest: the chip has three faces, and "not
  // signed in" is the one that offers a sign-in instead of a silent no-op.
  const subscribeList = tools.map((tool) => ({
    code: tool.code,
    name: tool.name,
    href: tool.href,
    categoryName: tool.categoryName,
    categorySlug: tool.categorySlug,
    categoryImageUrl: tool.categoryImageUrl,
    categoryLogoUrl: tool.categoryLogoUrl,
    imageUrl: tool.imageUrl,
    status: tool.status,
    subscribed: user ? followed.has(tool.id) : null,
  }));

  return (
    // Named for both of its errands, so the menu's "Xem trạng thái" lands on a
    // page that says so (the owner, 02/10/2026: "làm hết thử").
    <SimplePage title="Thông báo & trạng thái" crumb="Thông báo & trạng thái" icon={Bell} ground="home">
      {/* On a phone the three tabs scroll as one row, bleeding to the
          screen's edges; stacked, they took three lines before a single
          notice was in view. Their pill is the site's tab button now
          (shared/pillTab), the same one /security and the category filter
          light (the owner, 13/10/2026, UI consistency review). */}
      <nav
        aria-label="Loại thông báo"
        className="hide-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0"
      >
        <Link
          href="/thong-bao"
          className={`${PILL_TAB} ${statusTab || subscribeTab ? PILL_TAB_OFF : PILL_TAB_ON}`}
        >
          Thông báo hệ thống
          <span className={PILL_TAB_COUNT}>
            {announcements.length}
          </span>
        </Link>
        <Link href={STATUS_TAB_HREF} className={`${PILL_TAB} ${statusTab ? PILL_TAB_ON : PILL_TAB_OFF}`}>
          Trạng thái hack chung
          <span className={PILL_TAB_COUNT}>
            {events.length}
          </span>
        </Link>
        {/* The count is how many the reader follows, not how many exist: on
            this tab that is the number they came to check, and a signed-out
            reader follows none. */}
        <Link
          href={STATUS_SUBSCRIBE_HREF}
          className={`${PILL_TAB} ${subscribeTab ? PILL_TAB_ON : PILL_TAB_OFF}`}
        >
          Đăng ký nhận thông báo
          <span className={PILL_TAB_COUNT}>
            {followed.size}
          </span>
        </Link>
      </nav>

      {/* The notices tab says what it holds, as its two neighbours do (the
          owner, 02/10/2026: "thêm dòng mô tả cho đồng bộ"). */}
      {!subscribeTab && !statusTab ? (
        <p className={TAB_NOTE}>
          Tin chung từ shop: bảo trì, khuyến mãi, cập nhật tính năng mới.
        </p>
      ) : null}

      {subscribeTab ? (
        // No heading of its own: the tab above it is lit and says the same
        // four words, and printing them twice a centimetre apart reads as a
        // mistake rather than as structure. The line below is not the heading
        // again — it says what this tab does that the other one does not.
        <>
          {/* Said as it now works: the bell came off the header (25/09), and
              a followed tool's change arrives as a notice that opens on the
              reader's next page (lib/statusFollowers). */}
          <p className={TAB_NOTE}>
            Bấm chuông để theo dõi từng bản hack. Khi bản đó đổi trạng thái,
            thông báo sẽ hiện lên ở lần tới bạn vào web.
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
          {/* No visible heading: the lit tab and the line above already say
              what this is (the owner, 02/10/2026: "bỏ đi" to "Lịch sử trạng
              thái"); the name stays for screen readers. */}
          <section aria-label="Lịch sử trạng thái">
            {events.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
                <p className="text-[15px] font-semibold text-frost">Chưa có thay đổi nào</p>
                <p className="mt-1.5 text-[14px] text-mist">
                  Mỗi lần shop đổi trạng thái một tool sẽ hiện ở đây.
                </p>
              </div>
            ) : (
              // LAB (Launcher): each change is one compact card in its day: the
              // picture as a small notched cover beside the words (a full-width
              // screenshot per change made the history screens long), the time,
              // the state and the game on one line, the tool's name in sentence
              // case, the shop's note under it. The rail and dots are gone; the
              // times already say the order.
              <div className="flex flex-col gap-8">
                {groupByDay(events).map((group) => (
                  <section key={group.key} aria-label={dayLabel(group.key, now)}>
                    <div className="mb-3 flex items-center gap-3">
                      <h3 className="lab-figure shrink-0 text-[15px] font-semibold text-frost">
                        {dayLabel(group.key, now)}
                      </h3>
                      <span aria-hidden className="h-px flex-1 bg-line" />
                      <span className="shrink-0 text-[13px] text-dim">
                        {group.items.length} thay đổi
                      </span>
                    </div>
                    <ol className="flex flex-col gap-3">
                      {group.items.map((event) => {
                        const state = SOFTWARE_STATUS[event.status];
                        const name = sentenceCase(event.productName);
                        return (
                          <li
                            key={event.id}
                            className="flex flex-col gap-3 rounded-[14px] border border-white/10 bg-white/[0.02] p-3.5 sm:flex-row sm:gap-4 sm:p-4"
                          >
                            {event.imageUrl ? (
                              <a
                                href={event.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lab-notch-sm relative block aspect-video w-full shrink-0 self-start overflow-hidden border border-line bg-raise transition-colors hover:border-line-strong sm:w-[168px]"
                              >
                                <Image
                                  src={event.imageUrl}
                                  alt={`Ảnh kèm thông báo ${event.productName}`}
                                  fill
                                  sizes="(min-width: 640px) 168px, 100vw"
                                  className="object-cover"
                                />
                              </a>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                                <time
                                  dateTime={event.at.toISOString()}
                                  className="lab-figure text-[14px] font-semibold text-frost"
                                >
                                  {formatTime(event.at)}
                                </time>
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${state.tile}`}
                                >
                                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                                  {state.label}
                                </span>
                                <span className="text-[13px] text-dim">
                                  {event.scope === "category" ? "Cả danh mục" : sentenceCase(event.categoryName)}
                                </span>
                              </div>
                              <Link
                                href={event.productHref}
                                title={name}
                                className="mt-1.5 line-clamp-2 block text-[16px] font-semibold leading-snug text-frost transition-colors hover:text-white"
                              >
                                {name}
                              </Link>
                              {event.note ? (
                                <div className="mt-2.5 break-words rounded-[10px] border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-[14px] leading-relaxed text-mist">
                                  <StatusNote text={event.note} />
                                </div>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      ) : announcements.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-[15px] font-semibold text-frost">Chưa có thông báo nào</p>
          <p className="mt-1.5 text-[14px] text-mist">
            Thông báo từ shop sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* The security page's cards (white 2%, a hairline edge). */}
          {pageOfNotices.map((item) => (
            <article
              key={item.id}
              className="rounded-[14px] border border-white/10 bg-white/[0.02] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                {/* The word with its small glyph, the same chip the account
                    overview lists notices with. */}
                <NoticeTypeChip type={item.type} />
                <span className="lab-figure text-[13px] text-dim">
                  {formatWhen(item.startAt)}
                </span>
              </div>

              <h2 className="mt-3 text-[17px] font-semibold leading-snug text-frost">
                {item.title}
              </h2>

              {/* Same frame as a status change's picture further down the
                  page: capped at 420 wide and 280 tall, the whole picture one
                  click away. Full-width it dwarfed the notice it illustrated. */}
              {item.imageUrl ? (
                // The picture is decorative under the title, so the link
                // says what it opens (the SEO review, round 2, T16).
                <a
                  href={item.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Xem ảnh: ${item.title}`}
                  className="mt-3 block w-full max-w-[420px] overflow-hidden rounded-[12px] border border-line bg-raise transition-colors hover:border-line-strong"
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
              <p className="mt-2 max-w-[72ch] whitespace-pre-line text-[15px] leading-relaxed text-neutral-300">
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
                      <span className="text-sm leading-relaxed text-neutral-300">
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
          <UrlPager base="/thong-bao" page={noticePage} pageCount={noticePages} />
        </div>
      )}
    </SimplePage>
  );
}
