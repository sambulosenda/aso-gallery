import { buildSeed } from "./seed";
import type { App, Asset, AssetKind } from "./types";

const { apps, assets } = buildSeed();
const appsById = new Map(apps.map((a) => [a.id, a]));

export type Filters = {
  q?: string;
  genre?: string;
  store?: string; // "app_store" | "google_play"
  type?: string; // "apps" | "games"
  color?: string; // hex without #
  style?: string;
  goal?: string;
  sort?: string; // "new" | "name"
};

export type Entry = Asset & { app: App };

// Rough perceptual distance in RGB space; good enough for "find blue-ish headers".
function colorDistance(a: string, b: string) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.replace("#", "").padStart(6, "0").slice(i - 1, i + 1), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  return Math.sqrt(2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2);
}

export function listEntries(kind: AssetKind, f: Filters): Entry[] {
  const q = f.q?.toLowerCase().trim();
  let out = assets
    .filter((a) => a.kind === kind)
    .map((a) => ({ ...a, app: appsById.get(a.appId)! }))
    .filter((e) => {
      if (q && ![e.app.name, e.app.developer, e.app.genre, e.headline].some((s) => s.toLowerCase().includes(q))) return false;
      if (f.genre && e.app.genre !== f.genre) return false;
      if (f.store && e.app.store !== f.store) return false;
      if (f.type === "apps" && e.app.isGame) return false;
      if (f.type === "games" && !e.app.isGame) return false;
      if (f.style && e.tags.style !== f.style) return false;
      if (f.goal && e.tags.goal !== f.goal) return false;
      if (f.color && !e.colors.some((c) => c.pct >= 15 && colorDistance(c.hex, f.color!) < 260)) return false;
      return true;
    });
  out = f.sort === "name"
    ? out.sort((a, b) => a.app.name.localeCompare(b.app.name))
    : out.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  return out;
}

export function genreCounts(kind: AssetKind) {
  const counts = new Map<string, number>();
  for (const a of assets) if (a.kind === kind) {
    const g = appsById.get(a.appId)!.genre;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function getApp(id: string) {
  const app = appsById.get(id);
  if (!app) return null;
  return { app, assets: assets.filter((a) => a.appId === id) };
}

export function relatedApps(app: App, limit = 6) {
  return apps.filter((a) => a.genre === app.genre && a.id !== app.id).slice(0, limit);
}
