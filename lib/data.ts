import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { App, Asset, AssetKind } from "./types";

// Reads the site's D1 database, loaded from data/catalog.json by
// scripts/build-d1.ts. Filters and sorts run in SQL against the columns that
// script precomputes; full objects come back from each row's `data` JSON.

async function db() {
  return (await getCloudflareContext({ async: true })).env.DB;
}

export type Filters = {
  q?: string;
  genre?: string;
  store?: string; // "app_store" | "google_play"
  type?: string; // "apps" | "games"
  color?: string; // hex without #
  style?: string;
  goal?: string;
  sort?: string; // "new" | "name" | "changes"
  changed?: string; // "1" = only apps that have changed this creative
};

export type Entry = Asset & { app: App; versionCount: number };

type EntryRow = { data: string; app: string; version_count: number };
const toEntry = (r: EntryRow): Entry => ({ ...JSON.parse(r.data), app: JSON.parse(r.app), versionCount: r.version_count });

export async function usingSampleData() {
  const row = await (await db()).prepare("SELECT value FROM meta WHERE key = 'sample'").first<{ value: string }>();
  return row?.value !== "0";
}

function where(kind: AssetKind, f: Filters) {
  const clauses = ["a.kind = ?", "a.live = 1"];
  const params: (string | number)[] = [kind];
  const add = (clause: string, ...p: (string | number)[]) => { clauses.push(clause); params.push(...p); };
  const q = f.q?.toLowerCase().trim();
  if (q) add("a.search LIKE ? ESCAPE '\\'", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  if (f.genre) add("a.genre = ?", f.genre);
  if (f.store) add("a.store = ?", f.store);
  if (f.type === "apps") add("a.is_game = 0");
  if (f.type === "games") add("a.is_game = 1");
  if (f.style) add("a.style = ?", f.style);
  if (f.goal) add("a.goal = ?", f.goal);
  if (f.changed) add("a.version_count >= 2");
  if (f.color) add("a.swatches LIKE ?", `%,${f.color.toLowerCase()},%`);
  return { sql: clauses.join(" AND "), params };
}

const ORDER: Record<string, string> = {
  name: "a.app_name COLLATE NOCASE, a.id",
  changes: "a.version_count DESC, a.first_seen_at DESC, a.id",
  new: "a.first_seen_at DESC, a.id",
};

// Headline numbers for a gallery: live creatives, the apps they belong to, and version changes.
export async function galleryStats(kind: AssetKind) {
  const row = await (await db()).prepare("SELECT creatives, apps, changes FROM stats WHERE kind = ?").bind(kind)
    .first<{ creatives: number; apps: number; changes: number }>();
  return row ?? { creatives: 0, apps: 0, changes: 0 };
}

// One page of the gallery plus the total number of matches. Unfiltered, the
// total comes from the precomputed stats instead of counting every row.
export async function listEntries(kind: AssetKind, f: Filters, limit: number, offset: number) {
  const d = await db();
  const w = where(kind, f);
  const filtered = Object.entries(f).some(([k, v]) => v && k !== "sort");
  const rows = await d.prepare(`SELECT a.data, a.version_count, p.data AS app FROM assets a JOIN apps p ON p.id = a.app_id
    WHERE ${w.sql} ORDER BY ${ORDER[f.sort ?? ""] ?? ORDER.new} LIMIT ? OFFSET ?`).bind(...w.params, limit, offset).all<EntryRow>();
  const total = filtered
    ? (await d.prepare(`SELECT COUNT(*) AS n FROM assets a WHERE ${w.sql}`).bind(...w.params).first<{ n: number }>())!.n
    : (await galleryStats(kind)).creatives;
  return { entries: rows.results.map(toEntry), total };
}

export async function genreCounts(kind: AssetKind): Promise<[string, number][]> {
  const { results } = await (await db())
    .prepare("SELECT genre, n FROM genres WHERE kind = ? ORDER BY n DESC").bind(kind).all<{ genre: string; n: number }>();
  return results.map((r) => [r.genre, r.n]);
}

export type Version = { kind: AssetKind; version: number; firstSeenAt: string; lastSeenAt: string | null; assets: Asset[] };

// Groups assets into versions per kind, oldest first.
function versionsOf(assets: Asset[], kind: AssetKind): Version[] {
  const byVersion = new Map<number, Asset[]>();
  for (const a of assets) if (a.kind === kind) {
    byVersion.set(a.version, [...(byVersion.get(a.version) ?? []), a]);
  }
  return [...byVersion.entries()]
    .sort(([a], [b]) => a - b)
    .map(([version, list]) => ({ kind, version, firstSeenAt: list[0].firstSeenAt, lastSeenAt: list[0].lastSeenAt, assets: list }));
}

export async function getApp(id: string) {
  const d = await db();
  const [appRows, assetRows] = await d.batch<{ data: string }>([
    d.prepare("SELECT data FROM apps WHERE id = ?").bind(id),
    d.prepare("SELECT data FROM assets WHERE app_id = ? ORDER BY id").bind(id),
  ]);
  if (!appRows.results.length) return null;
  const app: App = JSON.parse(appRows.results[0].data);
  const assets: Asset[] = assetRows.results.map((r) => JSON.parse(r.data));
  const kinds = [...new Set(assets.map((a) => a.kind))];
  return {
    app,
    assets: assets.filter((a) => a.lastSeenAt === null),
    history: Object.fromEntries(kinds.map((k) => [k, versionsOf(assets, k)])) as Partial<Record<AssetKind, Version[]>>,
  };
}

export type Change = { app: App; kind: AssetKind; before: Version; after: Version; diff: string[] };

// Short labels for what changed between two versions of the same creative.
export function describeDiff(before: Version, after: Version) {
  const diff: string[] = [];
  const [b, a] = [before.assets[0], after.assets[0]];
  if (before.assets.length !== after.assets.length) diff.push(`${before.assets.length} → ${after.assets.length} images`);
  if (b.headline !== a.headline) diff.push("Copy");
  if (b.colors[0]?.hex !== a.colors[0]?.hex) diff.push("Colors");
  if (b.tags && a.tags) {
    if (b.tags.style !== a.tags.style) diff.push("Style");
    if (b.tags.layout !== a.tags.layout) diff.push("Layout");
    if (b.tags.goal !== a.tags.goal) diff.push(`Goal: ${a.tags.goal}`);
  }
  if (!diff.length) diff.push("Artwork");
  return diff;
}

// The most recent version changes across all apps, newest first.
export async function listChanges(kind?: AssetKind, limit = 100): Promise<Change[]> {
  const d = await db();
  const { results: picked } = await d
    .prepare(`SELECT app_id, kind, version FROM changes ${kind ? "WHERE kind = ?" : ""} ORDER BY first_seen_at DESC LIMIT ?`)
    .bind(...(kind ? [kind] : []), limit).all<{ app_id: string; kind: AssetKind; version: number }>();
  if (!picked.length) return [];
  const ids = JSON.stringify([...new Set(picked.map((c) => c.app_id))]);
  const [appRows, assetRows] = await d.batch<{ data: string }>([
    d.prepare("SELECT data FROM apps WHERE id IN (SELECT value FROM json_each(?))").bind(ids),
    d.prepare("SELECT data FROM assets WHERE app_id IN (SELECT value FROM json_each(?)) ORDER BY id").bind(ids),
  ]);
  const apps = new Map(appRows.results.map((r) => { const a: App = JSON.parse(r.data); return [a.id, a]; }));
  const assetsByApp = new Map<string, Asset[]>();
  for (const r of assetRows.results) {
    const a: Asset = JSON.parse(r.data);
    assetsByApp.set(a.appId, [...(assetsByApp.get(a.appId) ?? []), a]);
  }
  return picked.map((c) => {
    const vs = versionsOf(assetsByApp.get(c.app_id) ?? [], c.kind);
    const before = vs.find((v) => v.version === c.version - 1)!;
    const after = vs.find((v) => v.version === c.version)!;
    return { app: apps.get(c.app_id)!, kind: c.kind, before, after, diff: describeDiff(before, after) };
  });
}

export async function relatedApps(app: App, limit = 6): Promise<App[]> {
  const { results } = await (await db())
    .prepare("SELECT data FROM apps WHERE genre = ? AND id <> ? ORDER BY id LIMIT ?")
    .bind(app.genre, app.id, limit).all<{ data: string }>();
  return results.map((r) => JSON.parse(r.data));
}
