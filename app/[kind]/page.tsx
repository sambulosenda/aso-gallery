import Link from "next/link";
import { notFound } from "next/navigation";
import { Art } from "@/components/Art";
import { Filters } from "@/components/Filters";
import { genreCounts, listEntries, type Filters as F } from "@/lib/data";
import { KINDS } from "@/lib/types";

const GRID: Record<string, string> = {
  screenshot: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  product_header: "grid-cols-1 md:grid-cols-2",
  search_banner: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  paywall: "grid-cols-2 sm:grid-cols-4",
};

export function generateStaticParams() {
  return KINDS.map((k) => ({ kind: k.slug }));
}

export default async function Gallery({ params, searchParams }: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { kind: slug } = await params;
  const def = KINDS.find((k) => k.slug === slug);
  if (!def) notFound();

  const raw = await searchParams;
  const f: F = Object.fromEntries(Object.entries(raw).filter(([, v]) => v)) as F;
  const entries = listEntries(def.kind, f);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Filters action={`/${slug}`} f={f} genres={genreCounts(def.kind)} />
      </aside>
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">{def.label}</h1>
          <p className="text-sm text-muted">{entries.length} examples</p>
        </div>
        {def.kind === "paywall" ? (
          <p className="rounded-xl border border-dashed border-line p-10 text-center text-muted">Nothing here yet. This collection is coming soon.</p>
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-10 text-center text-muted">No matches. Try loosening a filter.</p>
        ) : (
          <ul className={`grid gap-4 ${GRID[def.kind]}`}>
            {entries.map((e) => (
              <li key={e.id}>
                <Link href={`/app/${e.app.id}`} className="group block">
                  <div className="overflow-hidden rounded-xl ring-1 ring-line transition group-hover:ring-accent">
                    <Art asset={e} app={e.app} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{e.app.name}</span>
                    <span className="shrink-0 text-xs text-muted">{e.app.store === "app_store" ? "iOS" : "Play"} · {e.storefront.toUpperCase()}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
