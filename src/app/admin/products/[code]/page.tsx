import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminAccountDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminAccountDetail";
import { AdminChrome } from "@/components/sites/menzu-lol-f7ae197a/admin/AdminChrome";
import { AdminSoftwareDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSoftwareDetail";
import { WarrantyQuestionsEditor } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyQuestionsEditor";
import { parseQuestionSet, resolveQuestions } from "@/lib/warrantyDetails";
import { getAdmin } from "@/lib/admin";
import { PREMIUM_KINDS, gradeMark, vipIngameOf } from "@/lib/cfGrades";
import { groupedLines } from "@/lib/cfInventoryGroups";
import { db } from "@/lib/db";
import { isHtmlBody, plainToDocHtml } from "@/lib/docHtml";
import { readKeyStore } from "@/lib/packageKeyStore";
import { parseBadges } from "@/lib/productBadges";
import { noteToEditorHtml, parseFeatures } from "@/lib/productFeatures";
import { parseRequirements } from "@/lib/productRequirements";
import { guideToEditorHtml } from "@/lib/productGuide";
import { productHref } from "@/lib/routes";
import { statusPillMode } from "@/lib/statusPill";
import { readLaunchers, readRunsOn } from "@/lib/toolFilters";

export const metadata: Metadata = { title: "Chi tiết sản phẩm | Quản trị" };
export const dynamic = "force-dynamic";

/** Route params arrive percent-encoded — Vietnamese account codes exist. */
function decodeCode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** One account's desk: price, pictures, inventory and the danger zone. */
export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const code = decodeCode((await params).code);
  const product = await db.product.findFirst({
    where: { code, deletedAt: null, productType: "ACCOUNT_GAME" },
    include: {
      category: { select: { name: true, slug: true, warrantyQuestions: true } },
      _count: { select: { orders: true } },
      tags: { select: { label: true } },
      images: {
        select: { id: true, url: true },
        orderBy: { sortOrder: "asc" },
      },
      skins: {
        where: { kind: { in: ["WEAPON_SKIN", "AGENT", "BUDDY", "COSTUME", "ACCESSORY"] } },
        select: { kind: true, name: true, weapon: true, tier: true, iconUrl: true },
        orderBy: { id: "asc" },
      },
      // Who holds this account now, if anyone: the sign-in card says whether
      // what is typed there has already reached a buyer. The latest paid
      // order is the one that counts — the account was re-listed and sold
      // again, or it would not have a second one.
      orders: {
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { code: true, user: { select: { username: true } } },
      },
    },
  });

  // Not an account? The same address serves software — one desk per product,
  // whatever its type.
  if (!product) {
    const software = await db.product.findFirst({
      where: { code, deletedAt: null, productType: "SOFTWARE_GAME" },
      include: {
        category: {
          select: { name: true, slug: true, warrantyQuestions: true },
        },
        packages: {
          orderBy: { price: "asc" },
          include: { _count: { select: { orders: true } } },
        },
      },
    });
    if (!software) notFound();

    // One read per tier. Tiers are few — three or four — and each store is a
    // handful of small queries, so this stays cheaper than one join that would
    // have to carry every key row through the page.
    const keyStores = await Promise.all(
      software.packages.map((p) => readKeyStore(p.id)),
    );

    return (
      <AdminChrome
        title={software.name ?? software.code}
        subtitle="Chi tiết phần mềm, thông tin, giá, gói thời hạn"
        username={admin.username}
        aside={
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Danh sách sản phẩm
          </Link>
        }
      >
        <AdminSoftwareDetail
          software={{
            publicHref: productHref(software.category.slug, software.slug),
            features: parseFeatures(software.features),
            requirements: parseRequirements(software.requirements),
            // Lifted to editor HTML here so the client bundle never needs the
            // converter — same treatment the description gets.
            featuresNoteHtml: noteToEditorHtml(software.featuresNote),
            guideHtml: guideToEditorHtml(software.guide),
            setupGuideHtml: guideToEditorHtml(software.setupGuide),
            slug: software.slug,
            categorySlug: software.category.slug,
            code: software.code,
            name: software.name ?? software.code,
            categoryName: software.category.name,
            softwareStatus: software.softwareStatus,
            runsOn: readRunsOn(software.runsOn),
            launchers: readLaunchers(software.launchers),
            statusPill: statusPillMode(software.showStatus),
            status: software.status,
            price: Number(software.price),
            // Lifted to editor HTML here so the client bundle never needs the
            // converter — same treatment article bodies get.
            descriptionHtml: software.description
              ? isHtmlBody(software.description)
                ? software.description
                : plainToDocHtml(software.description)
              : "",
            downloadUrl: software.downloadUrl ?? "",
            downloadName: software.downloadName ?? "",
            docsUrl: software.docsUrl ?? "",
            verifiedOnly: software.verifiedOnly,
            // "" rather than "0": the form has to be able to tell "no promise
            // set" from "we refund nothing".
            refundRate:
              software.refundRate === null ? "" : String(software.refundRate),
            badges: parseBadges(software.badge),
            imageUrl: software.imageUrl ?? "",
            videoUrl: software.videoUrl ?? "",
            summary: software.summary ?? "",
            packages: software.packages.map((p, index) => ({
              id: p.id,
              label: p.label,
              price: Number(p.price),
              durationHours: p.durationHours,
              orderCount: p._count.orders,
              keys: keyStores[index]!,
            })),
          }}
        />
        {/* This tool's own second-round questions; the game's set, where
            the game has one, is what it starts from and falls back to. */}
        <div className="mt-5">
          <WarrantyQuestionsEditor
            endpoint="/api/admin/software"
            ident={{ code: software.code }}
            initial={software.warrantyQuestions}
            bank={resolveQuestions(
              "software",
              null,
              software.category.warrantyQuestions,
            )}
            inheritName={
              parseQuestionSet(software.category.warrantyQuestions)
                ? `bộ của ${software.category.name}`
                : "bộ mặc định"
            }
          />
        </div>
      </AdminChrome>
    );
  }

  // The shelf behind an "acc random" listing, as the key desk reads it.
  const pool = product.accountPool
    ? await (async () => {
        const pkg = await db.productPackage.findFirst({
          where: { productId: product.id },
          orderBy: { sortOrder: "asc" },
          select: { id: true },
        });
        const store = pkg ? await readKeyStore(pkg.id) : null;
        return {
          available: store?.available ?? 0,
          sold: store?.sold ?? 0,
          shelf: store?.shelf ?? [],
          recent: (store?.recent ?? []).map((k) => ({
            id: k.id,
            value: k.value,
            // readKeyStore already formats the time and flattens the buyer.
            when: k.deliveredAt,
            buyer: k.username,
            orderCode: k.orderCode ?? "",
          })),
        };
      })()
    : null;

  return (
    <AdminChrome
      title={product.name || `#${product.code}`}
      subtitle="Chi tiết tài khoản, giá, ảnh, vật phẩm và trạng thái"
      username={admin.username}
      aside={
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Danh sách sản phẩm
        </Link>
      }
    >
      <AdminAccountDetail
        account={{
          publicHref: productHref(product.category.slug, product.slug),
          // Lifted to editor HTML here so the client bundle never needs the
          // converter — same treatment the software description gets.
          descriptionHtml: product.description
            ? isHtmlBody(product.description)
              ? product.description
              : plainToDocHtml(product.description)
            : "",
          code: product.code,
          name: product.name ?? "",
          rank: product.rank,
          status: product.status,
          verifiedOnly: product.verifiedOnly,
          price: Number(product.price),
          oldPrice: Number(product.oldPrice),
          categoryName: product.category.name,
          orderCount: product._count.orders,
          imageUrl: product.imageUrl ?? "",
          gallery: product.images,
          tag: product.tags[0]?.label ?? "",
          vip: product.vip,
          vipIngame: product.vipIngame,
          // Counted from the list once there is one (lib/cfGrades).
          vipItems: product.skins.some((s) => PREMIUM_KINDS.includes(s.kind))
            ? vipIngameOf(product.vipIngame, product.skins)
            : null,
          rankMatch: product.rankMatch,
          // Weapons and gear keep their "[Group]" lines (lib/cfInventoryGroups).
          skinNames: groupedLines(
            product.skins
              .filter((s) => s.kind === "WEAPON_SKIN")
              .map((s) => ({ name: s.name + gradeMark(s.tier), group: s.weapon })),
          ),
          characterNames: product.skins
            .filter((s) => s.kind === "AGENT")
            .map((s) => s.name + gradeMark(s.tier)),
          gearNames: groupedLines(
            product.skins
              .filter((s) => s.kind === "BUDDY")
              .map((s) => ({ name: s.name + gradeMark(s.tier), group: s.weapon })),
          ),
          costumeNames: product.skins
            .filter((s) => s.kind === "COSTUME")
            .map((s) => s.name + gradeMark(s.tier)),
          accessoryNames: product.skins
            .filter((s) => s.kind === "ACCESSORY")
            .map((s) => s.name + gradeMark(s.tier)),
          loginUsername: product.loginUsername ?? "",
          loginPassword: product.loginPassword ?? "",
          loginNote: product.loginNote ?? "",
          buyer: product.orders[0]
            ? {
                username: product.orders[0].user.username,
                orderCode: product.orders[0].code,
              }
            : null,
          accountPool: product.accountPool,
          pool,
        }}
      />
      {/* No second-round editor for an account: its report has no second
          round (hasSecondRound; the owner, 12/10/2026). */}
    </AdminChrome>
  );
}
