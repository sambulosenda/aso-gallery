export type Store = "app_store" | "google_play";
export type AssetKind = "screenshot" | "product_header" | "search_banner" | "paywall";

export type App = {
  id: string;
  store: Store;
  storeId: string;
  name: string;
  developer: string;
  genre: string;
  isGame: boolean;
  storeUrl: string;
  iconColor: string;
  iconUrl?: string;
};

export type Swatch = { hex: string; pct: number };

export type Asset = {
  id: string;
  appId: string;
  kind: AssetKind;
  storefront: string; // ISO country code, e.g. "us"
  orientation: "portrait" | "landscape";
  width: number;
  height: number;
  imageUrl: string | null; // null for sample data: art is rendered from palette + headline
  imageUrls?: string[]; // search_banner: the screenshots shown in the search result card
  hash?: string; // perceptual hash (dHash, hex) used to detect changed creative
  headline: string;
  colors: Swatch[];
  tags: null | {
    style: "Product UI" | "Illustration" | "Photo" | "3D" | "Typography";
    layout: "Full bleed" | "Split" | "Device frame" | "Panorama";
    textOnArt: "None" | "Brand only" | "Headline" | "Headline + body";
    typeStyle: "Sans serif" | "Serif" | "Display" | "Handwritten";
    character: boolean;
    goal: "Product" | "Feature" | "Social proof" | "Offer" | "Event";
  }; // null until tagged
  // Creative history: every store capture that differs from the previous one
  // becomes a new version of the app's set for that kind (all screenshots
  // change together, as they do in App Store Connect).
  version: number; // 1 = oldest seen
  firstSeenAt: string; // ISO date
  lastSeenAt: string | null; // null while still live on the store
};

export const KINDS: { slug: string; kind: AssetKind; label: string }[] = [
  { slug: "screenshots", kind: "screenshot", label: "Screenshots" },
  { slug: "product-headers", kind: "product_header", label: "Product headers" },
  { slug: "search-banners", kind: "search_banner", label: "Search banners" },
  { slug: "paywalls", kind: "paywall", label: "Paywalls" },
];
