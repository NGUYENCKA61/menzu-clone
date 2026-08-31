import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Where uploaded files actually go.
 *
 * Every uploader in this shop wrote straight to `public/uploads/…`, which is
 * exactly right on a box you own and exactly wrong on Netlify: the filesystem
 * there is read-only at request time and thrown away at every deploy, so a
 * picture the admin uploaded either failed outright or vanished at the next
 * build — with the product row still pointing at it.
 *
 * So the write goes through here instead. Configure an S3-compatible bucket
 * (Cloudflare R2, Backblaze B2, MinIO, or S3 itself) and files land there and
 * are served from its public address; configure nothing and it writes to disk
 * exactly as before, which is what keeps a self-hosted install and every
 * local dev machine working untouched.
 *
 * Environment, all five needed before the bucket is used:
 *   BLOB_S3_ENDPOINT     https://<account>.r2.cloudflarestorage.com
 *   BLOB_S3_BUCKET       menzu-uploads
 *   BLOB_S3_ACCESS_KEY   …
 *   BLOB_S3_SECRET_KEY   …
 *   BLOB_PUBLIC_BASE     https://cdn.example.com   (no trailing slash)
 *
 * The upload is a plain signed PUT — AWS Signature V4 written out here rather
 * than pulling in the SDK, which is several megabytes to do one request.
 */

interface BucketConfig {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicBase: string;
  region: string;
}

function bucketConfig(): BucketConfig | null {
  const endpoint = process.env.BLOB_S3_ENDPOINT?.trim().replace(/\/$/, "");
  const bucket = process.env.BLOB_S3_BUCKET?.trim();
  const accessKey = process.env.BLOB_S3_ACCESS_KEY?.trim();
  const secretKey = process.env.BLOB_S3_SECRET_KEY?.trim();
  const publicBase = process.env.BLOB_PUBLIC_BASE?.trim().replace(/\/$/, "");
  if (!endpoint || !bucket || !accessKey || !secretKey || !publicBase) return null;
  return {
    endpoint,
    bucket,
    accessKey,
    secretKey,
    publicBase,
    // R2 ignores the region but the signature still has to name one.
    region: process.env.BLOB_S3_REGION?.trim() || "auto",
  };
}

/** True when uploads will survive a deploy. Worth telling the admin. */
export function blobStoreIsRemote(): boolean {
  return bucketConfig() !== null;
}

const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(bytes: Uint8Array | string): Promise<string> {
  const data = typeof bytes === "string" ? enc.encode(bytes) : bytes;
  return hex(await crypto.subtle.digest("SHA-256", data as BufferSource));
}

/**
 * Puts one object in the bucket and returns its public URL.
 *
 * Throws on refusal, because a caller that quietly fell back to disk here
 * would be writing to the filesystem this whole module exists to avoid.
 */
async function putToBucket(
  config: BucketConfig,
  key: string,
  bytes: Uint8Array,
  contentType: string,
  now: Date,
): Promise<string> {
  const url = new URL(`${config.endpoint}/${config.bucket}/${key}`);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const date = stamp.slice(0, 8);
  const payloadHash = await sha256Hex(bytes);

  const headers: Record<string, string> = {
    host: url.host,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": stamp,
  };
  const signedHeaders = Object.keys(headers).sort();
  const canonical = [
    "PUT",
    url.pathname,
    "",
    ...signedHeaders.map((h) => `${h}:${headers[h]}`),
    "",
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${date}/${config.region}/s3/aws4_request`;
  const toSign = [
    "AWS4-HMAC-SHA256",
    stamp,
    scope,
    await sha256Hex(canonical),
  ].join("\n");

  let signing: ArrayBuffer | Uint8Array = enc.encode(`AWS4${config.secretKey}`);
  for (const part of [date, config.region, "s3", "aws4_request"]) {
    signing = await hmac(signing, part);
  }
  const signature = hex(await hmac(signing, toSign));

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      authorization:
        `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, ` +
        `SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`,
    },
    body: bytes as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`Bucket từ chối (${res.status})`);
  }
  return `${config.publicBase}/${key}`;
}

/**
 * Stores one uploaded file and answers with the URL to save on the row.
 *
 * `folder` is the family the file belongs to — "software", "avatars" — and
 * becomes a path segment in both destinations, so the two layouts stay the
 * same and a shop can move from disk to a bucket by copying the folder.
 */
export async function storeUpload(
  folder: string,
  name: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const key = `uploads/${folder}/${name}`;
  const config = bucketConfig();
  if (config) {
    return putToBucket(config, key, bytes, contentType, new Date());
  }

  const dir = join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
  return `/uploads/${folder}/${name}`;
}

/**
 * Deletes a file this module stored, given the URL that was saved on the row.
 *
 * Best-effort by design and never throws: it is called after the row has
 * already been updated, so the library is correct whether or not the storage
 * cooperates, and a failure here must not undo a save that worked.
 *
 * Anything that is not one of ours — a hand-typed address, a picture from
 * before this shop kept its own copies — is left alone.
 */
export async function removeUpload(url: string): Promise<void> {
  const config = bucketConfig();

  if (config && url.startsWith(`${config.publicBase}/uploads/`)) {
    const key = url.slice(config.publicBase.length + 1);
    try {
      await signedDelete(config, key, new Date());
    } catch {
      // Left behind in the bucket. Storage is cheap; a broken save is not.
    }
    return;
  }

  if (url.startsWith("/uploads/")) {
    // Resolved from the segments rather than by joining the URL, so nothing
    // in it can climb out of the uploads folder.
    const parts = url.split("/").filter(Boolean).slice(1);
    if (parts.length < 2 || parts.some((p) => p === "." || p === "..")) return;
    await rm(join(process.cwd(), "public", "uploads", ...parts)).catch(() => {});
  }
}

/** The DELETE half of the signed request above. */
async function signedDelete(
  config: BucketConfig,
  key: string,
  now: Date,
): Promise<void> {
  const url = new URL(`${config.endpoint}/${config.bucket}/${key}`);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const date = stamp.slice(0, 8);
  const payloadHash = await sha256Hex("");

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": stamp,
  };
  const signedHeaders = Object.keys(headers).sort();
  const canonical = [
    "DELETE",
    url.pathname,
    "",
    ...signedHeaders.map((h) => `${h}:${headers[h]}`),
    "",
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${date}/${config.region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, await sha256Hex(canonical)].join("\n");

  let signing: ArrayBuffer | Uint8Array = enc.encode(`AWS4${config.secretKey}`);
  for (const part of [date, config.region, "s3", "aws4_request"]) {
    signing = await hmac(signing, part);
  }
  const signature = hex(await hmac(signing, toSign));

  await fetch(url, {
    method: "DELETE",
    headers: {
      ...headers,
      authorization:
        `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, ` +
        `SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`,
    },
  });
}
