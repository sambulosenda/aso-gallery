// Adds every App Store app featured on asoexamples.com to data/tracked.json.
//
//   npm run import:asoexamples            # crawl, resolve storefronts, write
//   npm run import:asoexamples -- --dry-run
//
// Walks the public listing pages (robots.txt allows them) one request per
// second, collects /h/{id}-{slug} links, then finds a storefront for each
// numeric App Store id with batched iTunes lookups. Google Play apps
// (/h/{package}-{slug}) are counted but skipped until Play ingestion exists.
import fs from "node:fs";
import path from "node:path";
import { fetchWithRetry } from "../lib/http";

const SITE = "https://asoexamples.com";
const SECTIONS = ["screenshots", "product-headers", "search-results"];
const STOREFRONTS = ["us", "gb", "in", "de", "fr", "jp", "br", "ca", "au", "es", "it", "kr", "mx", "nl", "tr"];
const UA = "aso-gallery-importer (+https://github.com/sambulosenda/aso-gallery)";

type Tracked = { id: string; country: string; note?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function crawl(): Promise<{ appStore: Map<string, string>; googlePlay: Set<string> }> {
  const appStore = new Map<string, string>(); // id → slug
  const googlePlay = new Set<string>();
  for (const section of SECTIONS) {
    for (let page = 1; page <= 500; page++) {
      const res = await fetchWithRetry(`${SITE}/${section}?page=${page}`, { headers: { "user-agent": UA } });
      if (!res.ok) break;
      const html = await res.text();
      let fresh = 0;
      let links = 0;
      for (const m of html.matchAll(/\/h\/([A-Za-z0-9._-]+?)(?=["'?#\s])/g)) {
        links++;
        const numeric = m[1].match(/^(\d{6,})-(.*)$/);
        if (numeric) {
          if (!appStore.has(numeric[1])) fresh++;
          appStore.set(numeric[1], numeric[2]);
        } else if (!googlePlay.has(m[1])) {
          fresh++;
          googlePlay.add(m[1]);
        }
      }
      console.log(`${section} p${page}: ${fresh} new (${appStore.size} App Store, ${googlePlay.size} Google Play)`);
      // Sections overlap, so a page of already-seen apps is normal; stop only when a page is empty or last.
      if (!links || !html.includes(`page=${page + 1}`)) break;
      await sleep(1000);
    }
  }
  return { appStore, googlePlay };
}

// Finds the first storefront each id is sold in, 150 ids per lookup call.
async function resolveStorefronts(ids: string[]) {
  const found = new Map<string, { country: string; name: string }>();
  for (const country of STOREFRONTS) {
    const pending = ids.filter((id) => !found.has(id));
    if (!pending.length) break;
    for (let i = 0; i < pending.length; i += 150) {
      const batch = pending.slice(i, i + 150);
      const res = await fetchWithRetry(`https://itunes.apple.com/lookup?id=${batch.join(",")}&country=${country}&entity=software`);
      if (!res.ok) continue;
      const json = (await res.json()) as { results: { trackId: number; trackName: string }[] };
      for (const r of json.results) {
        if (batch.includes(String(r.trackId)) && !found.has(String(r.trackId))) found.set(String(r.trackId), { country, name: r.trackName });
      }
      await sleep(500);
    }
    console.log(`after ${country}: ${found.size}/${ids.length} resolved`);
  }
  return found;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const file = path.join(process.cwd(), "data", "tracked.json");
  const current = JSON.parse(fs.readFileSync(file, "utf8")) as { _comment?: string; apps: Tracked[] };
  const known = new Set(current.apps.map((a) => a.id));

  const { appStore, googlePlay } = await crawl();
  const ids = [...appStore.keys()].filter((id) => !known.has(id));
  const resolved = await resolveStorefronts(ids);

  const added: Tracked[] = ids
    .filter((id) => resolved.has(id))
    .map((id) => ({ id, country: resolved.get(id)!.country, note: resolved.get(id)!.name }));
  const unresolved = ids.filter((id) => !resolved.has(id));

  console.log(`\nApp Store apps on the site: ${appStore.size}. Already tracked: ${appStore.size - ids.length}.`);
  console.log(`Adding ${added.length}. Not found in any of ${STOREFRONTS.length} storefronts (removed or region-locked): ${unresolved.length}.`);
  console.log(`Skipped Google Play apps: ${googlePlay.size}.`);
  if (dryRun) return;
  fs.writeFileSync(file, JSON.stringify({ ...current, apps: [...current.apps, ...added] }, null, 2) + "\n");
}

main();
