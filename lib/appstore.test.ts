import assert from "node:assert/strict";
import { test } from "node:test";
import { findHeaderArtwork } from "./appstore";

const art = (path: string, width: number, height: number) =>
  `{"$kind":"Artwork","template":"https:\\u002F\\u002Fis1-ssl.mzstatic.com\\u002Fimage\\u002Fthumb\\u002F${path}\\u002F{w}x{h}{c}.{f}","width":${width},"height":${height},"backgroundColor":{"red":0.1}}`;

test("picks the wide header artwork and ignores icons and screenshots", () => {
  const html = `<script type="application/json">[${art("icon", 1024, 1024)},${art("shot1", 1290, 2796)},${art("header", 3840, 1646)},${art("header", 3840, 1646)}]</script>`;
  const found = findHeaderArtwork(html);
  assert.ok(found);
  assert.equal(found.width, 3840);
  assert.equal(found.url, "https://is1-ssl.mzstatic.com/image/thumb/header/1920x823bb.jpg");
});

test("returns null when the page has no header", () => {
  assert.equal(findHeaderArtwork(`[${art("icon", 1024, 1024)},${art("shot", 2796, 1290)}]`), null);
});
