import { SHOP_TZ } from "./dayGroups";

/**
 * When somebody is at the desk.
 *
 * The support panel says "đang online" or "ngoài giờ" rather than leaving the
 * visitor to guess: a shop that answers in two minutes at nine at night and in
 * nine hours at four in the morning should say which of the two this is, or
 * every unanswered message reads as being ignored.
 *
 * One window, written here rather than settled per screen — the widget, the
 * fanpage half and anything later that promises a reply time have to agree.
 * Not a setting yet; make it one the day the shop wants to change it, not
 * the day a second copy of these numbers appears somewhere else.
 */

/** First hour someone is at the desk, shop time. */
export const SUPPORT_OPENS = 8;

/** First hour nobody is, shop time — 23 means the desk closes at 23:00. */
export const SUPPORT_CLOSES = 23;

/** How the window reads on screen. */
export const SUPPORT_WINDOW = `${SUPPORT_OPENS}:00–${SUPPORT_CLOSES}:00`;

/** The hour of `now` in shop time, whatever the reader's own clock says. */
export function shopHour(now: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  // "24" is midnight in some ICU builds; both mean the same hour of the day.
  return Number(hour) % 24;
}

/** Whether the desk is open right now. */
export function supportOpen(now: Date): boolean {
  const hour = shopHour(now);
  return hour >= SUPPORT_OPENS && hour < SUPPORT_CLOSES;
}

/**
 * The line under the shop's name.
 *
 * Out of hours it promises nothing it cannot keep — "trả lời khi online" is
 * true at four in the morning in a way "trả lời trong vài phút" is not.
 */
export function supportStatus(now: Date): { open: boolean; label: string } {
  return supportOpen(now)
    ? { open: true, label: "Đang online · trả lời trong vài phút" }
    : { open: false, label: `Ngoài giờ · hỗ trợ ${SUPPORT_WINDOW} hằng ngày` };
}
