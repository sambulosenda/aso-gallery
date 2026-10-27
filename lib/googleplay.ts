// Google Play source: the public details page (play.google.com/store/apps/details).
// There is no public API, so we read the data the page embeds for its own
// rendering: AF_initDataCallback({key: 'ds:5', …, data: [...]}) holds the
// listing as nested arrays. Every image in it is an "image node" shaped like
//   [null, 2, [width, height], [null, null, "https://play-lh.googleusercontent.com/…"], …]
import { fetchWithRetry } from "./http";

export type PlayImage = { url: string; width: number; height: number };

export type PlayListing = {
  packageName: string;
  name: string;
  developer: string;
  genre: string;
  isGame: boolean;
  iconUrl: string | null;
  featureGraphic: PlayImage | null;
  screenshots: PlayImage[];
  storeUrl: string;
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

export function playUrl(pkg: string, country = "us") {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=en&gl=${country}`;
}

// null when the app isn't listed in that country (Play answers 404).
export async function playPageHtml(pkg: string, country: string): Promise<string | null> {
  const res = await fetchWithRetry(playUrl(pkg, country), { headers: { "user-agent": UA, "accept-language": "en-US" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`play page ${pkg}/${country} → ${res.status}`);
  return res.text();
}

// Image URLs take a size suffix; "=sN" bounds the longest side to N pixels.
export function sized(url: string, longest: number) {
  return `${url.replace(/=[^/]*$/, "")}=s${longest}`;
}

export function parsePlayPage(html: string, pkg: string): PlayListing {
  const data = callbackData(html, "ds:5");
  if (!data) throw new Error("no ds:5 data on the page");
  const root = at(data, [1, 2]);
  if (!Array.isArray(root)) throw new Error("ds:5 has no listing at [1][2]");

  const name = str(at(root, [0, 0])) ?? pageTitle(html);
  if (!name) throw new Error("no app name");
  const genreId = str(at(root, [79, 0, 0, 2])) ?? "";
  const shotsNode = at(root, [78, 0]);
  return {
    packageName: pkg,
    name,
    developer: str(at(root, [68, 0])) ?? "",
    genre: str(at(root, [79, 0, 0, 0])) ?? "",
    isGame: genreId.startsWith("GAME"),
    iconUrl: image(at(root, [95, 0]))?.url ?? null,
    featureGraphic: image(at(root, [96, 0])),
    screenshots: Array.isArray(shotsNode) ? shotsNode.map(image).filter((i): i is PlayImage => !!i) : [],
    storeUrl: `https://play.google.com/store/apps/details?id=${pkg}`,
  };
}

// The app name from <title>, used when the data layout shifts.
export function pageTitle(html: string): string | null {
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/)?.[1];
  return t ? decodeEntities(t.replace(/\s+-\s+Apps on Google Play\s*$/, "").trim()) || null : null;
}

// Paths to every image node under `node`, for debugging a layout change.
export function imagePaths(node: unknown, path: number[] = [], out: { path: number[]; image: PlayImage }[] = []) {
  const img = image(node);
  if (img) out.push({ path, image: img });
  else if (Array.isArray(node)) node.forEach((child, i) => imagePaths(child, [...path, i], out));
  return out;
}

export function callbackData(html: string, key: string): unknown {
  const keyAt = html.search(new RegExp(`AF_initDataCallback\\(\\{key:\\s*'${key.replace(".", "\\.")}'`));
  if (keyAt < 0) return null;
  const dataAt = html.indexOf("data:", keyAt);
  const start = html.indexOf("[", dataAt);
  if (dataAt < 0 || start < 0) return null;
  return JSON.parse(balancedArray(html, start));
}

function image(node: unknown): PlayImage | null {
  if (!Array.isArray(node)) return null;
  const url = at(node, [3, 2]);
  const size = node[2];
  if (typeof url !== "string" || !url.includes("googleusercontent.com")) return null;
  const [width, height] = Array.isArray(size) && typeof size[0] === "number" ? size : [0, 0];
  return { url, width, height };
}

function at(node: unknown, path: number[]): unknown {
  let cur = node;
  for (const i of path) {
    if (!Array.isArray(cur)) return undefined;
    cur = cur[i];
  }
  return cur;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// The JSON array starting at `start` (which must be "["), as text.
function balancedArray(text: string, start: number) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) return text.slice(start, i + 1);
  }
  return text.slice(start);
}
