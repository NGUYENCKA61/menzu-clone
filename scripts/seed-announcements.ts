/**
 * Writes one live announcement of each kind, so the bell, the dropdown, the
 * modal and the admin table can all be looked at with real rows behind them.
 *
 *   npx tsx --env-file=.env scripts/seed-announcements.ts
 *   npx tsx --env-file=.env scripts/seed-announcements.ts --clean
 *
 * Removal matches these exact titles, so anything the shop wrote itself is
 * left alone — there is no marker column to hide a flag in, and deleting by
 * "everything published today" would take real notices with it.
 */

import { db } from "@/lib/db";

const SEEDED = [
  {
    type: "UPDATE" as const,
    priority: "NORMAL" as const,
    title: "Cập nhật hệ thống",
    body:
      "Hệ thống đã được cập nhật lên phiên bản mới với nhiều cải tiến về giao diện, " +
      "hiệu suất và độ ổn định.",
    bullets: [
      "Giao diện được tối ưu mượt và ổn định hơn.",
      "Bổ sung một số tính năng mới.",
      "Cải thiện hiệu suất và trải nghiệm sử dụng.",
    ],
    noticeTitle: "Có gì mới",
    noticeBody: "Phiên bản v2.4.0 — xem chi tiết trong mục Bài viết.",
  },
  {
    type: "MAINTENANCE" as const,
    priority: "HIGH" as const,
    title: "Bảo trì hệ thống website",
    body:
      "Shop sẽ bảo trì từ 00:00 – 03:00. Trong thời gian này, chức năng nạp tiền và " +
      "mua hàng sẽ tạm thời không khả dụng.",
    bullets: [
      "Nên mua key trước thời gian bảo trì.",
      "Nạp tiền và mua hàng sẽ tạm dừng trong thời gian bảo trì.",
    ],
    noticeTitle: "Lưu ý",
    noticeBody: "Số dư trong ví không bị ảnh hưởng trong thời gian bảo trì.",
  },
  {
    type: "PROMO" as const,
    priority: "NORMAL" as const,
    title: "Nhân dịp tết đến xuân về",
    body: "Áp voucher này để được giảm 20% nhé ae, mã voucher là: XuanVuiTuoi",
    bullets: [],
    noticeTitle: "Chơi game chứ đừng rủ đua bia rồi lái xe nha",
    noticeBody: "Voucher giảm 20% · Áp dụng theo điều kiện chương trình.",
  },
  {
    type: "GIFT" as const,
    priority: "NORMAL" as const,
    title: "Quà tặng tri ân",
    body:
      "Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi. Phần quà của bạn là " +
      "1 Pack chuột gaming chuẩn FPS có logo THICHTHIHACK.COM.",
    bullets: [
      "Vui lòng cung cấp thông tin nhận hàng để shop gửi phần quà đến bạn.",
      "Bạn không mất phí vận chuyển, mọi chi phí vận chuyển đều miễn phí.",
    ],
    noticeTitle: "Xin chào",
    noticeBody: "Đừng bỏ lỡ phần quà này nhé!",
  },
  {
    type: "INFO" as const,
    priority: "LOW" as const,
    title: "Thông tin tài khoản",
    body: "Một số thông tin về tài khoản của bạn vừa được cập nhật.",
    bullets: [],
    noticeTitle: null,
    noticeBody: null,
  },
];

const TITLES = SEEDED.map((row) => row.title);

async function clean() {
  const doomed = await db.announcement.findMany({
    where: { title: { in: TITLES } },
    select: { id: true },
  });
  const ids = doomed.map((row) => row.id);
  await db.announcementRecipient.deleteMany({ where: { announcementId: { in: ids } } });
  const removed = await db.announcement.deleteMany({ where: { id: { in: ids } } });
  console.log(`Đã xóa ${removed.count} thông báo thử.`);
}

async function seed() {
  // It used to clear first, so that running twice did not stack five more on
  // top. That made seeding a delete, and matching by title meant it took a
  // notice the shop had written under one of these names. Seeding now only
  // ever adds; removing is --clean, asked for on purpose.
  const existing = await db.announcement.count({ where: { title: { in: TITLES } } });
  if (existing > 0) {
    console.error(
      `Đã có ${existing} thông báo trùng tên với bộ mẫu. Chạy --clean trước nếu muốn tạo lại.`,
    );
    process.exitCode = 1;
    return;
  }

  const now = Date.now();
  const MINUTE = 60 * 1000;
  // Spread backwards so "10 phút trước" and "2 ngày trước" both appear, and the
  // newest-first ordering has something to order.
  const ages = [10 * MINUTE, 30 * MINUTE, 2 * 60 * MINUTE, 26 * 60 * MINUTE, 48 * 60 * MINUTE];

  for (const [index, row] of SEEDED.entries()) {
    await db.announcement.create({
      data: {
        ...row,
        status: "PUBLISHED",
        audience: "ALL",
        // Already started, no end: live the moment this finishes.
        startAt: new Date(now - ages[index]!),
        endAt: null,
      },
    });
  }

  console.log(`Đã tạo ${SEEDED.length} thông báo, mỗi loại một cái, đang chạy.`);
  console.log(`Tổng số thông báo: ${await db.announcement.count()}.`);
  console.log("Xóa hết: npx tsx --env-file=.env scripts/seed-announcements.ts --clean");
}

async function main() {
  if (process.argv[2] === "--clean") {
    await clean();
    return;
  }
  await seed();
}

void main();
