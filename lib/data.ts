import { loadCatalog } from "./catalog";
import { buildSeed } from "./seed";
import type { App, Asset, AssetKind } from "./types";

// Real data from `npm run ingest` when it exists, otherwise the sample seed.
const catalog = loadCatalog();
export const usingSampleData = !catalog || catalog.apps.length === 0;
const { apps, assets } = usingSampleData ? buildSeed() : catalog!;
const appsById = new Map(apps.map((a) => [a.id, a]));

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

const setKey = (a: Asset) => `${a.appId}:${a.kind}`;
const versionCounts = new Map<string, number>();
for (const a of assets) versionCounts.set(setKey(a), Math.max(versionCounts.get(setKey(a)) ?? 0, a.version));
const current = assets.filter((a) => a.lastSeenAt === null);

// Rough perceptual distance in RGB space; good enough for "find blue-ish headers".
function colorDistance(a: string, b: string) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.replace("#", "").padStart(6, "0").slice(i - 1, i + 1), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  return Math.sqrt(2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2);
}

export function listEntries(kind: AssetKind, f: Filters): Entry[] {
  const q = f.q?.toLowerCase().trim();
  let out = current
    .filter((a) => a.kind === kind)
    .map((a) => ({ ...a, app: appsById.get(a.appId)!, versionCount: versionCounts.get(setKey(a))! }))
    .filter((e) => {
      if (q && ![e.app.name, e.app.developer, e.app.genre, e.headline].some((s) => s.toLowerCase().includes(q))) return false;
      if (f.genre && e.app.genre !== f.genre) return false;
      if (f.store && e.app.store !== f.store) return false;
      if (f.type === "apps" && e.app.isGame) return false;
      if (f.type === "games" && !e.app.isGame) return false;
      if (f.style && e.tags?.style !== f.style) return false;
      if (f.goal && e.tags?.goal !== f.goal) return false;
      if (f.changed && e.versionCount < 2) return false;
      if (f.color && !e.colors.some((c) => c.pct >= 15 && colorDistance(c.hex, f.color!) < 260)) return false;
      return true;
    });
  out = f.sort === "name"
    ? out.sort((a, b) => a.app.name.localeCompare(b.app.name))
    : f.sort === "changes"
      ? out.sort((a, b) => b.versionCount - a.versionCount || b.firstSeenAt.localeCompare(a.firstSeenAt))
      : out.sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
  return out;
}

export function genreCounts(kind: AssetKind) {
  const counts = new Map<string, number>();
  for (const a of current) if (a.kind === kind) {
    const g = appsById.get(a.appId)!.genre;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export type Version = { kind: AssetKind; version: number; firstSeenAt: string; lastSeenAt: string | null; assets: Asset[] };

// Groups an app's assets into versions per kind, oldest first.
function versionsOf(appId: string, kind: AssetKind): Version[] {
  const byVersion = new Map<number, Asset[]>();
  for (const a of assets) if (a.appId === appId && a.kind === kind) {
    byVersion.set(a.version, [...(byVersion.get(a.version) ?? []), a]);
  }
  return [...byVersion.entries()]
    .sort(([a], [b]) => a - b)
    .map(([version, list]) => ({ kind, version, firstSeenAt: list[0].firstSeenAt, lastSeenAt: list[0].lastSeenAt, assets: list }));
}

export function getApp(id: string) {
  const app = appsById.get(id);
  if (!app) return null;
  const kinds = [...new Set(assets.filter((a) => a.appId === id).map((a) => a.kind))];
  return {
    app,
    assets: current.filter((a) => a.appId === id),
    history: Object.fromEntries(kinds.map((k) => [k, versionsOf(id, k)])) as Partial<Record<AssetKind, Version[]>>,
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

// Every version change across all apps, newest first.
export function listChanges(kind?: AssetKind): Change[] {
  const out: Change[] = [];
  for (const app of apps) {
    for (const k of ["product_header", "screenshot", "search_banner"] as AssetKind[]) {
      if (kind && k !== kind) continue;
      const vs = versionsOf(app.id, k);
      for (let i = 1; i < vs.length; i++) {
        out.push({ app, kind: k, before: vs[i - 1], after: vs[i], diff: describeDiff(vs[i - 1], vs[i]) });
      }
    }
  }
  return out.sort((a, b) => b.after.firstSeenAt.localeCompare(a.after.firstSeenAt));
}

export function relatedApps(app: App, limit = 6) {
  return apps.filter((a) => a.genre === app.genre && a.id !== app.id).slice(0, limit);
}
