# ASO Gallery

Gallery of App Store and Google Play creative (screenshots, product page headers, search result cards) with a twist: it keeps
every version, so you can see how an app's creative changed over time. See PLAN.md for the roadmap.

```bash
npm install
npm run dev     # http://localhost:3000
npm test
```

## Data

Until `data/catalog.json` exists the site shows deterministic sample data (`lib/seed.ts`).

`npm run ingest` captures every app in `data/tracked.json` and writes `data/catalog.json`:

- metadata and iPhone screenshots from the iTunes Lookup API
- the product page header, scraped from `apps.apple.com/{country}/app/id{id}` (the API doesn't expose it)
- the search result card, derived from the first three screenshots
- for Google Play apps (`"store": "google_play"`), metadata, phone screenshots and the feature graphic (shown as the
  product header) from the data embedded in `play.google.com/store/apps/details?id={package}`. Play has no search
  result card.
- a perceptual hash and dominant colors for each image (`sharp`)

When a hash differs from the live version, the live version is closed and a new one starts today. Running it
daily builds the history; `.github/workflows/ingest.yml` does that at 06:17 UTC and commits the catalog.

```bash
npm run ingest -- --app 571800810 --country us   # one app
npm run ingest -- --app com.calm.android         # one Google Play app
npm run ingest -- --store google_play            # one store only
npm run ingest -- --dry-run                       # don't write
npm run inspect -- com.calm.android              # what a Play page's data holds, if parsing breaks
```

### Tags

Colors come from ingest. Everything else the filters use (style, layout, text on art, type, character, goal) plus the
headline comes from `npm run tag`, which sends each live, untagged image to Claude (downscaled to 768px) and asks for
those fields as structured output. Only new or changed creative is untagged, so daily runs are small; the first run
over the whole catalog is the expensive one.

```bash
npm run tag -- --dry-run --limit 5     # print tags for 5 images, write nothing
npm run tag -- --limit 500             # tag at most 500 images
TAG_MODEL=claude-opus-5-5 npm run tag  # use another model (default claude-haiku-5-5)
npm run compare-tags -- --limit 50     # tag 50 images with two models, compare agreement and cost
```

`.github/workflows/tag.yml` runs it after each daily capture when the repository has an `ANTHROPIC_API_KEY` secret
(set the `TAG_MODEL` repository variable to change the model).

To track another app, add its App Store id or Google Play package (with `"store": "google_play"`) and storefront to
`data/tracked.json`.

`npm run import:asoexamples` adds every app featured on asoexamples.com, App Store and Google Play (crawled
politely, one page per second), and picks a storefront each one is sold in. The "Import apps" workflow runs it on GitHub, where Apple and the
site are reachable.
