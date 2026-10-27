import type { Swatch } from "./types";

// The color filter's swatches. scripts/build-d1.ts precomputes which of these
// each asset matches, so the gallery can filter by color in SQL.
export const COLORS: [string, string][] = [
  ["ff3b30", "Red"], ["ff9500", "Orange"], ["ffcc00", "Yellow"], ["34c759", "Green"], ["00c7be", "Teal"], ["007aff", "Blue"],
  ["5856d6", "Indigo"], ["af52de", "Purple"], ["ff2d55", "Pink"], ["a2845e", "Brown"], ["8e8e93", "Gray"], ["111111", "Black"],
];

// Rough perceptual distance in RGB space; good enough for "find blue-ish headers".
function colorDistance(a: string, b: string) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.replace("#", "").padStart(6, "0").slice(i - 1, i + 1), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  return Math.sqrt(2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2);
}

// Filter swatches (hex without #) that any prominent color in `colors` is close to.
export function matchingSwatches(colors: Swatch[]) {
  return COLORS.map(([hex]) => hex).filter((hex) => colors.some((c) => c.pct >= 15 && colorDistance(c.hex, hex) < 260));
}
