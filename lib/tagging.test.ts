import assert from "node:assert/strict";
import { test } from "node:test";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { positiveInt, TagResult, untagged, withTags } from "./tagging";
import type { Asset } from "./types";

const asset = (over: Partial<Asset>): Asset => ({
  id: "a", appId: "app", kind: "screenshot", storefront: "us", orientation: "portrait", width: 1, height: 2,
  imageUrl: "https://x/1.jpg", headline: "", colors: [], tags: null, version: 1, firstSeenAt: "2026-10-27", lastSeenAt: null,
  ...over,
});

const result: TagResult = {
  headline: "Sleep better tonight", style: "Illustration", layout: "Full bleed", textOnArt: "Headline",
  typeStyle: "Sans serif", character: true, goal: "Product",
};

test("only live, untagged images with a URL need tags, search banners last", () => {
  const list = untagged([
    asset({ id: "banner", kind: "search_banner" }),
    asset({ id: "old", lastSeenAt: "2026-10-01" }),
    asset({ id: "done", tags: { ...result, headline: undefined } as never }),
    asset({ id: "sample", imageUrl: null }),
    asset({ id: "header", kind: "product_header" }),
    asset({ id: "shot" }),
  ]);
  assert.deepEqual(list.map((a) => a.id), ["shot", "header", "banner"]);
});

test("applies tags and fills an empty headline only", () => {
  const tagged = withTags(asset({}), result);
  assert.equal(tagged.headline, "Sleep better tonight");
  assert.equal(tagged.tags?.goal, "Product");
  assert.equal("headline" in tagged.tags!, false);
  assert.equal(withTags(asset({ headline: "Kept" }), result).headline, "Kept");
});

test("the schema rejects values outside the filter vocabularies", () => {
  assert.equal(TagResult.safeParse(result).success, true);
  assert.equal(TagResult.safeParse({ ...result, style: "Collage" }).success, false);
  // Converts to a JSON schema the API accepts (no network involved).
  assert.ok(betaZodOutputFormat(TagResult));
});

test("--limit must be a positive integer when given", () => {
  const get = (v?: string) => () => v;
  assert.equal(positiveInt(get(undefined), "--limit"), undefined);
  assert.equal(positiveInt(get("25"), "--limit"), 25);
  for (const bad of ["", "0", "-5", "abc", "1.5"]) assert.throws(() => positiveInt(get(bad), "--limit"), /positive integer/);
});
