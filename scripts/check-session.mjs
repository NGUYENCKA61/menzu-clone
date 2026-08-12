/**
 * Reports whether the capture browser holds a menzu.lol login.
 *
 *   node scripts/check-session.mjs
 *
 * Auth-gated captures fail by redirecting to /login, which looks identical to
 * "the page does not exist" in a capture. This says plainly which it is.
 * Cookie names and expiry are printed; values never are.
 */
const ORIGIN = "http://127.0.0.1:9222";

class Cdp {
  #socket;
  #nextId = 1;
  #pending = new Map();

  static async connect(url) {
    const client = new Cdp();
    client.#socket = new WebSocket(url);
    await new Promise((ok, fail) => {
      client.#socket.addEventListener("open", ok, { once: true });
      client.#socket.addEventListener("error", () => fail(new Error("connect failed")), {
        once: true,
      });
    });
    client.#socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const slot = client.#pending.get(message.id);
      if (!slot) return;
      client.#pending.delete(message.id);
      if (message.error) slot.reject(new Error(message.error.message));
      else slot.resolve(message.result);
    });
    return client;
  }

  send(method, params = {}) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.#pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 30_000);
    });
  }

  close() {
    this.#socket.close();
  }
}

const version = await fetch(`${ORIGIN}/json/version`).catch(() => null);
if (!version?.ok) {
  console.log("Chrome is not listening on 9222 — run scripts/capture-page.mjs first");
  process.exit(1);
}

const cdp = await Cdp.connect((await version.json()).webSocketDebuggerUrl);
const { cookies } = await cdp.send("Storage.getCookies");
cdp.close();

const site = cookies.filter((cookie) => cookie.domain.includes("menzu.lol"));

console.log(`cookies for menzu.lol: ${site.length}`);
for (const cookie of site) {
  const expiry =
    cookie.expires > 0 ? new Date(cookie.expires * 1000).toISOString().slice(0, 10) : "session";
  console.log(`  ${cookie.name}  (${cookie.domain}, expires ${expiry})`);
}

// A signed-in visitor carries a token cookie; Cloudflare's clearance cookie
// alone only proves the browser got past the bot check.
const authish = site.filter((cookie) => /session|token|auth|sid|jwt|next-auth/i.test(cookie.name));
console.log(
  authish.length > 0
    ? `\nLooks signed in — ${authish.map((c) => c.name).join(", ")}`
    : "\nNo session cookie: this browser is NOT signed in to menzu.lol",
);
