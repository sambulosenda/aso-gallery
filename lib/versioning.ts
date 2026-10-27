import type { Asset, AssetKind, Swatch } from "./types";

export type CapturedImage = {
  url: string;
  urls?: string[]; // search_banner: the screenshots in the card
  width: number;
  height: number;
  hash: string; // hex dHash; search banners concatenate one hash per screenshot
  colors: Swatch[];
};

export type Capture = { appId: string; kind: AssetKind; storefront: string; images: CapturedImage[] };

// Max differing bits (out of 64 per image) still treated as the same artwork.
// Absorbs recompression and resizing noise from the CDN.
export const SAME_IMAGE_BITS = 6;

export function hamming(a: string, b: string) {
  if (a.length !== b.length) return Infinity;
  let bits = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { bits += x & 1; x >>= 1; }
  }
  return bits;
}

function sameArtwork(a: string | undefined, b: string) {
  if (!a) return false;
  const perImage = Math.max(1, b.length / 16);
  return hamming(a, b) <= SAME_IMAGE_BITS * perImage;
}

// Folds one capture into the asset list. The live version is kept when every
// image matches; otherwise it is closed and a new version starts today.
// Returns the new asset list and whether a new version was recorded.
export function applyCapture(assets: Asset[], capture: Capture, today: string): { assets: Asset[]; changed: boolean } {
  const { appId, kind, storefront, images } = capture;
  const mine = (a: Asset) => a.appId === appId && a.kind === kind;
  const live = assets.filter((a) => mine(a) && a.lastSeenAt === null);

  const unchanged = live.length === images.length && live.every((a, i) => sameArtwork(a.hash, images[i].hash));
  if (unchanged) {
    // Same artwork; CDN URLs can still rotate, so keep them fresh.
    const byId = new Map(live.map((a, i) => [a.id, images[i]]));
    return {
      assets: assets.map((a) => (byId.has(a.id) ? { ...a, imageUrl: byId.get(a.id)!.url, imageUrls: byId.get(a.id)!.urls ?? a.imageUrls } : a)),
      changed: false,
    };
  }

  const closed = assets.map((a) => (mine(a) && a.lastSeenAt === null ? { ...a, lastSeenAt: today } : a));
  if (!images.length) return { assets: closed, changed: live.length > 0 };

  const version = Math.max(0, ...assets.filter(mine).map((a) => a.version)) + 1;
  const added: Asset[] = images.map((img, i) => ({
    id: `${appId}-${kind}-v${version}-${i}`,
    appId,
    kind,
    storefront,
    orientation: img.width > img.height ? "landscape" : "portrait",
    width: img.width,
    height: img.height,
    imageUrl: img.url,
    ...(img.urls && { imageUrls: img.urls }),
    hash: img.hash,
    headline: "",
    colors: img.colors,
    tags: null,
    version,
    firstSeenAt: today,
    lastSeenAt: null,
  }));
  return { assets: [...closed, ...added], changed: true };
}
