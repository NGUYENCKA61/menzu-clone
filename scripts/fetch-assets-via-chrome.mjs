/**
 * Downloads assets through the Chrome instance that scripts/capture-page.mjs
 * leaves running.
 *
 * Cloudflare 403s plain HTTP clients, so `curl` and fetch() cannot pull these
 * files even though the pages referencing them load fine in a browser. Chrome
 * already holds the clearance cookie, so the download is routed through it.
 *
 *   node scripts/fetch-assets-via-chrome.mjs <urls-file> <output-dir>
 *
 * The urls file is one URL per line; blank lines and #comments are skipped.
 * Each file lands under <output-dir> keeping its basename. Assets that already
 * exist are skipped, so the script is safe to re-run.
 *
 * Navigating to each URL and reading it back via Page.getResourceContent
 * sidesteps CORS: image.menzu.lol is a different origin from menzu.lol, so a
 * fetch() issued from the page would come back opaque and unreadable.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const ORIGIN = "http://127.0.0.1:9222";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  #socket;
  #nextId = 1;
  #pending = new Map();

  static async connect(url) {
    const client = new Cdp();
    client.#socket = new WebSocket(url);
    await new Promise((ok, fail) => {
      client.#socket.addEventListener("open", ok, { once: true });
      client.#socket.addEventListener("error", () => fail(new Error("CDP connect failed")), {
        once: true,
      });
    });
    client.#socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const slot = client.#pending.get(message.id);
      if (!slot) return;
      client.#pending.delete(message.id);
      if (message.error) slot.reject(new Error(message.error.message));
      else slot.resolve(message.result);
    });
    return client;
  }

  send(method, params = {}, sessionId) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => {
        if (this.#pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 45_000);
    });
  }

  close() {
    this.#socket.close();
  }
}

async function main() {
  const [urlsFile, outDir] = process.argv.slice(2);
  if (!urlsFile || !outDir) {
    console.error("usage: node scripts/fetch-assets-via-chrome.mjs <urls-file> <output-dir>");
    process.exit(1);
  }

  const urls = (await readFile(urlsFile, "utf8"))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  await mkdir(outDir, { recursive: true });

  const version = await fetch(`${ORIGIN}/json/version`).catch(() => null);
  if (!version?.ok) {
    console.error("Chrome is not listening on 9222 — run scripts/capture-page.mjs first");
    process.exit(1);
  }

  const cdp = await Cdp.connect((await version.json()).webSocketDebuggerUrl);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);

  let saved = 0;
  const failures = [];

  for (const url of urls) {
    const target = join(outDir, basename(new URL(url).pathname));
    if (existsSync(target)) {
      console.log(`skip  ${basename(target)}`);
      continue;
    }

    try {
      await cdp.send("Page.navigate", { url }, sessionId);
      await sleep(1200);

      const { frameTree } = await cdp.send("Page.getResourceTree", {}, sessionId);
      const { content, base64Encoded } = await cdp.send(
        "Page.getResourceContent",
        { frameId: frameTree.frame.id, url },
        sessionId,
      );

      const bytes = base64Encoded ? Buffer.from(content, "base64") : Buffer.from(content, "utf8");
      await writeFile(target, bytes);
      saved += 1;
      console.log(`ok    ${basename(target)}  ${(bytes.length / 1024).toFixed(0)} KB`);
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
      console.log(`FAIL  ${basename(target)}`);
    }
  }

  await cdp.send("Target.closeTarget", { targetId });
  cdp.close();

  console.log(`\n${saved} saved, ${failures.length} failed`);
  for (const failure of failures) console.log(`  ${failure}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
