// Asset downloader for menzu.lol (site-key menzu-lol-f7ae197a, page-key root-8a5edab2)
// Usage: node scripts/download-assets-menzu-lol-f7ae197a-root-8a5edab2.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const OUT = "public/sites/menzu-lol-f7ae197a/root-8a5edab2/images";

const P = {
  A: "https://image.menzu.lol/",
  B: "https://media.valorant-api.com/",
  C: "https://menzu.lol/",
  D: "https://mir-s3-cdn-cf.behance.net/",
};

// prefix|path  (X| means absolute URL)
const ENCODED = [
  "C|logos/menzu-logo.png",
  "D|project_modules/max_3840_webp/e4307d166239615.6418bdb0084a4.png",
  "A|upload/bannermung9-7-26.png",
  "A|upload/subbanner1.png",
  "A|upload/subbanner2.png",
  "A|upload/subbanner3.png",
  "A|upload/subbanner4.png",
  "D|project_modules/1400_webp/f945cb242281183.696998e170840.png",
  "A|account/MENZU725.png",
  "A|account/MENZU727.png",
  "A|account/MENZU732.png",
  "A|account/MENZU733.png",
  "A|account/MENZU736.png",
  "A|account/MENZU737.png",
  "A|account/MENZU742.png",
  "A|account/MENZU743.png",
  "A|account/MENZU744.png",
  "A|account/VLR2028.png",
  "A|account/VLR2116.png",
  "A|account/VLR2117.png",
  "A|account/VLR2121.png",
  "A|account/VLR2124.png",
  "A|account/VLR2127.png",
  "A|account/VLR2133.png",
  "A|account/VLR2134.png",
  "A|account/VLR2135.png",
  "A|account/VLR2136.png",
  "A|account/VLR2137.png",
  "A|account/TFT/pettim.png",
  "B|contenttiers/0cebb8be-46d7-c12a-d306-e9907bfc5a25/displayicon.png",
  "B|contenttiers/12683d76-48d7-84a3-4e09-6985794f0445/displayicon.png",
  "B|contenttiers/411e4a55-4e59-7757-41f0-86a53f101bb5/displayicon.png",
  "B|contenttiers/60bca009-4182-7998-dee7-b8a2558dc369/displayicon.png",
  "B|contenttiers/e046854e-406c-37f4-6607-19a9ba8426fc/displayicon.png",
  "C|images/backcard.png",
  "C|images/valorant-hero.png",
  "C|images/acb.png",
  "C|images/momo.png",
  "C|images/zalopay.png",
  "C|images/vnpay.png",
  "C|images/paypal.png",
  "C|images/crypto.png",
  "C|images/zalo-logo.png",
  "A|upload/clove.png",
  "A|upload/omen.png",
  "A|upload/jett.png",
  "A|upload/neon.png",
  "A|upload/acctuchon.gif",
  "A|upload/0-5.png",
  "A|upload/prerankthumb.png",
  "A|upload/rdlv20.png",
  "A|upload/nfarank.png",
  "A|upload/petim.png",
  "A|upload/SANTFTTUCHON.png",
  "A|upload/tfttuchon.png",
  "A|upload/packvn.png",
  "A|upload/phthumb.png",
  "A|upload/mokhoafb.png",
  "A|feedback/avatar/fb-avatar-3c833108-c1b0-4492-8a30-78a3db774db5.webp",
  "A|feedback/avatar/fb-avatar-57655c36-1580-45c7-a1af-e8d5e65d3c7d.webp",
  "A|feedback/avatar/fb-avatar-5a6a7b1c-bb9f-4d15-b22c-6e1537d86b83.webp",
  "A|feedback/avatar/fb-avatar-d8dfdbc4-4045-4ff7-ac86-f4d450a99ffb.webp",
  "A|feedback/avatar/fb-avatar-2d4a2ff1-693f-4a6a-b222-57f910f9866c.webp",
  "B|agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png",
  "B|agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png",
  "B|agents/5f8d3a7f-467b-97f3-062c-13acf203c006/displayicon.png",
  "B|agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png",
  "B|agents/b444168c-4e35-8076-db47-ef9bf368f384/displayicon.png",
  "B|agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png",
  "B|agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png",
  "B|agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png",
  "B|agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png",
  "B|agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png",
  "B|agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png",
  "B|agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/displayicon.png",
  "B|agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png",
  "B|agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png",
  "B|agents/efba5359-4016-a1e5-7626-b1ae76895940/displayicon.png",
  "B|agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png",
  "B|agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png",
  "B|agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/displayicon.png",
  "B|agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/displayicon.png",
  "B|agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/displayicon.png",
  "B|agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png",
  "B|agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png",
  "B|agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png",
  "B|agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png",
  "B|agents/df1cb487-4902-002e-5c17-d28e83e78588/displayicon.png",
  "B|agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png",
  "B|agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png",
  "B|agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png",
  "B|agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png",
  "X|https://www.riotgames.com/darkroom/1440/4d54f9d2c0df5275758d74680ab0e5a4:d075bc9649849206d4acdd2af59175b2/riotpr-mar2023-social-twitch-1920x1080-03-17-2023.png",
  "X|https://cdn.prod.website-files.com/62e2675c8188063ac9d975d0/66daca61a92f146aa75284f7_66daca5bce3c8eca87e46731_vi-tra-sau-va-the-tin-dung.webp",
  "X|https://cdn.tgdd.vn/Files/2023/04/11/1524298/2-110423-103232-800-resize.jpg",
  "X|https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/0c67438c8b3a418b5ca28f9f234506745493ae42-854x484.png?accountingTag=VAL",
];

