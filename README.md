# ASO Gallery

Gallery of App Store creative (screenshots, product page headers, search result cards) with a twist: it keeps
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
- a perceptual hash and dominant colors for each image (`sharp`)

When a hash differs from the live version, the live version is closed and a new one starts today. Running it
daily builds the history; `.github/workflows/ingest.yml` does that at 06:17 UTC and commits the catalog.

```bash
npm run ingest -- --app 571800810 --country us   # one app
npm run ingest -- --dry-run                       # don't write
```

To track another app, add its App Store id and storefront to `data/tracked.json`.
