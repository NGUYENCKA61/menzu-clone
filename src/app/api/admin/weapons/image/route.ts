import { randomBytes } from "node:crypto";

import { removeUpload, storeUpload } from "@/lib/blobStore";
import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { extensionFor } from "@/lib/authPanel";
import { db } from "@/lib/db";
import {
  fetchWeaponImage,
  inspectImage,
  weaponKey,
  type FetchResult,
} from "@/lib/weaponImages";

const MAX_NAME_LENGTH = 80;

/**
 * Add or replace a weapon's picture in the shared library.
 *
 * Two ways in, one result. A link is downloaded here — the shop copies an image
 * address off a wiki page, and the server keeps its own copy — and a file is
 * taken straight off the disk for a picture that lives anywhere else. Both end
 * up as a file under /public and one row keyed by the weapon's name, which is
 * what lets every account listing that weapon draw it without doing this again.
 *
 * Saving a weapon that is already in the library replaces its picture rather
 * than adding a second: the key is unique, and "add M200 again" can only
 * sensibly mean "use this picture for M200 instead".
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const contentType = request.headers.get("content-type") ?? "";
  const fromDisk = contentType.includes("multipart/form-data");

  let name = "";
  let sourceUrl: string | null = null;
  let result: FetchResult;

  if (fromDisk) {
    const form = await request.formData().catch(() => null);
    name = String(form?.get("name") ?? "");
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chưa chọn ảnh" }, { status: 400 });
    }
    result = inspectImage(new Uint8Array(await file.arrayBuffer()), file.type);
  } else {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      sourceUrl?: string;
    } | null;
    name = String(body?.name ?? "");
    sourceUrl = body?.sourceUrl?.trim() || null;
    if (!sourceUrl) {
      return NextResponse.json({ error: "Chưa dán link ảnh" }, { status: 400 });
    }
    result = await fetchWeaponImage(sourceUrl);
  }

  // The name is checked after the picture so a bad link is reported as a bad
  // link, rather than the shop fixing a name only to hit the real problem next.
  name = name.trim().replace(/\s+/g, " ");
  if (!name) return NextResponse.json({ error: "Thiếu tên súng" }, { status: 400 });
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Tên súng tối đa ${MAX_NAME_LENGTH} ký tự` },
      { status: 400 },
    );
  }

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const { bytes, type, width, height } = result.image;

  // Never a name from the request — it can carry path separators. A fresh name
  // each save also means a replaced picture cannot be served from a browser
  // cache holding the old one.
  const filename = `${randomBytes(12).toString("hex")}${extensionFor(type)}`;
  // `type` here, not file.type: this route also accepts a URL to fetch from,
  // so there is not always a File to ask.
  const url = await storeUpload("weapons", filename, bytes, type);
  const key = weaponKey(name);
  const previous = await db.weaponImage.findUnique({
    where: { key },
    select: { url: true },
  });

  const row = await db.weaponImage.upsert({
    where: { key },
    create: { key, name, url, width, height, sourceUrl },
    update: { name, url, width, height, sourceUrl },
  });

  // Swapping a weapon's picture leaves the old file with nothing pointing at
  // it, and a shop that tries three pictures before settling would leave two
  // behind every time. Deleted only once the row is safely updated, only for
  // files this route wrote, and never at the cost of the save itself — the
  // library is already correct whether or not the disk cooperates.
  if (previous && previous.url !== url) {
    await removeUpload(previous.url);
  }

  return NextResponse.json({
    name: row.name,
    url: row.url,
    width: row.width,
    height: row.height,
  });
}

/**
 * Drop a weapon from the library.
 *
 * The file on disk is left where it is. Deleting it would save a few kilobytes
 * and risk blanking a card still pointing at it, and the same reasoning already
 * governs every other uploader here: rows are the record, files accumulate.
 */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const name = new URL(request.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Thiếu tên súng" }, { status: 400 });

  const key = weaponKey(name);
  const existing = await db.weaponImage.findUnique({ where: { key } });
  if (!existing) return NextResponse.json({ error: "Không có trong kho" }, { status: 404 });

  await db.weaponImage.delete({ where: { key } });
  return NextResponse.json({ ok: true });
}
