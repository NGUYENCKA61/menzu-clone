/**
 * The three states a tool advertises, named and coloured once.
 *
 * The hue carries the meaning — emerald runs, red is caught, amber is being
 * fixed — so the places that print a state as a notification read from here
 * rather than keeping their own copy of the palette.
 */

export type SoftwareStatusValue = "UNDETECTED" | "DETECTED" | "UPDATING";

/** The status tab of /thong-bao; the header strip's "XEM TRẠNG THÁI" too. */
export const STATUS_TAB_HREF = "/thong-bao?tab=trang-thai";

export const SOFTWARE_STATUS: Record<
  SoftwareStatusValue,
  { label: string; dot: string; text: string; tile: string }
> = {
  UNDETECTED: {
    label: "Undetected",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    tile: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  DETECTED: {
    label: "Detected",
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
};

/** What a change to that state means to someone using the tool, as one
 *  clause after the tool's name. */
export const STATUS_EVENT_COPY: Record<SoftwareStatusValue, string> = {
  UNDETECTED: "đã an toàn, dùng lại bình thường.",
  DETECTED: "bị phát hiện — tạm ngưng sử dụng, chờ thông báo mới.",
  UPDATING: "đang được cập nhật, sẽ có bản mới sớm.",
};

export function readSoftwareStatus(value: unknown): SoftwareStatusValue | null {
  return value === "UNDETECTED" || value === "DETECTED" || value === "UPDATING"
    ? value
    : null;
}
