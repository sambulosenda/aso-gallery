import sharp from "sharp";
import { fetchWithRetry } from "./http";
import type { Swatch } from "./types";

export type Analysis = { width: number; height: number; hash: string; colors: Swatch[] };

export async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// 64-bit difference hash: robust to resizing and recompression, flips when the artwork changes.
export async function dHash(buf: Buffer): Promise<string> {
  const px = await sharp(buf).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let hex = "";
  for (let row = 0; row < 8; row++) {
    let byte = 0;
    for (let col = 0; col < 8; col++) byte = (byte << 1) | (px[row * 9 + col] > px[row * 9 + col + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

// Dominant colors by bucketing a thumbnail into a 4×4×4 RGB grid.
export async function dominantColors(buf: Buffer, max = 5): Promise<Swatch[]> {
  const px = await sharp(buf).removeAlpha().resize(64, 64, { fit: "fill" }).raw().toBuffer();
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 3) {
    const key = ((px[i] >> 6) << 4) | ((px[i + 1] >> 6) << 2) | (px[i + 2] >> 6);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++; bin.r += px[i]; bin.g += px[i + 1]; bin.b += px[i + 2];
    bins.set(key, bin);
  }
  const total = px.length / 3;
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((b) => ({ hex: `#${hex(b.r / b.n)}${hex(b.g / b.n)}${hex(b.b / b.n)}`, pct: Math.round((b.n / total) * 100) }))
    .filter((s) => s.pct > 0);
}

export async function analyze(url: string): Promise<Analysis> {
  const buf = await fetchImage(url);
  const meta = await sharp(buf).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0, hash: await dHash(buf), colors: await dominantColors(buf) };
}
