// Deterministic sample data for the prototype. Replace with the ingestion
// pipeline (iTunes Lookup + storefront scrape) once a database is wired up.
import type { App, Asset, AssetKind, Swatch } from "./types";

const APPS: [string, string, string, boolean][] = [
  ["Stillwater", "Calm Labs", "Health & Fitness", false],
  ["Ledgerly", "Penny Co", "Finance", false],
  ["Snapcart", "Grocer Inc", "Shopping", false],
  ["Wordsmith", "Inkwell", "Education", false],
  ["Orbit Run", "Nebula Games", "Action", true],
  ["Petal", "Bloom Studio", "Lifestyle", false],
  ["Trailhead", "Outdoorsy", "Travel", false],
  ["Pixel Farm", "Harvest Games", "Simulation", true],
  ["Focusly", "Deep Work Ltd", "Productivity", false],
  ["Chirp", "Chirp Social", "Social Networking", false],
  ["Mealprep", "Kitchen Table", "Food & Drink", false],
  ["Gridlock", "Puzzle Forge", "Puzzle", true],
  ["Sleepwell", "Calm Labs", "Health & Fitness", false],
  ["Tuneup", "Soundbox", "Music", false],
  ["Nailed It", "Shanel Beauty", "Lifestyle", false],
  ["Coinflip", "Penny Co", "Finance", false],
  ["Dungeon Deck", "Rogue Cards", "Card", true],
  ["Lingo Leap", "Inkwell", "Education", false],
  ["FitStack", "Rep Labs", "Health & Fitness", false],
  ["Roomly", "Nest Design", "Lifestyle", false],
  ["Kart Kings", "Nebula Games", "Racing", true],
  ["Scanly", "Deep Work Ltd", "Productivity", false],
  ["Wanderlog", "Outdoorsy", "Travel", false],
  ["Doodle Pets", "Bloom Studio", "Casual", true],
];

const PALETTES = [
  ["#c6f432", "#131412", "#f4f4f0"],
  ["#ff6b4a", "#1a1033", "#ffd6c9"],
  ["#4f7cff", "#0b1230", "#e3ebff"],
  ["#ffcf3f", "#2b1d00", "#fff6d6"],
  ["#22c58b", "#06261b", "#d9fbe9"],
  ["#e64fd0", "#22051e", "#fbe0f6"],
  ["#111111", "#f7f5f0", "#d9d4c7"],
  ["#7b5cff", "#f2efff", "#1b1340"],
  ["#ff3b5c", "#fff1f3", "#2a0610"],
  ["#00b3c7", "#00262b", "#d3f8fc"],
];

const HEADLINES = [
  "Sleep better tonight", "Every penny, accounted for", "Groceries in 15 minutes",
  "Learn 5 words a day", "Outrun the galaxy", "Your daily ritual",
  "Find your next trail", "Grow your dream farm", "Do one thing well",
  "Say it in a chirp", "Plan the week in a tap", "One more level",
  "Rated #1 by 2M users", "50% off this week", "New: Halloween event",
];

const STYLES = ["Product UI", "Illustration", "Photo", "3D", "Typography"] as const;
const LAYOUTS = ["Full bleed", "Split", "Device frame", "Panorama"] as const;
const TEXTS = ["None", "Brand only", "Headline", "Headline + body"] as const;
const TYPES = ["Sans serif", "Serif", "Display", "Handwritten"] as const;
const GOALS = ["Product", "Feature", "Social proof", "Offer", "Event"] as const;
const STOREFRONTS = ["us", "gb", "de", "jp", "fr", "br"];

// Small seeded PRNG so the gallery is stable between reloads.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function swatches(r: () => number, palette: string[]): Swatch[] {
  const a = 40 + Math.floor(r() * 25);
  const b = 15 + Math.floor(r() * 20);
  return [
    { hex: palette[0], pct: a },
    { hex: palette[1], pct: b },
    { hex: palette[2], pct: 100 - a - b },
  ];
}

const SPECS: Record<AssetKind, { w: number; h: number; perApp: number }> = {
  screenshot: { w: 1290, h: 2796, perApp: 3 },
  product_header: { w: 3840, h: 1646, perApp: 1 },
  search_banner: { w: 1290, h: 2796, perApp: 1 },
  paywall: { w: 1290, h: 2796, perApp: 0 },
};

export function buildSeed(): { apps: App[]; assets: Asset[] } {
  const r = rng(42);
  const apps: App[] = [];
  const assets: Asset[] = [];

  APPS.forEach(([name, developer, genre, isGame], i) => {
    const store = i % 5 === 4 ? "google_play" : "app_store";
    const storeId = store === "app_store" ? String(6400000000 + i * 7919) : `com.${slug(developer)}.${slug(name)}`;
    const palette = PALETTES[i % PALETTES.length];
    const app: App = {
      id: `${storeId}-${slug(name)}`,
      store,
      storeId,
      name,
      developer,
      genre,
      isGame,
      storeUrl:
        store === "app_store"
          ? `https://apps.apple.com/app/id${storeId}`
          : `https://play.google.com/store/apps/details?id=${storeId}`,
      iconColor: palette[0],
    };
    apps.push(app);

    (Object.keys(SPECS) as AssetKind[]).forEach((kind) => {
      const spec = SPECS[kind];
      for (let n = 0; n < spec.perApp; n++) {
        const day = 1 + Math.floor(r() * 27);
        assets.push({
          id: `${app.id}-${kind}-${n}`,
          appId: app.id,
          kind,
          storefront: pick(r, STOREFRONTS),
          orientation: spec.w > spec.h ? "landscape" : "portrait",
          width: spec.w,
          height: spec.h,
          imageUrl: null,
          headline: pick(r, HEADLINES),
          colors: swatches(r, palette),
          tags: {
            style: pick(r, STYLES),
            layout: pick(r, LAYOUTS),
            textOnArt: pick(r, TEXTS),
            typeStyle: pick(r, TYPES),
            character: r() > 0.7,
            goal: pick(r, GOALS),
          },
          capturedAt: `2026-10-${String(day).padStart(2, "0")}`,
        });
      }
    });
  });

  return { apps, assets };
}
