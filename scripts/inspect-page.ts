// Lists every mzstatic artwork on an App Store product page with its size, to
// debug header detection.   npm run inspect -- 571800810 [country]
import { findHeaderArtwork, productPageHtml } from "../lib/appstore";

const [id, country = "us"] = process.argv.slice(2);
const html = await productPageHtml(id, country);
const text = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
console.log(`${id}/${country}: ${html.length} bytes, header → ${JSON.stringify(findHeaderArtwork(html))}`);

const seen = new Map<string, number>();
for (const m of text.matchAll(/https:\/\/[a-z0-9-]+\.mzstatic\.com\/image\/thumb\/[^"'\s)]+/g)) {
  const key = m[0].replace(/\/[^/]*$/, "/…");
  seen.set(key, (seen.get(key) ?? 0) + 1);
}
console.log(`${seen.size} distinct mzstatic images`);
for (const m of text.matchAll(/https:\/\/[a-z0-9-]+\.mzstatic\.com\/image\/thumb\/[^"'\s)]+/g)) {
  const key = m[0].replace(/\/[^/]*$/, "/…");
  if (!seen.has(key)) continue;
  seen.delete(key);
  // Show the surrounding text so we can see how sizes are encoded.
  console.log("---\n" + text.slice(Math.max(0, m.index! - 160), m.index! + m[0].length + 160).replace(/\s+/g, " "));
}
