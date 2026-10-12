/**
 * A buyer's report that something they paid for is not working: a tool, or
 * an account.
 *
 * Warranty is the promise before a refund: the shop fixes the thing — a fresh
 * key, an update, a hand with the install, another account — and only when it
 * cannot does money come into it. The rules here are shared by the form, the
 * page and the route, so none of them can promise what another refuses.
 *
 * The two kinds report different faults (the owner, 08/10/2026: "trang chi
 * tiết bảo hành tài khoản và phần mềm khác nhau"), and an account's report
 * carries the screen recording its warranty depends on.
 */

export type WarrantyIssue =
  | "KEY_INVALID"
  | "DETECTED"
  | "INSTALL"
  | "OTHER"
  | "ACC_WRONG_LOGIN"
  | "ACC_LOCKED"
  | "ACC_RECLAIMED"
  | "ACC_NOT_AS_DESCRIBED";

/** Which form a report comes from: a tool's, or an account's. */
export type WarrantyKind = "software" | "account";

export function warrantyKind(productType: string): WarrantyKind {
  return productType === "ACCOUNT_GAME" ? "account" : "software";
}

/** What can go wrong, in the buyer's words, with a line to help them pick. */
export const WARRANTY_ISSUE: Record<WarrantyIssue, { label: string; hint: string }> = {
  KEY_INVALID: {
    label: "Key không hoạt động",
    hint: "Nhập key báo sai, hết hạn sớm hoặc không kích hoạt được.",
  },
  DETECTED: {
    label: "Tool bị phát hiện / tài khoản bị khóa",
    hint: "Game báo phát hiện, ban hoặc khóa sau khi dùng.",
  },
  INSTALL: {
    label: "Không cài được / không chạy",
    hint: "Lỗi lúc cài, mở không lên, crash, thiếu file.",
  },
  OTHER: {
    label: "Gặp lỗi khác",
    hint: "Mô tả rõ ở phần bên dưới.",
  },
  ACC_WRONG_LOGIN: {
    label: "Sai tài khoản / mật khẩu",
    hint: "Đăng nhập lần đầu đã báo sai thông tin.",
  },
  ACC_LOCKED: {
    label: "Tài khoản bị khóa / bị cấm",
    hint: "Vào game báo khóa, cấm hoặc tạm ngưng tài khoản.",
  },
  ACC_RECLAIMED: {
    label: "Bị đổi mật khẩu, mất quyền truy cập",
    hint: "Đang dùng thì bị đổi mật khẩu hoặc bị lấy lại tài khoản.",
  },
  ACC_NOT_AS_DESCRIBED: {
    label: "Không đúng mô tả",
    hint: "Rank, tướng, skin… khác với lúc mua.",
  },
};

export const WARRANTY_ISSUE_KEYS = Object.keys(WARRANTY_ISSUE) as WarrantyIssue[];

/** The choices each form offers, in the order the tiles show them. */
export const WARRANTY_ISSUES_FOR: Record<WarrantyKind, readonly WarrantyIssue[]> = {
  software: ["KEY_INVALID", "DETECTED", "INSTALL", "OTHER"],
  account: ["ACC_WRONG_LOGIN", "ACC_LOCKED", "ACC_RECLAIMED", "ACC_NOT_AS_DESCRIBED", "OTHER"],
};

/**
 * The answers the desk actually gives, one tap each, per kind of fault.
 *
 * A warranty reply is read by a customer who is already unhappy, and typed by
 * somebody working through a queue. Typed fresh every time it comes out
 * shorter and blunter each time — and the reply is required to close a ticket,
 * so the fastest way to close one was always the worst sentence. These are the
 * shop's own wording, editable after a tap: the point is a decent first draft,
 * not a form letter.
 *
 * Each list ends with the answer that is not good news, because that one needs
 * the most care and is the one nobody wants to compose twice.
 */
