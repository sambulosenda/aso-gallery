// Lists every mzstatic artwork on an App Store product page with its size, to
// debug header detection.   npm run inspect -- 571800810 [country]
import { findHeaderArtwork, productPageHtml } from "../lib/appstore";

async function main() {
  const [id, country = "us"] = process.argv.slice(2);
  const html = await productPageHtml(id, country);
  const text = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
  console.log(`${id}/${country}: ${html.length} bytes, ${(text.match(/mzstatic/g) ?? []).length} mzstatic mentions`);
  console.log(`header → ${JSON.stringify(findHeaderArtwork(html))}`);

  // Show the surrounding text of each distinct image and of likely header keywords,
  // so we can see how sizes are encoded.
  const shown = new Set<string>();
  for (const m of text.matchAll(/https:\/\/[a-z0-9-]+\.mzstatic\.com\/[^"'\s)]+/g)) {
    const key = m[0].replace(/\/[^/]*$/, "");
    if (shown.has(key)) continue;
    shown.add(key);
    console.log("--- img\n" + text.slice(Math.max(0, m.index! - 200), m.index! + m[0].length + 200).replace(/\s+/g, " "));
  }
  for (const word of ["3840", "1646", "eader", "uber", "hero", "Hero", "editorial"]) {
    const i = text.indexOf(word);
    if (i >= 0) console.log(`--- "${word}"\n` + text.slice(Math.max(0, i - 300), i + 300).replace(/\s+/g, " "));
  }
}

main();
