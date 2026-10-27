// Tags captured creative with Claude: style, layout, text, type, character,
// goal and the headline, so the gallery's filters and search work on real data.
// Only live, untagged images are sent, so a daily run tags just what changed.
//
//   npm run tag                     # everything untagged
//   npm run tag -- --limit 200      # at most 200 images (caps spend)
//   npm run tag -- --dry-run --limit 5   # print tags without saving
//   TAG_MODEL=claude-haiku-5-5 npm run tag   # a cheaper model
//
// Needs Anthropic credentials (ANTHROPIC_API_KEY, or an `ant auth login` profile).
import Anthropic from "@anthropic-ai/sdk";
import { loadCatalog, saveCatalog } from "../lib/catalog";
import { DEFAULT_MODEL, tagImage, untagged, withTags, type TagResult } from "../lib/tagging";

const CONCURRENCY = 4;
const SAVE_EVERY = 50;

function args() {
  const argv = process.argv.slice(2);
  const get = (flag: string) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  return { limit: Number(get("--limit")) || 0, dryRun: argv.includes("--dry-run") };
}

async function main() {
  const { limit, dryRun } = args();
  const model = process.env.TAG_MODEL || DEFAULT_MODEL;
  const catalog = loadCatalog();
  if (!catalog) throw new Error("No data/catalog.json yet; run `npm run ingest` first.");
  const names = new Map(catalog.apps.map((a) => [a.id, a.name]));

  const all = untagged(catalog.assets);
  const todo = limit ? all.slice(0, limit) : all;
  console.log(`${all.length} untagged images; tagging ${todo.length} with ${model}${dryRun ? " (dry run)" : ""}.`);

  const client = new Anthropic();
  const byUrl = new Map<string, TagResult>(); // search banners reuse their first screenshot's result
  const byId = new Map(catalog.assets.map((a, i) => [a.id, i]));
  let done = 0, failed = 0, inputTokens = 0, outputTokens = 0;

  const save = () => {
    if (dryRun) return;
    catalog.updatedAt = new Date().toISOString();
    saveCatalog(catalog);
  };

  const queue = [...todo];
  const worker = async () => {
    for (let asset = queue.shift(); asset; asset = queue.shift()) {
      try {
        let result = byUrl.get(asset.imageUrl!) ?? null;
        if (!result) {
          const tagged = await tagImage(client, asset, names.get(asset.appId) ?? "", model);
          inputTokens += tagged.inputTokens;
          outputTokens += tagged.outputTokens;
          result = tagged.result;
        }
        if (!result) throw new Error("no tags returned");
        byUrl.set(asset.imageUrl!, result);
        const i = byId.get(asset.id)!;
        catalog.assets[i] = withTags(catalog.assets[i], result);
        if (dryRun) console.log(`${names.get(asset.appId)} ${asset.kind}: ${JSON.stringify(result)}`);
      } catch (e) {
        failed++;
        console.error(`${asset.id}: ${(e as Error).message}`);
      }
      if (++done % SAVE_EVERY === 0) {
        save();
        console.log(`${done}/${todo.length} (${failed} failed)`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  save();

  console.log(`\nTagged ${done - failed}/${todo.length}${dryRun ? " (dry run, nothing written)" : ""}. Tokens: ${inputTokens} in, ${outputTokens} out.`);
  if (todo.length && failed === todo.length) process.exit(1);
}

main();
