import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * At or under this video bitrate the file is already lean and a re-encode
 * would only trade quality for nothing; it gets remuxed instead — audio
 * stripped, moov atom moved up front — which is lossless and near-instant.
 */
const LEAN_BPS = 5_000_000;

/**
 * The encoder holds the upload request open while it works, so it gets a
 * hard stop: past this, better to store the original than to hang the admin.
 */
const ENCODE_TIMEOUT_MS = 8 * 60_000;

export type HeroVideoMode = "encoded" | "remuxed" | "stored";

export interface PreparedHeroVideo {
  fileName: string;
  mode: HeroVideoMode;
  outBytes: number;
}

interface ProbeInfo {
  videoCodec: string | null;
  bps: number | null;
}

/** What ffprobe can tell about the file; null when it cannot run or parse. */
async function probeVideo(path: string): Promise<ProbeInfo | null> {
  try {
    const { stdout } = await run(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=bit_rate:stream=codec_type,codec_name,bit_rate",
        "-of",
        "json",
        path,
      ],
      { timeout: 30_000 },
    );
    const data = JSON.parse(stdout) as {
      format?: { bit_rate?: string };
      streams?: Array<{ codec_type?: string; codec_name?: string; bit_rate?: string }>;
    };
    const video = data.streams?.find((stream) => stream.codec_type === "video");
    // Some containers report no per-stream rate; the whole-file rate is close
    // enough for a lean-or-not call.
    const bps = Number(video?.bit_rate) || Number(data.format?.bit_rate) || null;
    return { videoCodec: video?.codec_name ?? null, bps };
  } catch {
    return null;
  }
}

/**
 * Turns whatever the admin uploaded into the video the visitors should get.
 *
 * Three outcomes, in order of preference:
 * - "encoded"  — heavy input, re-encoded to H.264 CRF 28, audio stripped
 *   (the hero always plays muted), capped at 1920 wide, faststart so playback
 *   begins before the download finishes;
 * - "remuxed"  — input already lean H.264, kept bit-for-bit, just cleaned up
 *   the same way, losslessly;
 * - "stored"   — ffmpeg unavailable, failed, or made the file bigger: the
 *   original bytes are saved unchanged, because an upload that succeeds
 *   uncompressed beats one that fails.
 *
 * Callers validate the bytes first — this function trusts them.
 */
export async function prepareHeroVideo(
  bytes: Uint8Array,
  extension: string,
  outDir: string,
): Promise<PreparedHeroVideo> {
  await mkdir(outDir, { recursive: true });
  const stem = randomBytes(12).toString("hex");
  // The input goes to the OS temp dir, never under /public: a half-written
  // upload must not be reachable by URL, even briefly.
  const inPath = join(tmpdir(), `hero-in-${stem}${extension}`);
  await writeFile(inPath, bytes);

  try {
    // webm always re-encodes: copying VP9 into mp4 is legal but Safari
    // will not play it, and the mp4 container is the one every browser takes.
    const info = extension === ".mp4" ? await probeVideo(inPath) : null;
    const lean =
      info !== null &&
      info.videoCodec === "h264" &&
      info.bps !== null &&
      info.bps <= LEAN_BPS;

    const fileName = `${stem}.mp4`;
    const outPath = join(outDir, fileName);
    const args = lean
      ? ["-y", "-v", "error", "-i", inPath, "-an", "-c:v", "copy", "-movflags", "+faststart", outPath]
      : [
          "-y",
          "-v",
          "error",
          "-i",
          inPath,
          "-an",
          "-c:v",
          "libx264",
          "-crf",
          "28",
          "-preset",
          "medium",
          "-pix_fmt",
          "yuv420p",
          "-vf",
          // \, keeps the comma inside min() from splitting the filtergraph.
          "scale=min(1920\\,iw):-2",
          "-movflags",
          "+faststart",
          outPath,
        ];

    try {
      await run("ffmpeg", args, {
        timeout: ENCODE_TIMEOUT_MS,
        killSignal: "SIGKILL",
        maxBuffer: 8 * 1024 * 1024,
      });
      const outBytes = (await stat(outPath)).size;
      if (outBytes > 0 && (lean || outBytes < bytes.byteLength)) {
        return { fileName, mode: lean ? "remuxed" : "encoded", outBytes };
      }
      // Empty output, or an "encode" that came out bigger than what went in.
      await rm(outPath, { force: true });
    } catch (error) {
      console.error("[hero-video] ffmpeg failed, storing the original:", error);
      await rm(outPath, { force: true }).catch(() => {});
    }

    const rawName = `${stem}${extension}`;
    await writeFile(join(outDir, rawName), bytes);
    return { fileName: rawName, mode: "stored", outBytes: bytes.byteLength };
  } finally {
    await rm(inPath, { force: true }).catch(() => {});
  }
}
