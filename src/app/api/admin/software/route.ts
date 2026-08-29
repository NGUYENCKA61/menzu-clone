import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { docHtmlIsEmpty, isHtmlBody, sanitizeDocHtml } from "@/lib/docHtml";
import {
  cleanFeaturesNote,
  sanitizeFeatures,
  serializeFeatures,
} from "@/lib/productFeatures";
import { cleanGuideHtml } from "@/lib/productGuide";
import { uniqueProductSlug } from "@/lib/routes";
import { slugify } from "@/lib/slug";

const STATUSES = ["UNDETECTED", "DETECTED", "UPDATING"] as const;
type SoftwareStatusValue = (typeof STATUSES)[number];

function readStatus(value: unknown): SoftwareStatusValue | undefined {
  return STATUSES.includes(value as SoftwareStatusValue)
    ? (value as SoftwareStatusValue)
    : undefined;
}

/**
 * A stock code minted from the name — "HACK CS2 BẢN MỚI" -> "HACKCS2BANMOI".
 *
 * Same shape as the codes the shop typed by hand, so the two kinds sit in one
 * column without a generated prefix giving them away. Truncated to keep the
 * admin URLs it appears in readable; numbered on collision because two tools
 * can share a name's first twelve letters.
 */
function mintCode(name: string, taken: Set<string>): string {
  const base = slugify(name).replace(/-/g, "").toUpperCase().slice(0, 12) || "TOOL";
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Descriptions from the rich editor arrive as HTML — caged to the sanctioned
 *  tags before they land, exactly as article bodies are. Plain text passes
 *  through untouched; an empty document stores as null, not as a blank page. */
function cleanDescription(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!isHtmlBody(value)) return value;
  const clean = sanitizeDocHtml(value);
  return docHtmlIsEmpty(clean) ? null : clean;
}

