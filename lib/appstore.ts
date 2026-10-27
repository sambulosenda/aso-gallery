// App Store sources: the public iTunes Lookup API for metadata and screenshots,
// and the apps.apple.com product page for the header artwork, which the API
// doesn't expose.

export type LookupResult = {
  trackId: number;
  trackName: string;
  artistName: string;
  primaryGenreName: string;
  genres: string[];
  artworkUrl512?: string;
  artworkUrl100?: string;
  screenshotUrls: string[];
  ipadScreenshotUrls?: string[];
  trackViewUrl: string;
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

export async function lookup(id: string, country: string): Promise<LookupResult | null> {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${country}&entity=software`);
  if (!res.ok) throw new Error(`lookup ${id}/${country} → ${res.status}`);
  const json = (await res.json()) as { results: LookupResult[] };
  return json.results.find((r) => String(r.trackId) === id) ?? null;
}

export async function productPageHtml(id: string, country: string): Promise<string> {
  const res = await fetch(`https://apps.apple.com/${country}/app/id${id}`, { headers: { "user-agent": UA, "accept-language": "en-US" } });
  if (!res.ok) throw new Error(`product page ${id}/${country} → ${res.status}`);
  return res.text();
}

export type Artwork = { url: string; width: number; height: number };

// The product page embeds its data as JSON. Apple calls the header artwork the
// "uber": the page object carries `"uber": null` when the app has none, or an
// object holding a mzstatic URL template ("…/{w}x{h}{c}.{f}") with the source
// width and height (e.g. 3840×1646).
export function findHeaderArtwork(html: string): Artwork | null {
  const text = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
  for (const m of text.matchAll(/"uber"\s*:\s*/g)) {
    const start = m.index! + m[0].length;
    if (text[start] !== "{") continue; // null: no header on this page
    const uber = balancedObject(text, start);
    const url = uber.match(/"(?:template|url)"\s*:\s*"(https:\/\/[^"]*mzstatic\.com[^"]+)"/);
    if (!url) continue;
    const width = nearestNumber(uber, "width", url.index!, url.index! + url[0].length);
    const height = nearestNumber(uber, "height", url.index!, url.index! + url[0].length);
    if (!width || !height) continue;
    const w = Math.min(width, 1920);
    return { url: fillTemplate(url[1], w, Math.round((w * height) / width)), width, height };
  }
  return null;
}

// The JSON object starting at `start` (which must be "{"), as text.
function balancedObject(text: string, start: number) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return text.slice(start);
}

function nearestNumber(text: string, key: string, start: number, end: number, span = 250) {
  const from = Math.max(0, start - span);
  let best: { d: number; v: number } | null = null;
  for (const m of text.slice(from, end + span).matchAll(new RegExp(`"${key}"\\s*:\\s*(\\d+)`, "g"))) {
    const at = from + m.index!;
    const d = at < start ? start - at : at - end;
    if (!best || d < best.d) best = { d, v: Number(m[1]) };
  }
  return best?.v ?? 0;
}

export function fillTemplate(url: string, w: number, h: number) {
  return url.replace("{w}", String(w)).replace("{h}", String(h)).replace("{c}", "bb").replace("{f}", "jpg");
}
