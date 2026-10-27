# ASO Gallery

Prototype gallery of App Store creative. See PLAN.md for features, stack and data model.

```bash
npm install
npm run dev   # http://localhost:3000
```

Data is deterministic sample data (`lib/seed.ts`) with art rendered from each asset's palette, so it runs with no
database or network. Swap `lib/data.ts` for real queries when ingestion lands.
