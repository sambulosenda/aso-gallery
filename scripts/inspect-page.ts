// Shows what an App Store product page says about its header ("uber") artwork,
// or what a Google Play page's embedded data holds.
//   npm run inspect -- 571800810 [country]
//   npm run inspect -- com.calm.android [country]
//   npm run inspect -- --all          # every app in data/tracked.json
import fs from "node:fs";
import { findHeaderArtwork, productPageHtml } from "../lib/appstore";
import { callbackData, imagePaths, parsePlayPage, playPageHtml } from "../lib/googleplay";

async function inspectPlay(pkg: string, country: string) {
  const html = await playPageHtml(pkg, country);
  if (!html) return console.log(`${pkg}/${country}: not listed`);
  try {
    const l = parsePlayPage(html, pkg);
    console.log(`${pkg}/${country}: ${l.name} · ${l.developer} · ${l.genre}${l.isGame ? " (game)" : ""}`);
    console.log(`  icon ${l.iconUrl}\n  feature graphic ${JSON.stringify(l.featureGraphic)}\n  ${l.screenshots.length} screenshots, first ${JSON.stringify(l.screenshots[0])}`);
  } catch (e) {
    console.log(`${pkg}/${country}: parse failed (${(e as Error).message})`);
  }
  // Where the images sit, in case the layout moves.
  for (const { path, image } of imagePaths(callbackData(html, "ds:5")).slice(0, 30)) {
    console.log(`  [${path.join("][")}] ${image.width}x${image.height}`);
  }
}

async function inspect(id: string, country: string) {
  if (!/^\d+$/.test(id)) return inspectPlay(id, country);
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
