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
  imageUrl: string | null; // null in the prototype: art is rendered from palette + headline
  headline: string;
  colors: Swatch[];
  tags: {
    style: "Product UI" | "Illustration" | "Photo" | "3D" | "Typography";
    layout: "Full bleed" | "Split" | "Device frame" | "Panorama";
    textOnArt: "None" | "Brand only" | "Headline" | "Headline + body";
    typeStyle: "Sans serif" | "Serif" | "Display" | "Handwritten";
    character: boolean;
    goal: "Product" | "Feature" | "Social proof" | "Offer" | "Event";
  };
  capturedAt: string; // ISO date
};

export const KINDS: { slug: string; kind: AssetKind; label: string }[] = [
  { slug: "screenshots", kind: "screenshot", label: "Screenshots" },
  { slug: "product-headers", kind: "product_header", label: "Product headers" },
  { slug: "search-banners", kind: "search_banner", label: "Search banners" },
  { slug: "paywalls", kind: "paywall", label: "Paywalls" },
];
