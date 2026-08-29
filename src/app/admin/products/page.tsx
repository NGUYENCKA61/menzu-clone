import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Boxes,
  ImageIcon,
  KeyRound,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

import { AdminCategories } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminCategories";
import { AdminProducts } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminProducts";
import { AdminProductTabs } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminProductTabs";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminSoftware } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSoftware";
import { AdminWeaponImages } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminWeaponImages";
import { deliversAutomatically, readLogin, tagOf } from "@/lib/accountLogin";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { listAdminCategories } from "@/lib/queries";
import { getShopSettings } from "@/lib/settingsStore";
import { weaponKey } from "@/lib/weaponImages";

/** How many of the un-illustrated weapons the worklist offers at a time. */
const MISSING_SHOWN = 24;

/**
 * Rows the scrape wrote when it could read a skin's tier but not its name —
 * "EXCLUSIVE #1", "PREMIUM #2". They are placeholders, not weapons, and they
 * repeat across every scraped account, so by frequency alone they would fill the
 * whole "needs a picture" list with the only entries on it that can never have
 * one. Hidden from that list only; the cards still print whatever is stored.
 */
const PLACEHOLDER_SKIN = /^(ULTRA|EXCLUSIVE|PREMIUM|DELUXE|SELECT) #\d+$/i;

export const metadata: Metadata = { title: "Sản phẩm | Quản trị" };
export const dynamic = "force-dynamic";

