// Turns data/catalog.json (or the sample seed when there is none) into
// data/d1.sql, a full replacement of the site's D1 database.
//
//   npm run d1:build && npm run d1:load          # local dev database
//   npm run d1:build && npm run d1:load:remote   # production
//
// The catalog stays the ingest's source of truth; D1 is the copy the site
// reads. Everything the gallery filters or sorts on gets its own column, and
// each row keeps the full object as JSON in `data`. Unfiltered totals and
// genre counts are precomputed too: D1 bills per row read, and counting the
// whole gallery on every page view would read every live asset.
//
// The import builds *_new tables and swaps them in at the end, so the live
// site is never left reading half-loaded tables.
import fs from "node:fs";
import path from "node:path";
import { loadCatalog } from "../lib/catalog";
import { matchingSwatches } from "../lib/palette";
import { buildSeed } from "../lib/seed";
import type { App, Asset } from "../lib/types";

const OUT = path.join(process.cwd(), "data", "d1.sql");
// D1 caps a statement at 100KB; rows carry up to ~1KB of JSON each.
const ROWS_PER_INSERT = 50;

const catalog = loadCatalog();
const sample = !catalog || catalog.apps.length === 0;
const { apps, assets }: { apps: App[]; assets: Asset[] } = sample ? buildSeed() : catalog!;
const appsById = new Map(apps.map((a) => [a.id, a]));

const sql = (v: string | number | null) =>
  v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replaceAll("'", "''")}'`;

const setKey = (a: Pick<Asset, "appId" | "kind">) => `${a.appId}:${a.kind}`;
const versionCounts = new Map<string, number>();
for (const a of assets) versionCounts.set(setKey(a), Math.max(versionCounts.get(setKey(a)) ?? 0, a.version));

// One row per version change: version n-1 → n of an app's set of one kind.
const firstSeen = new Map<string, string>();
for (const a of assets) firstSeen.set(`${setKey(a)}:${a.version}`, a.firstSeenAt);
const changes = [...firstSeen.entries()]
  .map(([key, at]) => { const [appId, kind, v] = key.split(":"); return { appId, kind, version: Number(v), at }; })
  .filter((c) => c.version > 1);

const lines: string[] = [
  "DROP TABLE IF EXISTS apps_new;",
  "DROP TABLE IF EXISTS assets_new;",
  "DROP TABLE IF EXISTS changes_new;",
  "DROP TABLE IF EXISTS meta_new;",
  "DROP TABLE IF EXISTS stats_new;",
  "DROP TABLE IF EXISTS genres_new;",
  "CREATE TABLE apps_new (id TEXT PRIMARY KEY, genre TEXT NOT NULL, data TEXT NOT NULL);",
  `CREATE TABLE assets_new (
    id TEXT PRIMARY KEY, app_id TEXT NOT NULL, kind TEXT NOT NULL, version INTEGER NOT NULL,
    version_count INTEGER NOT NULL, live INTEGER NOT NULL, first_seen_at TEXT NOT NULL,
    store TEXT NOT NULL, is_game INTEGER NOT NULL, genre TEXT NOT NULL, app_name TEXT NOT NULL,
    style TEXT, goal TEXT, swatches TEXT NOT NULL, search TEXT NOT NULL, data TEXT NOT NULL);`,
  "CREATE TABLE changes_new (app_id TEXT NOT NULL, kind TEXT NOT NULL, version INTEGER NOT NULL, first_seen_at TEXT NOT NULL);",
  "CREATE TABLE meta_new (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
  "CREATE TABLE stats_new (kind TEXT PRIMARY KEY, creatives INTEGER NOT NULL, apps INTEGER NOT NULL, changes INTEGER NOT NULL);",
  "CREATE TABLE genres_new (kind TEXT NOT NULL, genre TEXT NOT NULL, n INTEGER NOT NULL);",
];

function insert(table: string, rows: (string | number | null)[][]) {
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const values = rows.slice(i, i + ROWS_PER_INSERT).map((r) => `(${r.map(sql).join(",")})`).join(",\n");
    lines.push(`INSERT INTO ${table} VALUES\n${values};`);
  }
}

insert("apps_new", apps.map((a) => [a.id, a.genre, JSON.stringify(a)]));
insert("assets_new", assets.map((a) => {
  const app = appsById.get(a.appId)!;
  return [
    a.id, a.appId, a.kind, a.version, versionCounts.get(setKey(a))!, a.lastSeenAt === null ? 1 : 0, a.firstSeenAt,
    app.store, app.isGame ? 1 : 0, app.genre, app.name,
    a.tags?.style ?? null, a.tags?.goal ?? null,
    `,${matchingSwatches(a.colors).join(",")},`,
    [app.name, app.developer, app.genre, a.headline].join("\n").toLowerCase(),
    JSON.stringify(a),
  ];
}));
insert("changes_new", changes.map((c) => [c.appId, c.kind, c.version, c.at]));
const live = assets.filter((a) => a.lastSeenAt === null);
insert("stats_new", ["screenshot", "product_header", "search_banner", "paywall"].map((kind) => {
  const of = live.filter((a) => a.kind === kind);
  return [kind, of.length, new Set(of.map((a) => a.appId)).size, changes.filter((c) => c.kind === kind).length];
}));
const genres = new Map<string, number>();
for (const a of live) {
  const key = `${a.kind}\t${appsById.get(a.appId)!.genre}`;
  genres.set(key, (genres.get(key) ?? 0) + 1);
}
insert("genres_new", [...genres.entries()].map(([key, n]) => [...key.split("\t"), n]));
insert("meta_new", [["sample", sample ? "1" : "0"], ["updated_at", catalog?.updatedAt ?? new Date().toISOString()]]);

for (const t of ["apps", "assets", "changes", "meta", "stats", "genres"]) {
  lines.push(`DROP TABLE IF EXISTS ${t};`, `ALTER TABLE ${t}_new RENAME TO ${t};`);
}
lines.push(
  "CREATE INDEX assets_gallery ON assets (kind, live, first_seen_at DESC);",
  "CREATE INDEX assets_app ON assets (app_id, kind, version);",
  "CREATE INDEX apps_genre ON apps (genre, id);",
  "CREATE INDEX changes_recent ON changes (kind, first_seen_at DESC);",
  "CREATE INDEX genres_kind ON genres (kind, n DESC);",
);

fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`Wrote ${path.relative(process.cwd(), OUT)}: ${apps.length} apps, ${assets.length} assets, ${changes.length} changes${sample ? " (sample data)" : ""}`);