export const WARRANTY_REPLIES: Record<WarrantyIssue, readonly string[]> = {
  KEY_INVALID: [
    "Shop đã cấp key mới cho đơn này, bạn xem lại trong Lịch sử mua hàng nhé.",
    "Key đã được gia hạn thêm đúng thời gian bạn bị mất, bạn kiểm tra lại giúp shop.",
    "Key này đang bị trùng phiên đăng nhập. Bạn thoát hết máy cũ rồi nhập lại giúp shop nhé.",
  ],
  DETECTED: [
    "Tool đang bị phát hiện, shop đã tạm ngưng bán và đang cập nhật bản mới. Bạn tạm dừng dùng và theo dõi kênh trạng thái, có bản mới shop báo ngay.",
    "Bản mới đã cập nhật xong, bạn tải lại ở phần Link tải hack trong đơn rồi dùng bình thường nhé.",
    "Shop đã bù thêm thời gian cho đơn này vì thời gian tool ngưng hoạt động.",
  ],
  INSTALL: [
    "Bạn tắt hết phần mềm diệt virus (kể cả Windows Defender) rồi giải nén lại và chạy bằng quyền Administrator giúp shop nhé.",
    "Lỗi này do thiếu bản Visual C++ / .NET. Bạn cài theo hướng dẫn trong phần Tài liệu sử dụng của đơn rồi chạy lại nhé.",
    "Shop đã gửi bản cài khác cho trường hợp máy của bạn, bạn xem lại link tải trong đơn nhé.",
  ],
  OTHER: [
    "Shop đã xử lý xong phần này cho bạn, bạn kiểm tra lại giúp shop nhé.",
    "Shop đã cấp lại sản phẩm cho đơn này, bạn xem trong Lịch sử mua hàng nhé.",
    "Trường hợp này ngoài phạm vi bảo hành nên shop chưa hỗ trợ đổi/cấp lại được. Bạn nhắn shop qua kênh hỗ trợ để shop xem thêm giúp bạn.",
  ],
  ACC_WRONG_LOGIN: [
    "Shop đã cập nhật lại thông tin đăng nhập, bạn xem lại trong đơn ở Lịch sử mua hàng nhé.",
    "Shop đã đổi tài khoản khác cho bạn, bạn xem trong đơn ở Lịch sử mua hàng nhé.",
    "Video của bạn chưa quay liền mạch từ lúc lấy thông tin đến khi đăng nhập nên shop chưa bảo hành được. Bạn nhắn shop qua kênh hỗ trợ để shop xem thêm giúp bạn.",
  ],
  ACC_LOCKED: [
    "Shop đã đổi tài khoản khác cho bạn, bạn xem trong đơn ở Lịch sử mua hàng nhé.",
    "Shop đang liên hệ nhà phát hành để mở khóa, có kết quả shop báo bạn ngay.",
    "Tài khoản bị khóa sau khi bạn đã nhận và sử dụng nên nằm ngoài phạm vi bảo hành. Bạn nhắn shop qua kênh hỗ trợ để shop xem thêm giúp bạn.",
  ],
  ACC_RECLAIMED: [
    "Shop đã lấy lại quyền truy cập và đặt mật khẩu mới, bạn xem lại thông tin đăng nhập trong đơn nhé.",
    "Shop đã đổi tài khoản khác cho bạn, bạn xem trong đơn ở Lịch sử mua hàng nhé.",
    "Video của bạn chưa cho thấy tài khoản bị lấy lại nên shop chưa bảo hành được. Bạn nhắn shop qua kênh hỗ trợ để shop xem thêm giúp bạn.",
  ],
  ACC_NOT_AS_DESCRIBED: [
    "Shop đã đổi tài khoản đúng mô tả cho bạn, bạn xem trong đơn ở Lịch sử mua hàng nhé.",
    "Shop đã cập nhật lại mô tả và bù phần chênh lệch cho bạn.",
    "Shop đã kiểm tra, tài khoản đúng với mô tả lúc mua nên shop chưa đổi được. Bạn nhắn shop qua kênh hỗ trợ nếu cần xem thêm.",
  ],
};

/** The chosen issue, or the sentence to show instead of accepting it. */
/**
 * The reasons a shop gives when it turns a ticket into a refund — tapped in,
 * then edited, like the replies above. A refund has to say why too: "shop
 * hoàn tiền" alone reads like the shop gave up without looking.
 */