const SECTION_NOTE = "text-xs text-neutral-400";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tint: string;
}) {
  const idle = value === "0";
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {label}
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tint}`}>
          <Icon size={15} />
        </span>
      </div>
      <span
        className={`text-[26px] font-black leading-none tabular-nums ${
          idle ? "text-neutral-600" : "text-white"
        }`}
      >
        {value}
      </span>
      <span className="text-[11px] text-neutral-500">{sub}</span>
    </div>
  );
}

export default async function AdminProductsPage() {
  const admin = await getAdmin();
  if (!admin) notFound();

  const [rows, removedCount, softwareRows, categories, settings] = await Promise.all([
    db.product.findMany({
      where: { deletedAt: null, productType: "ACCOUNT_GAME" },
      orderBy: { createdAt: "desc" },
      take: 100,
      // Only what a shelf row prints - every editor lives on the detail page
      // now, with its own query.
      include: {
        category: { select: { name: true } },
        _count: { select: { orders: true } },
        tags: { select: { label: true } },
      },
    }),
    // Only counted now: the restore section left this screen, so all the
    // header needs of the removed products is how many there are.
    db.product.count({ where: { deletedAt: { not: null } } }),
    db.product.findMany({
      where: { deletedAt: null, productType: "SOFTWARE_GAME" },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        packages: {
          orderBy: { price: "asc" },
          include: { _count: { select: { orders: true } } },
        },
      },
    }),
    listAdminCategories(),
    getShopSettings(),
  ]);

  // The picture library, and how often each weapon is listed across the shop.
  // A second round trip rather than a sixth entry above, because the worklist is
  // a tally over the skin table rather than anything the queries above return.
  const [weaponImages, skinNameCounts] = await Promise.all([
    db.weaponImage.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    // Most-listed items first: with hundreds of names in the shop, the ones
    // worth finding a picture for are the ones the most accounts carry. All
    // three typed categories — weapons, characters, gear — share the library.
    db.productSkin.groupBy({
      by: ["name"],
      where: {
        kind: { in: ["WEAPON_SKIN", "AGENT", "BUDDY"] },
        product: { deletedAt: null },
      },
      _count: { name: true },
      orderBy: { _count: { name: "desc" } },
    }),
  ]);

  const illustrated = new Set(weaponImages.map((w) => w.key));
  const missing = skinNameCounts.filter(
    (s) => !illustrated.has(weaponKey(s.name)) && !PLACEHOLDER_SKIN.test(s.name),
  );

  const softwarePackages = softwareRows.reduce((sum, s) => sum + s.packages.length, 0);

  // NFA accounts on the shelf that would sell with nothing to hand over by
  // themselves. Other tags are handed over in person and need no sign-in on
  // the row; this is the list to fix before the next sale, not after it.
  const forSale = rows.filter((p) => p.status === "AVAILABLE");
  const unlistedLogins = forSale.filter(
    (p) => deliversAutomatically(tagOf(p)) && readLogin(p) === null,
  ).length;

  return (
    <AdminShell
      title="Sản phẩm"
      subtitle="Danh mục, tài khoản, phần mềm và kho ảnh — mỗi thứ một thẻ"
      username={admin.username}
    >
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Danh mục"
          value={String(categories.length)}
          sub="nhóm hàng ngoài trang chủ"
          icon={LayoutGrid}
          tint="border-indigo-500/25 bg-indigo-500/10 text-indigo-400"
        />
        <StatCard
          label="Tài khoản game"
          value={String(rows.length)}
          sub={`${forSale.length} đang bán · ${removedCount} đã gỡ${
            unlistedLogins > 0 ? ` · ${unlistedLogins} NFA chưa có TK đăng nhập` : ""
          }`}
          icon={Boxes}
          tint={
            unlistedLogins > 0
              ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
          }
        />
        <StatCard
          label="Phần mềm"
          value={String(softwareRows.length)}
          sub={`${softwarePackages} gói thời hạn`}
          icon={KeyRound}
          tint="border-violet-500/25 bg-violet-500/10 text-violet-400"
        />
        <StatCard
          label="Kho ảnh vật phẩm"
          value={String(weaponImages.length)}
          sub={
            missing.length > 0
              ? `${missing.length} vật phẩm chưa có ảnh`
              : "đủ ảnh cho mọi vật phẩm"
          }
          icon={ImageIcon}
          tint={
            missing.length > 0
              ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
              : "border-sky-500/25 bg-sky-500/10 text-sky-400"
          }
        />
      </div>

      <AdminProductTabs
        tabs={[
          { label: "Danh mục", count: categories.length },
          { label: "Tài khoản", count: rows.length },
          { label: "Phần mềm", count: softwareRows.length },
          { label: "Kho ảnh", count: weaponImages.length, alert: missing.length > 0 },
        ]}
      >
        <section className="flex flex-col gap-4">
          <p className={SECTION_NOTE}>
            Thêm danh mục mới, sửa tên và đường dẫn, đổi thứ tự hiển thị ngoài
            trang chủ, hoặc xóa danh mục không còn dùng. Danh mục có trước, sản
            phẩm treo vào sau.
          </p>
          <AdminCategories categories={categories} />
        </section>

        <section className="flex flex-col gap-4">
          <p className={SECTION_NOTE}>
            Thêm tài khoản mới, đổi giá, đổi trạng thái hoặc xoá. Tài khoản đã
            bán được giữ lại để lịch sử đơn hàng không mất, và khôi phục được.
          </p>
          <AdminProducts
            products={rows.map((p) => ({
              code: p.code,
              name: p.name ?? "",
              rank: p.rank,
              status: p.status,
              price: Number(p.price),
              categoryName: p.category.name,
              orderCount: p._count.orders,
              imageUrl: p.imageUrl ?? "",
              tag: p.tags[0]?.label ?? "",
              hasLogin: readLogin(p) !== null,
            }))}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          />
        </section>

        <section className="flex flex-col gap-4">
          <p className={SECTION_NOTE}>
            Cùng bảng sản phẩm với tài khoản, chỉ khác loại. Mỗi phần mềm bán
            theo gói thời hạn — thêm gói ở ngay dưới từng sản phẩm.
          </p>
          <AdminSoftware
            software={softwareRows.map((s) => ({
              code: s.code,
              name: s.name ?? s.code,
              categoryName: s.category.name,
              softwareStatus: s.softwareStatus,
              status: s.status,
              price: Number(s.price),
              description: s.description ?? "",
              downloadUrl: s.downloadUrl ?? "",
              imageUrl: s.imageUrl ?? "",
              videoUrl: s.videoUrl ?? "",
              packages: s.packages.map((p) => ({
                id: p.id,
                label: p.label,
                price: Number(p.price),
                durationHours: p.durationHours,
                orderCount: p._count.orders,
              })),
            }))}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          />
        </section>

        <section className="flex flex-col gap-4">
          <p className={SECTION_NOTE}>
            Mỗi vật phẩm (súng, nhân vật, trang bị) một ảnh, dùng chung cho mọi
            tài khoản có nó — tìm ảnh một lần, không phải làm lại theo từng acc.
            Card nào chưa có ảnh thì hiện tên súng, vẫn bán bình thường.
          </p>
          <AdminWeaponImages
            images={weaponImages.map((w) => ({
              name: w.name,
              url: w.url,
              width: w.width,
              height: w.height,
              sourceUrl: w.sourceUrl,
            }))}
            missing={missing.slice(0, MISSING_SHOWN).map((s) => s.name)}
            missingTotal={missing.length}
            hotPickSkin={settings.hotPickSkin}
          />
        </section>
      </AdminProductTabs>
    </AdminShell>
  );
}
