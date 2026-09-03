/**
 * The states a tool advertises, named and coloured once.
 *
 * The hue carries the meaning — emerald runs, sky has settled, violet is fresh
 * off an update, orange is a warning, amber is being fixed, red is caught — so
 * the places that print a state as a notification read from here rather than
 * keeping their own copy of the palette.
 */

export type SoftwareStatusValue =
  | "UNDETECTED"
  | "STABLE"
  | "UPDATED"
  | "RISKY"
  | "UPDATING"
  | "DETECTED";

/** The status tab of /thong-bao; the header strip's "XEM TRẠNG THÁI" too. */
export const STATUS_TAB_HREF = "/thong-bao?tab=trang-thai";

/** Its neighbour: the shelf of tools to follow, searchable. Its own tab
 *  because "what happened" and "tell me next time" are two errands, and the
 *  history is long enough to bury a search box put above it. */
export const STATUS_SUBSCRIBE_HREF = "/thong-bao?tab=dang-ky";

export const SOFTWARE_STATUS: Record<
  SoftwareStatusValue,
  { label: string; dot: string; text: string; tile: string }
> = {
  UNDETECTED: {
    label: "Chưa phát hiện",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    tile: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  DETECTED: {
    label: "Đã phát hiện",
    dot: "bg-red-500",
    text: "text-red-400",
    tile: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  UPDATING: {
    label: "Đang cập nhật",
    dot: "bg-amber-500",
    text: "text-amber-400",
    tile: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  STABLE: {
    label: "Ổn định",
    dot: "bg-sky-500",
    text: "text-sky-400",
    tile: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  },
  UPDATED: {
    label: "Cập nhật mới",
    dot: "bg-violet-500",
    text: "text-violet-400",
    tile: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  },
  RISKY: {
    label: "Rủi ro",
    dot: "bg-orange-500",
    text: "text-orange-400",
    tile: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  },
};

/** What a change to that state means to someone using the tool, as one
 *  clause after the tool's name. */
export const STATUS_EVENT_COPY: Record<SoftwareStatusValue, string> = {
  UNDETECTED: "đã an toàn, dùng lại bình thường.",
  DETECTED: "bị phát hiện — tạm ngưng sử dụng, chờ thông báo mới.",
  UPDATING: "đang được cập nhật, sẽ có bản mới sớm.",
  STABLE: "hoạt động ổn định, dùng bình thường.",
  UPDATED: "vừa cập nhật xong — có bản mới, tải lại để dùng.",
  RISKY: "đang có rủi ro — cân nhắc trước khi dùng, chờ thông báo mới.",
};

export function readSoftwareStatus(value: unknown): SoftwareStatusValue | null {
  return typeof value === "string" && Object.hasOwn(SOFTWARE_STATUS, value)
    ? (value as SoftwareStatusValue)
    : null;
}
