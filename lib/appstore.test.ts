import assert from "node:assert/strict";
import { test } from "node:test";
import { findHeaderArtwork } from "./appstore";

// Shaped like the JSON on apps.apple.com: escaped slashes, nested color objects.
const art = (path: string, width: number, height: number) =>
  `{"$kind":"Artwork","crop":"sr","template":"https:\\u002F\\u002Fis1-ssl.mzstatic.com\\u002Fimage\\u002Fthumb\\u002F${path}\\u002F{w}x{h}{c}.{f}","width":${width},"height":${height},"backgroundColor":{"red":0.1,"type":"rgb"}}`;
const page = (uber: string) =>
  `{"$kind":"ShelfBasedProductPage","uber":${uber},"title":"App","icon":${art("icon", 1024, 1024)},"items":[${art("shot", 3840, 2160)}]}`;

test("reads the header from the page's uber artwork", () => {
  const found = findHeaderArtwork(page(`{"$kind":"Uber","artwork":${art("header", 3840, 1646)},"style":"dark"}`));
  assert.deepEqual(found, { url: "https://is1-ssl.mzstatic.com/image/thumb/header/1920x823sr.jpg", width: 3840, height: 1646 });
});

test("returns null when uber is null, even if wide artwork appears elsewhere", () => {
  assert.equal(findHeaderArtwork(page("null")), null);
});

test("ignores strings that contain braces inside the uber object", () => {
  const found = findHeaderArtwork(page(`{"title":"Sleep {better}","artwork":${art("header", 3840, 1646)}}`));
  assert.equal(found?.width, 3840);
});