/** Turn an encoded entry into { url, dest } */
function resolve(entry) {
  const sep = entry.indexOf("|");
  const tag = entry.slice(0, sep);
  const rest = entry.slice(sep + 1);
  const url = tag === "X" ? rest : P[tag] + rest;

  let rel;
  if (tag === "A") rel = rest;
  else if (tag === "B") {
    // agents/<uuid>/displayicon.png -> agents/<uuid>.png
    const m = rest.match(/^(agents|contenttiers)\/([^/]+)\/displayicon\.png$/);
    rel = m ? `valorant-api/${m[1]}/${m[2]}.png` : `valorant-api/${rest}`;
  } else if (tag === "C") rel = `site/${rest}`;
  else if (tag === "D") rel = `behance/${rest.split("/").pop()}`;
  else {
    const u = new URL(url);
    rel = `external/${u.hostname.replace(/\./g, "-")}/${u.pathname.split("/").pop() || "index"}`;
  }

  rel = rel.split("?")[0].replace(/[^a-zA-Z0-9._/-]/g, "_");
  return { url, dest: join(OUT, rel) };
}

const TASKS = ENCODED.map(resolve);

async function fetchOne({ url, dest }) {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
        referer: "https://menzu.lol/",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return { url, ok: false, reason: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return { url, ok: false, reason: "empty" };
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    return { url, ok: true, dest, bytes: buf.length };
  } catch (err) {
    return { url, ok: false, reason: err.message };
  }
}

const results = [];
const BATCH = 4;
for (let i = 0; i < TASKS.length; i += BATCH) {
  const batch = TASKS.slice(i, i + BATCH);
  results.push(...(await Promise.all(batch.map(fetchOne))));
  process.stdout.write(`\r${Math.min(i + BATCH, TASKS.length)}/${TASKS.length}`);
}
process.stdout.write("\n");

const ok = results.filter((r) => r.ok);
const bad = results.filter((r) => !r.ok);
const bytes = ok.reduce((a, r) => a + r.bytes, 0);
console.log(`OK ${ok.length}/${results.length}  (${(bytes / 1048576).toFixed(2)} MB)`);
if (bad.length) {
  console.log("FAILED:");
  for (const b of bad) console.log(`  ${b.reason}  ${b.url}`);
}