/**
 * Create a software product.
 *
 * Separate from the account route because almost nothing they ask for is the
 * same — a tool has a name and a detection state and no rank, and folding both
 * into one endpoint would have meant a body where half the fields are ignored
 * depending on a flag. The row they write is the same row; the forms are not.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    categorySlug?: string;
    name?: string;
    description?: string;
    status?: string;
    price?: number;
    imageUrl?: string;
    downloadUrl?: string;
  } | null;

  const typedCode = body?.code?.trim().toUpperCase() || null;
  const categorySlug = body?.categorySlug?.trim();
  const name = body?.name?.trim();
  // Optional now: the figure customers see lives on the tiers, and the flat
  // column is kept synced to the cheapest one by the packages route. A tool
  // is created bare and priced by its first tier.
  const price = Number(body?.price ?? 0);

  if (!name) return NextResponse.json({ error: "Thiếu tên phần mềm" }, { status: 400 });
  if (!categorySlug) return NextResponse.json({ error: "Thiếu danh mục" }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Giá không hợp lệ" }, { status: 400 });
  }

  const category = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!category) {
    return NextResponse.json({ error: "Danh mục không tồn tại" }, { status: 404 });
  }

  // The stock code is an internal key now — the address customers see is the
  // slug. Typed, it still works exactly as before (including reviving a
  // removed product that carried it); left blank, one is minted from the name,
  // because making the shop invent "VALTOOL01" for a key nobody reads was
  // busy-work.
  const clash = typedCode
    ? await db.product.findUnique({ where: { code: typedCode } })
    : null;
  if (clash && !clash.deletedAt) {
    return NextResponse.json({ error: "Mã này đã tồn tại" }, { status: 409 });
  }

  // Codes of every product, live and removed alike: the column is unique.
  const existing = await db.product.findMany({ select: { code: true, slug: true } });
  const code = typedCode ?? mintCode(name, new Set(existing.map((p) => p.code)));

  const data = {
    categoryId: category.id,
    productType: "SOFTWARE_GAME" as const,
    name,
    description: body?.description ? cleanDescription(body.description) : null,
    softwareStatus: readStatus(body?.status) ?? "UNDETECTED",
    price: BigInt(Math.floor(price)),
    oldPrice: BigInt(Math.floor(price)),
    status: "AVAILABLE" as const,
    imageUrl: body?.imageUrl?.trim() || null,
    downloadUrl: body?.downloadUrl?.trim() || null,
    // A tool has no rank. The column stays required for the accounts that do,
    // so software writes the empty string rather than a fake value that would
    // show up if anything ever printed it.
    rank: "",
    deletedAt: null,
  };

  if (clash?.deletedAt) {
    // The removed row may have been an account, and a sold one at that: its
    // sign-in must not ride along under a tool nothing reads it from — or, if
    // the row ever became an account again, be handed to the next buyer.
    const revived = await db.product.update({
      where: { code: clash.code },
      data: { ...data, loginUsername: null, loginPassword: null, loginNote: null },
    });
    return NextResponse.json({ code: revived.code, revived: true });
  }

  // The tool's name is what a customer reads, so it is what its address is
  // built from — /hack-pubg/hack-pubg-ban-desync, not the stock code.
  const created = await db.product.create({
    data: {
      code,
      slug: uniqueProductSlug(data.name, code, existing.map((p) => p.slug)),
      ...data,
    },
  });
  return NextResponse.json({ code: created.code });
}

/** Edit the fields that are software's own. */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    name?: string;
    description?: string;
    softwareStatus?: string;
    status?: string;
    slug?: string;
    /** The whole "Tính năng nổi bật" list, replaced as a block. */
    features?: unknown;
    /** The write-up under it, as editor HTML. */
    featuresNote?: string;
    /** "Hướng dẫn sử dụng", as editor HTML. */
    guide?: string;
    price?: number;
    downloadUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
  } | null;

  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const product = await db.product.findFirst({
    where: { code, productType: "SOFTWARE_GAME" },
  });
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // The public half of the address. Editable because a slug outlives the name
  // it was built from — a tool renamed after launch keeps whatever URL it was
  // published under until the shop decides otherwise, and a typo caught later
  // should be fixable without recreating the product.
  let slug: string | undefined;
  if (body?.slug !== undefined) {
    slug = slugify(body.slug);
    if (!slug) {
      return NextResponse.json({ error: "Đường dẫn không hợp lệ" }, { status: 400 });
    }
    if (slug !== product.slug) {
      const clash = await db.product.findUnique({
        where: { slug },
        select: { code: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: `Đường dẫn "${slug}" đã thuộc về sản phẩm ${clash.code}` },
          { status: 409 },
        );
      }
    }
  }

  const stockStatus = ["AVAILABLE", "HIDDEN"].includes(body?.status ?? "")
    ? (body!.status as "AVAILABLE" | "HIDDEN")
    : undefined;
  const price =
    body?.price !== undefined && Number.isFinite(Number(body.price)) && Number(body.price) > 0
      ? BigInt(Math.floor(Number(body.price)))
      : undefined;

  await db.product.update({
    where: { code },
    data: {
      ...(body?.name?.trim() ? { name: body.name.trim() } : {}),
      ...(slug ? { slug } : {}),
      // Sent whole or not at all. An empty list clears the column, which is how
      // the shop says "use the default" rather than "print nothing".
      ...(body?.features !== undefined
        ? { features: serializeFeatures(sanitizeFeatures(body.features)) }
        : {}),
      // Sent as "" to clear it, same convention as the description.
      ...(body?.featuresNote !== undefined
        ? { featuresNote: cleanFeaturesNote(body.featuresNote) }
        : {}),
      // "" clears it, which puts the default sentence back on the page.
      ...(body?.guide !== undefined ? { guide: cleanGuideHtml(body.guide) } : {}),
      ...(body?.description !== undefined
        ? { description: cleanDescription(body.description) }
        : {}),
      ...(readStatus(body?.softwareStatus)
        ? { softwareStatus: readStatus(body?.softwareStatus) }
        : {}),
      ...(stockStatus ? { status: stockStatus } : {}),
      ...(price !== undefined ? { price } : {}),
      // Sent as "" to clear it, which is how the admin removes a dead link and
      // takes the button off the card.
      ...(body?.downloadUrl !== undefined
        ? { downloadUrl: body.downloadUrl.trim() || null }
        : {}),
      // "" clears the picture, dropping the card back to its empty frame.
      ...(body?.imageUrl !== undefined ? { imageUrl: body.imageUrl.trim() || null } : {}),
      // Stored as pasted. Validation happens where it renders, so a link that
      // is not YouTube falls the frame back to the picture rather than being
      // silently dropped here and leaving the admin wondering what they typed.
      ...(body?.videoUrl !== undefined ? { videoUrl: body.videoUrl.trim() || null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
