/**
 * Measures whether pages actually fit a phone screen.
 *
 *   node scripts/audit-mobile.mjs [origin]
 *
 * Reading Tailwind breakpoints out of the source says what was intended, not
 * what happens: a single wide child, an unwrapped table or a fixed pixel width
 * pushes the page sideways no matter how many responsive classes surround it.
 * This loads each route at 390x844 — an iPhone-sized viewport — and reports
 * horizontal overflow, which is what a visitor feels as "the layout is broken".
 *
 * Needs the Chrome that scripts/capture-page.mjs leaves running on 9222.
 */
const ORIGIN = process.argv[2] ?? "http://localhost:3100";
const CDP = "http://127.0.0.1:9222";

const WIDTH = 390;
const HEIGHT = 844;

const ROUTES = [
  "/",
  "/categories",
  "/category/account-valorant-tu-chon",
  "/account/MENZU743",
  "/services",
  "/docs",
  "/feedback",
  "/login",
  "/2fa",
  "/checkwc",
  "/bio",
  "/app/download",
  "/cart",
];

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
      }, 60_000);
    });
  }

  close() {
    this.#socket.close();
  }
}

const version = await fetch(`${CDP}/json/version`).catch(() => null);
if (!version?.ok) {
  console.error("Chrome is not listening on 9222 — run scripts/capture-page.mjs first");
  process.exit(1);
}

const cdp = await Cdp.connect((await version.json()).webSocketDebuggerUrl);
const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: 3,
  mobile: true,
}, sessionId);

console.log(`viewport ${WIDTH}x${HEIGHT}\n`);
const problems = [];

for (const route of ROUTES) {
  await cdp.send("Page.navigate", { url: `${ORIGIN}${route}` }, sessionId);
  await sleep(2500);

  const { result } = await cdp.send(
    "Runtime.evaluate",
    {
      // scrollWidth beyond clientWidth is the page pushing sideways. The
      // widest offending element is reported because that is what to fix.
      expression: `(() => {
        const doc = document.documentElement;
        const overflow = doc.scrollWidth - doc.clientWidth;
        let worst = null;
        if (overflow > 0) {
          for (const el of document.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.width > doc.clientWidth + 1) {
              if (!worst || r.width > worst.width) {
                worst = {
                  width: Math.round(r.width),
                  tag: el.tagName.toLowerCase(),
                  cls: (el.className || '').toString().slice(0, 70)
                };
              }
            }
          }
        }
        const tiny = [...document.querySelectorAll('button, a')].filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.height < 32;
        }).length;
        return JSON.stringify({ overflow, worst, tiny, title: document.title });
      })()`,
      returnByValue: true,
    },
    sessionId,
  );

  const data = JSON.parse(result.value);
  const flag = data.overflow > 0 ? "OVERFLOW" : "ok      ";
  console.log(
    `${flag} ${route.padEnd(38)} ${data.overflow > 0 ? `+${data.overflow}px` : ""}` +
      `${data.tiny > 0 ? `  (${data.tiny} tap target < 32px)` : ""}`,
  );
  if (data.worst) {
    console.log(`         widest: <${data.worst.tag}> ${data.worst.width}px  ${data.worst.cls}`);
    problems.push(route);
  }
}

await cdp.send("Target.closeTarget", { targetId });
cdp.close();

console.log(
  problems.length === 0
    ? "\nNo horizontal overflow on any route."
    : `\n${problems.length} route(s) overflow: ${problems.join(", ")}`,
);
