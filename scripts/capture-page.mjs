/**
 * Captures a rendered page from a real Chrome instance over the DevTools
 * Protocol.
 *
 * menzu.lol sits behind Cloudflare and returns 403 to anything that is not a
 * genuine browser, so `curl` and plain fetch cannot capture it. The site also
 * renders client-side, which rules out view-source even when a request does
 * get through: only the hydrated DOM has the real content.
 *
 *   node scripts/capture-page.mjs <url> <output.html>
 *
 * Chrome is launched once on port 9222 with a dedicated profile under
 * .chrome-capture/ and left running, so later captures reuse it — and so a
 * sign-in done once in that window persists across captures.
 *
 * Node 26 ships a global WebSocket, so this needs no dependencies.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PORT = 9222;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const PROFILE_DIR = resolve(".chrome-capture");

const CHROME_PATHS = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env["ProgramFiles(x86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function debuggerReady() {
  try {
    const response = await fetch(`${ORIGIN}/json/version`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureChrome() {
  if (await debuggerReady()) return "reused";

  const binary = CHROME_PATHS.find((p) => p && existsSync(p));
  if (!binary) throw new Error("Chrome not found in any standard location");

  await mkdir(PROFILE_DIR, { recursive: true });

  // Detached and with stdio ignored so Chrome outlives this process — the
  // whole point is to keep one warm, signed-in browser across captures.
  spawn(
    binary,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1440,900",
    ],
    { detached: true, stdio: "ignore" },
  ).unref();

  for (let i = 0; i < 40; i += 1) {
    await sleep(500);
    if (await debuggerReady()) return "launched";
  }
  throw new Error("Chrome started but never opened the debugging port");
}

/** Minimal CDP client over one WebSocket, with flattened session routing. */
class Cdp {
  #socket;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Map();

  static async connect(url) {
    const client = new Cdp();
    client.#socket = new WebSocket(url);
    await new Promise((ok, fail) => {
      client.#socket.addEventListener("open", ok, { once: true });
      client.#socket.addEventListener("error", () => fail(new Error("CDP connect failed")), {
        once: true,
      });
    });
    client.#socket.addEventListener("message", (event) => client.#receive(event.data));
    return client;
  }

  #receive(raw) {
    const message = JSON.parse(raw);
    if (message.id) {
      const slot = this.#pending.get(message.id);
      if (!slot) return;
      this.#pending.delete(message.id);
      if (message.error) slot.reject(new Error(message.error.message));
      else slot.resolve(message.result);
      return;
    }
    for (const handler of this.#listeners.get(message.method) ?? []) handler(message.params);
  }

  on(method, handler) {
    if (!this.#listeners.has(method)) this.#listeners.set(method, []);
    this.#listeners.get(method).push(handler);
  }

  send(method, params = {}, sessionId) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => {
        if (this.#pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 60_000);
    });
  }

  close() {
    this.#socket.close();
  }
}

async function capture(url, outputPath) {
  const state = await ensureChrome();
  console.log(`chrome: ${state}`);

  const { webSocketDebuggerUrl } = await (await fetch(`${ORIGIN}/json/version`)).json();
  const cdp = await Cdp.connect(webSocketDebuggerUrl);

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);

  // Record the API traffic too: per-skin inventory art is fetched at runtime
  // and never appears in the HTML, so the document alone is not enough.
  const apiCalls = [];
  cdp.on("Network.responseReceived", (params) => {
    const { url: responseUrl, status, mimeType } = params.response;
    if (mimeType.includes("json")) apiCalls.push({ url: responseUrl, status });
  });

  const loaded = new Promise((ok) => cdp.on("Page.loadEventFired", ok));
  await cdp.send("Page.navigate", { url }, sessionId);
  await Promise.race([loaded, sleep(30_000)]);

  // Client-side rendering and any Cloudflare interstitial both need a beat
  // after load before the real DOM exists.
  await sleep(4000);

  const { result } = await cdp.send(
    "Runtime.evaluate",
    {
      expression: `JSON.stringify({
        html: document.documentElement.outerHTML,
        title: document.title,
        url: location.href,
        textLength: document.body ? document.body.innerText.length : 0
      })`,
      returnByValue: true,
    },
    sessionId,
  );

  const page = JSON.parse(result.value);
  await writeFile(outputPath, page.html, "utf8");
  await cdp.send("Target.closeTarget", { targetId });
  cdp.close();

  console.log(`title:  ${page.title}`);
  console.log(`landed: ${page.url}`);
  console.log(`text:   ${page.textLength} chars`);
  console.log(`html:   ${(page.html.length / 1024).toFixed(0)} KB -> ${outputPath}`);
  if (apiCalls.length) {
    console.log(`json responses (${apiCalls.length}):`);
    for (const call of apiCalls.slice(0, 15)) console.log(`  ${call.status} ${call.url}`);
  }
}

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/capture-page.mjs <url> <output.html>");
  process.exit(1);
}

capture(url, out).catch((error) => {
  console.error(`failed: ${error.message}`);
  process.exit(1);
});
