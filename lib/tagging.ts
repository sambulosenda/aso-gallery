// Auto-tagging: Claude looks at each captured image and picks style, layout,
// text, type, character and goal from the same vocabularies the filters use,
// and reads off the headline. Colors don't need a model; ingest already
// extracts them (lib/image.ts).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import sharp from "sharp";
import { z } from "zod";
import { fetchImage } from "./image";
import { TAG_VALUES, type Asset, type Tags } from "./types";

export const DEFAULT_MODEL = "claude-opus-5-5";

// Long side of the image we send. Tags don't need full resolution, and image
// tokens scale with pixel count (a 384×768 screenshot is ~400 tokens).
const MAX_SIDE = 768;

export const TagResult = z.object({
  headline: z.string().describe("The main marketing headline on the image, verbatim. Empty if there is none."),
  style: z.enum(TAG_VALUES.style),
  layout: z.enum(TAG_VALUES.layout),
  textOnArt: z.enum(TAG_VALUES.textOnArt),
  typeStyle: z.enum(TAG_VALUES.typeStyle),
  character: z.boolean(),
  goal: z.enum(TAG_VALUES.goal),
});
export type TagResult = z.infer<typeof TagResult>;

const KIND_LABEL: Record<Asset["kind"], string> = {
  screenshot: "an app store screenshot",
  product_header: "an app store product page header (on Google Play, the feature graphic)",
  search_banner: "the first screenshot shown in an App Store search result",
  paywall: "an in-app paywall screen",
};

export const SYSTEM = `You tag app store marketing creative for a searchable inspiration gallery. Designers filter by these tags, so pick the value that best describes what a designer would see at a glance.

- style: the dominant visual treatment. "Product UI" when real app screens carry the image; "Illustration" for drawn or vector art; "Photo" for photography; "3D" for rendered 3D objects or characters; "Typography" when large text is the main visual.
- layout: "Full bleed" when the art fills the frame; "Split" when it divides into distinct panels or text and art halves; "Device frame" when app UI sits inside a drawn phone or tablet; "Panorama" when the image visibly continues into the neighbouring screenshot.
- textOnArt: "None", "Brand only" (just a logo or app name), "Headline" (one marketing line), or "Headline + body" (a headline plus supporting copy).
- typeStyle: the headline's typeface family. If there's no text, pick the closest match to any lettering, defaulting to "Sans serif".
- character: true when a mascot, illustrated character or person is a focal point.
- goal: what the image sells. "Product" (the app overall), "Feature" (one specific capability), "Social proof" (ratings, awards, press, user counts), "Offer" (price, discount, free trial), "Event" (season, holiday, launch or live event).
- headline: the main marketing line, copied verbatim in its original language; empty when there is none.`;

export function tagsOf(r: TagResult): Tags {
  const { headline: _headline, ...tags } = r;
  return tags;
}

// Downscaled JPEG for the request.
export async function prepareImage(url: string): Promise<string> {
  const buf = await sharp(await fetchImage(url))
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80 })
    .toBuffer();
  return buf.toString("base64");
}

export type Tagged = { result: TagResult | null; inputTokens: number; outputTokens: number };

export async function tagImage(client: Anthropic, asset: Asset, appName: string, model = DEFAULT_MODEL): Promise<Tagged> {
  const data = await prepareImage(asset.imageUrl!);
  const response = await client.beta.messages.parse({
    model,
    max_tokens: 16000,
    // Refusals are unlikely on store artwork; if one happens, the server reruns it on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(TagResult) },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
          { type: "text", text: `This is ${KIND_LABEL[asset.kind]} for "${appName}". Tag it.` },
        ],
      },
    ],
  });
  const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  if (response.stop_reason === "refusal") return { result: null, ...usage };
  return { result: response.parsed_output ?? null, ...usage };
}

// Live assets that still need tags. Search banners reuse the first
// screenshot's image, so they come last and can copy its result.
export function untagged(assets: Asset[]): Asset[] {
  const order: Record<Asset["kind"], number> = { screenshot: 0, product_header: 1, paywall: 2, search_banner: 3 };
  return assets
    .filter((a) => a.lastSeenAt === null && a.tags === null && a.imageUrl)
    .sort((a, b) => order[a.kind] - order[b.kind]);
}

// Applies a result to an asset; the headline only fills an empty one.
export function withTags(asset: Asset, r: TagResult): Asset {
  return { ...asset, tags: tagsOf(r), headline: asset.headline || r.headline };
}
