import assert from "node:assert/strict";
import { test } from "node:test";
import { imagePaths, pageTitle, parsePlayPage, sized } from "./googleplay";

const img = (w: number, h: number, id: string) => [null, 2, [w, h], [null, null, `https://play-lh.googleusercontent.com/${id}`]];

// The listing sits at data[1][2], with fields at fixed indexes.
function page(overrides: Record<number, unknown> = {}) {
  const root: unknown[] = [];
  root[0] = ["Calm - Sleep, Meditate, Relax"];
  root[68] = ["Calm.com, Inc."];
  root[78] = [[img(1080, 1920, "s1"), img(1080, 1920, "s2"), img(1080, 1920, "s3")]];
  root[79] = [[["Health & Fitness", null, "HEALTH_AND_FITNESS"]]];
  root[95] = [img(512, 512, "icon")];
  root[96] = [img(1024, 500, "feature")];
  Object.assign(root, overrides);
  const data = [null, [null, null, root]];
  return `<html><head><title>Calm - Sleep, Meditate, Relax - Apps on Google Play</title></head><body>
<script>AF_initDataCallback({key: 'ds:4', hash: '1', data:[1,"]"], sideChannel: {}});</script>
<script>AF_initDataCallback({key: 'ds:5', hash: '2', data:${JSON.stringify(data)}, sideChannel: {}});</script></body></html>`;
}

test("reads name, developer, genre, icon, feature graphic and screenshots", () => {
  const l = parsePlayPage(page(), "com.calm.android");
  assert.equal(l.name, "Calm - Sleep, Meditate, Relax");
  assert.equal(l.developer, "Calm.com, Inc.");
  assert.equal(l.genre, "Health & Fitness");
  assert.equal(l.isGame, false);
  assert.equal(l.iconUrl, "https://play-lh.googleusercontent.com/icon");
  assert.deepEqual(l.featureGraphic, { url: "https://play-lh.googleusercontent.com/feature", width: 1024, height: 500 });
  assert.equal(l.screenshots.length, 3);
  assert.equal(l.screenshots[0].height, 1920);
  assert.equal(l.storeUrl, "https://play.google.com/store/apps/details?id=com.calm.android");
});

test("handles apps without a feature graphic, and games", () => {
  const l = parsePlayPage(page({ 96: null, 79: [[["Puzzle", null, "GAME_PUZZLE"]]] }), "com.example.game");
  assert.equal(l.featureGraphic, null);
  assert.equal(l.isGame, true);
});

test("falls back to the page title for the name", () => {
  assert.equal(parsePlayPage(page({ 0: null }), "x").name, "Calm - Sleep, Meditate, Relax");
  assert.equal(pageTitle("<title>Tom &amp; Jerry - Apps on Google Play</title>"), "Tom & Jerry");
});

test("throws when the page has no listing data", () => {
  assert.throws(() => parsePlayPage("<html></html>", "x"), /ds:5/);
});

test("finds every image node and sizes urls", () => {
  const paths = imagePaths([null, [null, null, [img(1, 2, "a"), [img(3, 4, "b")]]]]);
  assert.deepEqual(paths.map((p) => p.path), [[1, 2, 0], [1, 2, 1, 0]]);
  assert.equal(sized("https://play-lh.googleusercontent.com/abc=w526-h296-rw", 1280), "https://play-lh.googleusercontent.com/abc=s1280");
  assert.equal(sized("https://play-lh.googleusercontent.com/abc", 512), "https://play-lh.googleusercontent.com/abc=s512");
});