export const WARRANTY_REFUND_REPLIES: Record<WarrantyKind, readonly string[]> = {
  software: [
    "Tool đang bị phát hiện và chưa có bản mới trong thời gian gói của bạn, shop hoàn tiền cho bạn.",
    "Shop đã thử nhiều cách nhưng không khắc phục được lỗi trên máy của bạn, shop xin hoàn tiền cho bạn.",
    "Key bị lỗi phía nhà cung cấp và shop không cấp lại được, shop hoàn tiền cho đơn này.",
  ],
  account: [
    "Tài khoản bị khóa và shop không còn tài khoản tương tự để đổi, shop hoàn tiền cho bạn.",
    "Shop không lấy lại được quyền truy cập tài khoản, shop hoàn tiền cho đơn này.",
    "Tài khoản không đúng mô tả lúc mua, shop hoàn tiền cho bạn.",
  ],
};

/**
 * Where an account's screen recording lives: a link, not an upload (minutes
 * of video do not belong on the shop's disk). YouTube, Google Drive or any
 * other address the desk can open.
 */
export const VIDEO_URL_MAX = 500;

export function readVideoUrl(
  value: unknown,
): { ok: true; url: string } | { ok: false; error: string } {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) {
    return { ok: false, error: "Dán link video quay màn hình (YouTube, Google Drive…)." };
  }
  if (url.length > VIDEO_URL_MAX || !/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(url)) {
    return { ok: false, error: "Link video không hợp lệ, link phải bắt đầu bằng https://" };
  }
  return { ok: true, url };
}

export function readIssue(
  value: unknown,
  /** The order's kind: only that form's choices are accepted. */
  kind?: WarrantyKind,
): { ok: true; issue: WarrantyIssue } | { ok: false; error: string } {
  const issue = typeof value === "string" ? value.trim() : "";
  const allowed: readonly string[] = kind ? WARRANTY_ISSUES_FOR[kind] : WARRANTY_ISSUE_KEYS;
  if (allowed.includes(issue)) {
    return { ok: true, issue: issue as WarrantyIssue };
  }
  return { ok: false, error: "Chọn loại lỗi bạn gặp." };
}

export type WarrantyStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REFUNDING" | "REFUNDED";

export const WARRANTY_STATUS: Record<
  WarrantyStatus,
  { label: string; tile: string; dot: string }
> = {
  // White text, a coloured border and no fill (the owner, 12/10/2026: the
  // tinted chips "phát neon hơi sáng", then "chữ trắng viền màu đi"). New
  // is grey, since nothing has happened to it yet; being worked on is
  // amber; closed is green.
  // One family of words, the shop's side of it throughout: chờ xử lý, đang
  // xử lý, đã xử lý (the owner, 12/10/2026: "sửa lại sao cho hợp lý và
  // đồng bộ"). "Mới gửi" was the buyer's side of the same moment.
  OPEN: {
    label: "Chờ xử lý",
    // The shop's red: new is the one that wants the desk's eye ("mới gửi
    // viền đỏ đi").
    tile: "border-[var(--menzu-accent)]/60 bg-transparent text-white",
    dot: "bg-[var(--menzu-accent)]",
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    tile: "border-amber-500/60 bg-transparent text-white",
    dot: "bg-amber-500",
  },
  RESOLVED: {
    label: "Đã xử lý",
    tile: "border-emerald-500/60 bg-transparent text-white",
    dot: "bg-emerald-500",
  },
  // The shop could not fix it and is paying it back over a bank transfer:
  // waiting for the buyer's account, then for the shop's transfer.
  // Waiting on someone, as "Chờ xử lý" is: the buyer's account number, then
  // the shop's transfer.
  REFUNDING: {
    label: "Đang hoàn tiền",
    tile: "border-amber-500/60 bg-transparent text-white",
    dot: "bg-amber-500",
  },
  // Closed, as "Đã xử lý" is. Three colours for three kinds of state, not
  // five for five labels: amber was a shade from orange and rose a shade
  // from the shop's own red (the owner, 10/10/2026: "chỗ nào bất hợp lý thì
  // sửa lại đi").
  REFUNDED: {
    label: "Đã hoàn tiền",
    tile: "border-emerald-500/60 bg-transparent text-white",
    dot: "bg-emerald-500",
  },
};

