import fs from "node:fs";
import path from "node:path";
import type { App, Asset } from "./types";

// The catalog is a single JSON file written by scripts/ingest.ts. It stands in
// for the Postgres tables in PLAN.md until there's enough data to need them.
export type Catalog = { updatedAt: string; apps: App[]; assets: Asset[] };

export const CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");

export function loadCatalog(file = CATALOG_PATH): Catalog | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Catalog;
  } catch {
    return null;
  }
}

export function saveCatalog(catalog: Catalog, file = CATALOG_PATH) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sorted = {
    ...catalog,
    apps: [...catalog.apps].sort((a, b) => a.id.localeCompare(b.id)),
    assets: [...catalog.assets].sort((a, b) => a.id.localeCompare(b.id)),
  };
  fs.writeFileSync(file, JSON.stringify(sorted, null, 1) + "\n");
}
