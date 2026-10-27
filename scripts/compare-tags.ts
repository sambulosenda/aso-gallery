// Tags the same images with two models and reports where they agree and what
// each costs, to choose TAG_MODEL. Writes nothing to the catalog.
//
//   npm run compare-tags -- --limit 50
//   npm run compare-tags -- --models claude-opus-5-5,claude-haiku-5-5 --limit 50
//
// In GitHub Actions the per-image table (with thumbnails) also goes to the job summary.
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { loadCatalog } from "../lib/catalog";
import { DEFAULT_MODEL, tagImage, untagged, type TagResult } from "../lib/tagging";
import type { Asset } from "../lib/types";

// $ per million input / output tokens.
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};
const FIELDS = ["style", "layout", "textOnArt", "typeStyle", "character", "goal"] as const;

function args() {
  const argv = process.argv.slice(2);
  const get = (flag: string) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  return {
    models: (get("--models") ?? `${DEFAULT_MODEL},claude-haiku-5-5`).split(","),
    limit: Number(get("--limit")) || 50,
  };
}

// An even spread across apps and kinds, skipping search banners (they repeat screenshots).
function pick(assets: Asset[], n: number) {
  const pool = untagged(assets).filter((a) => a.kind !== "search_banner");
  const step = pool.length > n ? pool.length / n : 1;
  return Array.from({ length: Math.min(n, pool.length) }, (_, i) => pool[Math.floor(i * step)]);
}

async function main() {
  const { models, limit } = args();
  const catalog = loadCatalog();
  if (!catalog) throw new Error("No data/catalog.json yet; run `npm run ingest` first.");
  const names = new Map(catalog.apps.map((a) => [a.id, a.name]));
  const sample = pick(catalog.assets, limit);
  const client = new Anthropic();

  const results = new Map<string, (TagResult | null)[]>(); // asset id → result per model
  const usage = models.map(() => ({ in: 0, out: 0, failed: 0 }));
  const queue = [...sample];
  const worker = async () => {
    for (let a = queue.shift(); a; a = queue.shift()) {
      const row = await Promise.all(
        models.map(async (m, i) => {
          try {
            const t = await tagImage(client, a, names.get(a.appId) ?? "", m);
            usage[i].in += t.inputTokens;
            usage[i].out += t.outputTokens;
            return t.result;
          } catch (e) {
            usage[i].failed++;
            console.error(`${a.id} ${m}: ${(e as Error).message}`);
            return null;
          }
        }),
      );
      results.set(a.id, row);
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));

  const lines: string[] = [];
  const out = (s = "") => lines.push(s);
  out(`## Tagging comparison: ${models.join(" vs ")} on ${sample.length} images`);
  out();
  out("| Model | Failed | Input tokens | Output tokens | Cost | Per image | Per 30,000 images |");
  out("|---|---|---|---|---|---|---|");
  models.forEach((m, i) => {
    const [pin, pout] = PRICES[m] ?? [NaN, NaN];
    const cost = (usage[i].in * pin + usage[i].out * pout) / 1e6;
    const per = cost / Math.max(1, sample.length - usage[i].failed);
    out(`| ${m} | ${usage[i].failed} | ${usage[i].in} | ${usage[i].out} | $${cost.toFixed(3)} | $${per.toFixed(4)} | $${(per * 30000).toFixed(0)} |`);
  });

  const both = [...results.values()].filter((r) => r[0] && r[1]) as TagResult[][];
  out();
  out(`Agreement between the first two models on ${both.length} images:`);
  out();
  for (const f of FIELDS) out(`- ${f}: ${Math.round((100 * both.filter((r) => r[0][f] === r[1][f]).length) / Math.max(1, both.length))}%`);
  out(`- headline (exact): ${Math.round((100 * both.filter((r) => r[0].headline.trim() === r[1].headline.trim()).length) / Math.max(1, both.length))}%`);

  out();
  out(`| Image | App | ${models.join(" | ")} |`);
  out(`|---|---|${models.map(() => "---").join("|")}|`);
  for (const a of sample) {
    const row = results.get(a.id) ?? [];
    const cell = (r: TagResult | null | undefined) =>
      r ? `${r.style} · ${r.layout} · ${r.textOnArt} · ${r.typeStyle} · ${r.character ? "character" : "no character"} · ${r.goal}<br>“${r.headline}”` : "failed";
    out(`| <img src="${a.imageUrl}" width="120"> | ${names.get(a.appId)} (${a.kind}) | ${row.map(cell).join(" | ")} |`);
  }

  const report = lines.join("\n");
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
}

main();
