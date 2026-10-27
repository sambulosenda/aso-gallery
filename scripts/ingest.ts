// Captures App Store and Google Play creative for every tracked app and folds
// it into data/catalog.json, recording a new version whenever artwork changes.
//
//   npm run ingest                 # all apps in data/tracked.json
//   npm run ingest -- --app 571800810 --country us
//   npm run ingest -- --app com.calm.android   # package names are Google Play
//   npm run ingest -- --dry-run    # print what changed without writing
//   npm run ingest -- --sample 40  # 40 apps spread across the tracked list
//   npm run ingest -- --store google_play   # only one store's apps
//
// Run it once a day (see .github/workflows/ingest.yml) to build history.
import fs from "node:fs";
import path from "node:path";
import { findHeaderArtwork, lookup, productPageHtml, type LookupResult } from "../lib/appstore";
import { loadCatalog, saveCatalog, type Catalog } from "../lib/catalog";
import { parsePlayPage, playPageHtml, sized, type PlayListing } from "../lib/googleplay";
import { analyze } from "../lib/image";
import type { App, Store } from "../lib/types";
import { applyCapture, type CapturedImage } from "../lib/versioning";

type Tracked = { id: string; country: string; store?: Store };

const MAX_SCREENSHOTS = 10;
const CONCURRENCY = 4;

function args() {
  const argv = process.argv.slice(2);
  const get = (flag: string) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  return {
    app: get("--app"),
    country: get("--country") ?? "us",
    dryRun: argv.includes("--dry-run"),
    sample: Number(get("--sample")) || 0,
    store: get("--store") as Store | undefined,
  };
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

function playApp(l: PlayListing, existing: App | undefined, colors: CapturedImage["colors"]): App {
  return {
    id: existing?.id ?? `gp-${l.packageName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    store: "google_play",
    storeId: l.packageName,
    name: l.name,
    developer: l.developer,
    genre: l.genre,
    isGame: l.isGame,
    storeUrl: l.storeUrl,
    iconColor: colors[0]?.hex ?? "#444444",
    iconUrl: l.iconUrl ? sized(l.iconUrl, 512) : undefined,
  };
}

// Replaces the app record and returns a function that folds one capture into the catalog.
function begin(catalog: Catalog, app: App, storefront: string, today: string, log: string[]) {
  catalog.apps = [...catalog.apps.filter((a) => !(a.store === app.store && a.storeId === app.storeId)), app];
  return (kind: Parameters<typeof applyCapture>[1]["kind"], images: CapturedImage[]) => {
    const next = applyCapture(catalog.assets, { appId: app.id, kind, storefront, images }, today);
    catalog.assets = next.assets;
    if (next.changed) log.push(`${app.name}: new ${kind} version (${images.length} image${images.length === 1 ? "" : "s"})`);
  };
}

const findApp = (catalog: Catalog, store: Store, storeId: string) => catalog.apps.find((a) => a.store === store && a.storeId === storeId);

// Google Play: screenshots and the feature graphic (Play's header artwork, 1024×500).
// Play's search results don't show a screenshot card, so there's no search banner.
async function ingestPlay(catalog: Catalog, t: Tracked, today: string): Promise<string[]> {
  const html = await playPageHtml(t.id, t.country);
  if (!html) return [`${t.id}: not listed on Google Play in ${t.country}`];
  const listing = parsePlayPage(html, t.id);

  const icon = listing.iconUrl ? await analyze(sized(listing.iconUrl, 128)).catch(() => null) : null;
  const app = playApp(listing, findApp(catalog, "google_play", t.id), icon?.colors ?? []);
  const log: string[] = [];
  const record = begin(catalog, app, t.country, today, log);

  // Keep the source size from the page; we only download a bounded rendition.
  const withSourceSize = (imgs: CapturedImage[], src: { width: number; height: number }[]) =>
    imgs.map((img, i) => (src[i]?.width ? { ...img, width: src[i].width, height: src[i].height } : img));

  const shots = listing.screenshots.slice(0, MAX_SCREENSHOTS);
  if (!shots.length) log.push(`${app.name}: no screenshots found`);
  record("screenshot", withSourceSize(await analyzeAll(shots.map((s) => sized(s.url, 1280))), shots));

  const fg = listing.featureGraphic;
  if (!fg) log.push(`${app.name}: no feature graphic found`);
  record("product_header", fg ? withSourceSize(await analyzeAll([sized(fg.url, 1024)]), [fg]) : []);
  return log;
}

async function ingestOne(catalog: Catalog, t: Tracked, today: string): Promise<string[]> {
  if (t.store === "google_play") return ingestPlay(catalog, t, today);
  const result = await lookup(t.id, t.country);
  if (!result) return [`${t.id}: not found in ${t.country} storefront`];

  const icon = result.artworkUrl512 ? await analyze(result.artworkUrl512).catch(() => null) : null;
  const app = toApp(result, findApp(catalog, "app_store", t.id), icon?.colors ?? []);
  const log: string[] = [];
  const record = begin(catalog, app, t.country, today, log);

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
  const { app, country, dryRun, sample, store } = args();
  const trackedFile = path.join(process.cwd(), "data", "tracked.json");
  // App Store ids are numeric; anything else is a Google Play package name.
  const all: Tracked[] = app ? [{ id: app, country, store: /^\d+$/.test(app) ? "app_store" : "google_play" }] : (JSON.parse(fs.readFileSync(trackedFile, "utf8")).apps as Tracked[]).filter((t) => !store || (t.store ?? "app_store") === store);
  const step = sample && all.length > sample ? all.length / sample : 1;
  const tracked = step > 1 ? Array.from({ length: sample }, (_, i) => all[Math.floor(i * step)]) : all;
  const catalog: Catalog = loadCatalog() ?? { updatedAt: "", apps: [], assets: [] };
  const today = new Date().toISOString().slice(0, 10);

  // A few apps at a time. Safe because ingestOne only touches the catalog
  // synchronously, after its awaits.
  let failures = 0;
  const queue = [...tracked];
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      try {
        const log = await ingestOne(catalog, t, today);
        console.log(log.length ? log.join("\n") : `${t.id}: no change`);
      } catch (e) {
        failures++;
        console.error(`${t.id}: failed (${(e as Error).message})`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  catalog.updatedAt = new Date().toISOString();
  if (!dryRun) saveCatalog(catalog);
  console.log(`\n${tracked.length - failures}/${tracked.length} apps captured${dryRun ? " (dry run, nothing written)" : ""}.`);
  if (failures === tracked.length) process.exit(1);
}

main();
