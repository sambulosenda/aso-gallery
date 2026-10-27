# ASO Gallery: plan

A browsable gallery of store creative: App Store / Google Play screenshots, Apple product page headers
(Google Play feature graphics), and search result banners. Reference: asoexamples.com.

## Features
**v1 (prototype, built)**
- Sections: Screenshots, Product headers, Search banners, Paywalls (coming soon)
- Filters in the URL (shareable): search, store, apps/games, dominant color, visual style, goal, genre, sort
- App detail page: header + tag sheet (style, layout, text on art, type, character, goal, size, colors), all assets, "More in genre"
- Submit page (paste store link) and weekly digest signup (UI only)

**v2 (make it real)**
- Ingestion: iTunes Lookup API for metadata + screenshots; scrape apps.apple.com per storefront for the product page header and
  in-app events; google-play-scraper for feature graphics. Daily cron per tracked app/storefront.
- Store images in R2/S3 with derived thumbnails; extract dominant colors with sharp + k-means.
- Auto-tag style/layout/text/goal with Claude vision; human review queue for low-confidence tags.
- Submit flow writes to a queue; email when live. Digest via Resend.

**The twist: creative history (chosen 2026-10-27, prototyped)**
- Every capture that differs from the last one becomes a new version of that app's header / screenshot set / search banner.
- Gallery shows the live version with a "N versions" badge; filter "Only apps that changed it", sort "Most changed".
- App page: per-kind timeline (v1, v2, …, live), "what changed" chips (copy, colors, style, layout, goal),
  drag-to-compare wipe for headers and side-by-side for screenshot sets. Selected version is in the URL so comparisons are linkable.
- /changes: "Recently changed" feed across all apps, filterable by kind.
- Real version: daily capture per app+storefront, perceptual hash (pHash) per image; a new hash = a new version. Diff chips come
  from comparing tags/colors/OCR text between versions.

**Later twists**
- Boards: save examples into collections and share them with a team.
- Competitor watch: follow apps and get a weekly email when their creative changes.
- Paywalls as a first-class collection (the reference site has it empty).

## Stack
Next.js (App Router, server components, filters as GET params) · Tailwind · Postgres (Neon or Supabase) with Drizzle ·
R2 for images · Vercel cron or a small worker for ingestion · Claude vision for tagging.

## Data model
- `apps`: id, store (app_store | google_play), store_id, name, developer, genre, is_game, icon_url, store_url
- `assets`: id, app_id, kind (screenshot | product_header | search_banner | paywall), storefront, device, orientation,
  width, height, image_url, headline (OCR), version, first_seen_at, last_seen_at (null = live), phash (new hash = new version)
- `asset_colors`: asset_id, hex, pct, lab_l, lab_a, lab_b (for color-distance search)
- `asset_tags`: asset_id, style, layout, text_on_art, type_style, character, goal, source (ai | human), confidence
- `submissions`: url, email, status
- later: `boards`, `board_items`, `follows`

The prototype mirrors these shapes in `lib/types.ts` with seeded sample data in `lib/seed.ts`.