/**
 * A ticket the shop has not closed yet. Fixed (RESOLVED) and paid back
 * (REFUNDED) are the two ways a ticket ends; a refund still waiting on a bank
 * transfer is not over.
 */
export function warrantyOpen(status: string): boolean {
  return status !== "RESOLVED" && status !== "REFUNDED";
}

/**
 * The receipt's warranty button for the order's newest report (the owner,
 * 01/10/2026): "Yêu cầu bảo hành" until one is sent, "Xem trạng thái" after —
 * the buyer only follows the ticket, the shop decides a refund — and
 * "Nhập số tài khoản" while a bank refund waits on the buyer's account, the
 * one step that is theirs to take.
 */
export function warrantyButton(
  latest: { status: WarrantyStatus; needsBank: boolean } | null,
): { kind: "request" | "status" | "bank"; label: string } {
  if (!latest) return { kind: "request", label: "Yêu cầu bảo hành" };
  if (latest.status === "REFUNDING" && latest.needsBank) {
    return { kind: "bank", label: "Nhập số tài khoản" };
  }
  return { kind: "status", label: "Xem trạng thái" };
}

/**
 * Short enough to be lazy, long enough to be answerable — the same floor the
 * refund form keeps, for the same reason: "loi key" is not a report.
 */
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 1000;

export const DESCRIPTION_TOO_SHORT = `Vui lòng mô tả rõ hơn, ít nhất ${DESCRIPTION_MIN} ký tự.`;
export const DESCRIPTION_TOO_LONG = `Mô tả tối đa ${DESCRIPTION_MAX} ký tự.`;

/** The trimmed description, or the sentence to show instead of accepting it. */
export function readDescription(
  value: unknown,
): { ok: true; description: string } | { ok: false; error: string } {
  const description = typeof value === "string" ? value.trim() : "";
  if (description.length < DESCRIPTION_MIN) {
    return { ok: false, error: DESCRIPTION_TOO_SHORT };
  }
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, error: DESCRIPTION_TOO_LONG };
  }
  return { ok: true, description };
}

/**
 * Whether this order can be reported on, and what to say when it cannot.
 *
 * Two refusals. An order that was never charged, or has already been paid
 * back, has nothing under warranty. One with a report still open should not
 * collect a second while the shop is working the first — the answer goes on
 * the ticket that exists. No clock: the shop closes what it has dealt with.
 *
 * `refunding` — the shop has already answered with a refund that is still on
 * its way (a bank refund); "the shop will reply" would be stale by then.
 */
export function warrantyBlockedReason({
  orderStatus,
  openRequest,
  refunding = false,
  signIn = null,
}: {
  orderStatus: string;
  openRequest: boolean;
  refunding?: boolean;
  /**
   * An account whose sign-in the buyer has not taken yet: still "locked"
   * behind "Lấy thông tin", or "pending" while the shop types it. Nothing
   * has been handed over, so there is nothing to report on yet, and the
   * recording an account's warranty rests on starts at the take.
   */
  signIn?: "locked" | "pending" | null;
}): string | null {
  if (orderStatus === "REFUNDED") {
    return "Đơn này đã được hoàn tiền.";
  }
  if (orderStatus !== "PAID") {
    return "Chỉ đơn đã thanh toán mới yêu cầu bảo hành được.";
  }
  if (refunding) {
    return "Đơn này đang được hoàn tiền, bạn theo dõi tiến độ ở yêu cầu phía trên.";
  }
  if (openRequest) {
    return "Đơn này đang có một yêu cầu bảo hành chưa xử lý xong, bạn trao đổi với shop ngay trong yêu cầu đó.";
  }
  if (signIn === "locked") {
    return "Bạn chưa nhận thông tin đăng nhập. Mở đơn trong Lịch sử mua, bấm Lấy thông tin (nhớ quay màn hình) rồi mới gửi bảo hành được.";
  }
  if (signIn === "pending") {
    return "Thông tin đăng nhập của đơn này đang được chuẩn bị, shop sẽ giao trong ít phút. Nhận xong mà có lỗi thì bạn gửi bảo hành tại đây.";
  }
  return null;
}
