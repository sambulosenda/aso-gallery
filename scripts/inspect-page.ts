// Shows what an App Store product page says about its header ("uber") artwork.
//   npm run inspect -- 571800810 [country]
//   npm run inspect -- --all          # every app in data/tracked.json
import fs from "node:fs";
import { findHeaderArtwork, productPageHtml } from "../lib/appstore";

async function inspect(id: string, country: string) {
  const html = await productPageHtml(id, country);
  const text = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
  const i = text.indexOf('"uber"');
  const uber = i < 0 ? "(no uber key)" : text.slice(i, i + 400).replace(/\s+/g, " ");
  console.log(`${id}/${country}: header → ${JSON.stringify(findHeaderArtwork(html))}\n  ${uber}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const targets: { id: string; country: string }[] = argv[0] === "--all"
    ? JSON.parse(fs.readFileSync("data/tracked.json", "utf8")).apps
    : [{ id: argv[0], country: argv[1] ?? "us" }];
  for (const t of targets) await inspect(t.id, t.country).catch((e) => console.log(`${t.id}: ${(e as Error).message}`));
}

main();
