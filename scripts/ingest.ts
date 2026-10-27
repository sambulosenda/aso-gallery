// Captures App Store creative for every tracked app and folds it into
// data/catalog.json, recording a new version whenever artwork changes.
//
//   npm run ingest                 # all apps in data/tracked.json
//   npm run ingest -- --app 571800810 --country us
//   npm run ingest -- --dry-run    # print what changed without writing
//
// Run it once a day (see .github/workflows/ingest.yml) to build history.
import fs from "node:fs";
import path from "node:path";
import { findHeaderArtwork, lookup, productPageHtml, type LookupResult } from "../lib/appstore";
import { loadCatalog, saveCatalog, type Catalog } from "../lib/catalog";
import { analyze } from "../lib/image";
import type { App } from "../lib/types";
import { applyCapture, type CapturedImage } from "../lib/versioning";

type Tracked = { id: string; country: string };

const MAX_SCREENSHOTS = 10;

function args() {
  const argv = process.argv.slice(2);
  const get = (flag: string) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  return { app: get("--app"), country: get("--country") ?? "us", dryRun: argv.includes("--dry-run") };
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

async function analyzeAll(urls: string[]): Promise<CapturedImage[]> {
  // A few at a time keeps us polite to the CDN.
  const out: CapturedImage[] = [];
  for (let i = 0; i < urls.length; i += 4) {
    const batch = await Promise.all(urls.slice(i, i + 4).map(async (url) => ({ url, ...(await analyze(url)) })));
    out.push(...batch);
  }
  return out;
}

function toApp(r: LookupResult, existing: App | undefined, colors: CapturedImage["colors"]): App {
  return {
    id: existing?.id ?? `${r.trackId}-${slug(r.trackName)}`,
    store: "app_store",
    storeId: String(r.trackId),
    name: r.trackName,
    developer: r.artistName,
    genre: r.primaryGenreName,
    isGame: r.genres.includes("Games"),
    storeUrl: r.trackViewUrl.split("?")[0],
    iconColor: colors[0]?.hex ?? "#444444",
    iconUrl: r.artworkUrl512 ?? r.artworkUrl100,
  };
}

async function ingestOne(catalog: Catalog, t: Tracked, today: string): Promise<string[]> {
  const result = await lookup(t.id, t.country);
  if (!result) return [`${t.id}: not found in ${t.country} storefront`];

  const existing = catalog.apps.find((a) => a.storeId === t.id);
  const icon = result.artworkUrl512 ? await analyze(result.artworkUrl512).catch(() => null) : null;
  const app = toApp(result, existing, icon?.colors ?? []);
  catalog.apps = [...catalog.apps.filter((a) => a.storeId !== t.id), app];

  const log: string[] = [];
  const record = (kind: Parameters<typeof applyCapture>[1]["kind"], images: CapturedImage[]) => {
    const next = applyCapture(catalog.assets, { appId: app.id, kind, storefront: t.country, images }, today);
    catalog.assets = next.assets;
    if (next.changed) log.push(`${app.name}: new ${kind} version (${images.length} image${images.length === 1 ? "" : "s"})`);
  };

  const shots = await analyzeAll(result.screenshotUrls.slice(0, MAX_SCREENSHOTS));
  record("screenshot", shots);

  // The search result card shows the first three portrait screenshots, or one landscape one.
  const cardShots = shots[0] && shots[0].width > shots[0].height ? shots.slice(0, 1) : shots.slice(0, 3);
  if (cardShots.length) {
    record("search_banner", [{ ...cardShots[0], urls: cardShots.map((s) => s.url), hash: cardShots.map((s) => s.hash).join("") }]);
  }

  try {
    const header = findHeaderArtwork(await productPageHtml(t.id, t.country));
    // Keep the source size from the page; we only download a 1920px rendition.
    const images = header ? (await analyzeAll([header.url])).map((img) => ({ ...img, width: header.width, height: header.height })) : [];
    if (!header) log.push(`${app.name}: no product page header found`);
    record("product_header", images);
  } catch (e) {
    // Don't close the live header just because the page failed to load.
    log.push(`${app.name}: product page skipped (${(e as Error).message})`);
  }
  return log;
}

async function main() {
  const { app, country, dryRun } = args();
  const trackedFile = path.join(process.cwd(), "data", "tracked.json");
  const tracked: Tracked[] = app ? [{ id: app, country }] : JSON.parse(fs.readFileSync(trackedFile, "utf8")).apps;
  const catalog: Catalog = loadCatalog() ?? { updatedAt: "", apps: [], assets: [] };
  const today = new Date().toISOString().slice(0, 10);

  let failures = 0;
  for (const t of tracked) {
    try {
      const log = await ingestOne(catalog, t, today);
      console.log(log.length ? log.join("\n") : `${t.id}: no change`);
    } catch (e) {
      failures++;
      console.error(`${t.id}: failed (${(e as Error).message})`);
    }
  }

  catalog.updatedAt = new Date().toISOString();
  if (!dryRun) saveCatalog(catalog);
  console.log(`\n${tracked.length - failures}/${tracked.length} apps captured${dryRun ? " (dry run, nothing written)" : ""}.`);
  if (failures === tracked.length) process.exit(1);
}

main();
