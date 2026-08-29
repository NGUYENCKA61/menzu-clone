"use client";

import type { DurationChoice } from "@/lib/duration";

/**
 * The one unit picker every tier form uses — giờ, ngày, tháng, năm, and
 * "vĩnh viễn" as an explicit choice. Written once because five forms draw it,
 * and an option added to four of them is a bug in the fifth.
 */
export function DurationSelect({
  value,
  onChange,
  className,
  id,
  label = "Đơn vị thời hạn",
}: {
  value: DurationChoice;
  onChange: (value: DurationChoice) => void;
  className: string;
  id?: string;
  label?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as DurationChoice)}
      aria-label={label}
      className={className}
    >
      <option value="hour" className="bg-neutral-900">
        giờ
      </option>
      <option value="day" className="bg-neutral-900">
        ngày
      </option>
      <option value="week" className="bg-neutral-900">
        tuần
      </option>
      <option value="month" className="bg-neutral-900">
        tháng
      </option>
      <option value="year" className="bg-neutral-900">
        năm
      </option>
      <option value="forever" className="bg-neutral-900">
        vĩnh viễn
      </option>
    </select>
  );
}
