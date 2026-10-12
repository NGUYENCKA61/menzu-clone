import {
  CircleHelp,
  CloudDownload,
  KeyRound,
  ShieldAlert,
  UserRound,
  UserRoundX,
  type LucideIcon,
} from "lucide-react";

import type { WarrantyIssue } from "@/lib/warrantyRequests";

/**
 * One glyph per fault, shared by the report form's tiles and by every place a
 * report is named afterwards (the buyer's card, the desk's list and ticket), so
 * a fault looks the same wherever it is read. A key for a key, a person for a
 * sign-in (the owner, 12/10/2026: "key không hoạt động thì icon key", "sai tài
 * khoản mật khẩu thì thêm icon user"); all in the same grey, the picked tile
 * alone carries colour (the owner, 10/10/2026).
 */
export const WARRANTY_ISSUE_ICON: Record<WarrantyIssue, LucideIcon> = {
  KEY_INVALID: KeyRound,
  DETECTED: ShieldAlert,
  INSTALL: CloudDownload,
  OTHER: CircleHelp,
  ACC_WRONG_LOGIN: UserRound,
  ACC_LOCKED: ShieldAlert,
  ACC_RECLAIMED: UserRoundX,
  ACC_NOT_AS_DESCRIBED: CircleHelp,
};

/** The fault's glyph, decorative: the label beside it carries the meaning. */
export function WarrantyIssueGlyph({
  issue,
  className,
}: {
  issue: WarrantyIssue;
  className?: string;
}) {
  const Glyph = WARRANTY_ISSUE_ICON[issue];
  return <Glyph className={className} aria-hidden />;
}
