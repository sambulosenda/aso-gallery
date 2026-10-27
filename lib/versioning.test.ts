import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCapture, hamming, type Capture } from "./versioning";

const img = (hash: string, url = `https://x/${hash}.jpg`) => ({ url, width: 3840, height: 1646, hash, colors: [] });
const cap = (...hashes: string[]): Capture => ({ appId: "a", kind: "product_header", storefront: "us", images: hashes.map((h) => img(h)) });

test("hamming counts differing bits", () => {
  assert.equal(hamming("00", "00"), 0);
  assert.equal(hamming("0f", "00"), 4);
  assert.equal(hamming("ff", "0"), Infinity);
});

test("first capture creates v1", () => {
  const { assets, changed } = applyCapture([], cap("ffff0000ffff0000"), "2026-10-01");
  assert.equal(changed, true);
  assert.equal(assets.length, 1);
  assert.equal(assets[0].version, 1);
  assert.equal(assets[0].lastSeenAt, null);
});

test("near-identical artwork keeps the version but refreshes the URL", () => {
  const first = applyCapture([], cap("ffff0000ffff0000"), "2026-10-01").assets;
  const again: Capture = { ...cap(), images: [img("ffff0000ffff0001", "https://x/new.jpg")] };
  const { assets, changed } = applyCapture(first, again, "2026-10-02");
  assert.equal(changed, false);
  assert.equal(assets.length, 1);
  assert.equal(assets[0].imageUrl, "https://x/new.jpg");
});

test("different artwork closes the old version and opens the next", () => {
  const first = applyCapture([], cap("ffff0000ffff0000"), "2026-10-01").assets;
  const { assets, changed } = applyCapture(first, cap("0000ffff0000ffff"), "2026-10-05");
  assert.equal(changed, true);
  assert.deepEqual(assets.map((a) => [a.version, a.firstSeenAt, a.lastSeenAt]), [
    [1, "2026-10-01", "2026-10-05"],
    [2, "2026-10-05", null],
  ]);
});

test("adding a screenshot to the set is a new version", () => {
  const first = applyCapture([], cap("ffff0000ffff0000"), "2026-10-01").assets;
  const { assets, changed } = applyCapture(first, cap("ffff0000ffff0000", "0000ffff0000ffff"), "2026-10-03");
  assert.equal(changed, true);
  assert.equal(assets.filter((a) => a.version === 2).length, 2);
});

test("header removed from the store closes the live version", () => {
  const first = applyCapture([], cap("ffff0000ffff0000"), "2026-10-01").assets;
  const { assets, changed } = applyCapture(first, cap(), "2026-10-09");
  assert.equal(changed, true);
  assert.equal(assets[0].lastSeenAt, "2026-10-09");
  // ...and a header coming back later starts v2.
  const back = applyCapture(assets, cap("ffff0000ffff0000"), "2026-10-20").assets;
  assert.equal(back.at(-1)!.version, 2);
});
