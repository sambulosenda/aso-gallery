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

// The product page embeds its artwork as JSON objects carrying a mzstatic URL
// template ("…/{w}x{h}{c}.{f}") with the source width and height. The header
// is the wide one (2.33:1, e.g. 3840×1646); screenshots and icons are not.
// Returns the most frequent wide artwork, or null when the app has no header.
export function findHeaderArtwork(html: string): Artwork | null {
  const text = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
  const counts = new Map<string, { art: Artwork; n: number }>();
  // Width/height sit next to the URL in the same object; key order varies and
  // the object may nest (backgroundColor), so look in a window around the URL.
  for (const m of text.matchAll(/"(?:template|url)"\s*:\s*"(https:\/\/[^"]*mzstatic\.com[^"]+)"/g)) {
    const url = m[1];
    const width = nearestNumber(text, "width", m.index!, m.index! + m[0].length);
    const height = nearestNumber(text, "height", m.index!, m.index! + m[0].length);
    if (!width || !height) continue;
    const ratio = width / height;
    // Landscape iPhone screenshots are ~2.17:1, so the lower bound sits above that.
    if (ratio < 2.25 || ratio > 2.6 || width < 1600) continue;
    const art = { url: fillTemplate(url, 1920, Math.round(1920 / ratio)), width, height };
    const key = url.split("/").slice(0, -1).join("/");
    const entry = counts.get(key) ?? { art, n: 0 };
    entry.n++;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.n - a.n)[0]?.art ?? null;
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
