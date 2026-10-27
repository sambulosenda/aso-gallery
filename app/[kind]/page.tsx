import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon, Art } from "@/components/Art";
import { Filters } from "@/components/Filters";
import { galleryStats, genreCounts, listEntries, type Entry, type Filters as F } from "@/lib/data";
import { KINDS } from "@/lib/types";

const GRID: Record<string, string> = {
  screenshot: "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-5 gap-y-10",
  product_header: "grid-cols-1 lg:grid-cols-2 gap-5 gap-y-10",
  search_banner: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 gap-y-10",
  paywall: "grid-cols-2 sm:grid-cols-4 gap-5",
};

const HEADLINES: Record<string, [string, string]> = {
  screenshot: ["Every screenshot the best apps ship.", "And every one they replaced."],
  product_header: ["The first thing people see on a product page.", "Tracked every day."],
  search_banner: ["How apps look in search results.", "Before anyone taps."],
  paywall: ["The screens that make the money.", "Coming soon."],
};

const PAGE_SIZE = 120;
const DAY = 86_400_000;
// "New" badge for sets that changed in the last week.
function changedAgo(e: Entry) {
  if (e.versionCount < 2) return null;
  const days = Math.floor((Date.now() - Date.parse(e.firstSeenAt + "T00:00:00Z")) / DAY);
  if (days > 7) return null;
  return days < 1 ? "today" : `${days}d ago`;
}

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
  const { page: pageParam, ...rest } = raw;
  const f: F = Object.fromEntries(Object.entries(rest).filter(([, v]) => v)) as F;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const [{ entries: shown, total }, stats, genres] = await Promise.all([
    listEntries(def.kind, f, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    galleryStats(def.kind),
    genreCounts(def.kind),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const qs = new URLSearchParams({ ...(f as Record<string, string>), ...(n > 1 ? { page: String(n) } : {}) }).toString();
    return `/${slug}${qs ? `?${qs}` : ""}`;
  };
  const [lead, tail] = HEADLINES[def.kind];

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-10 pb-14 pt-16 md:pt-24">
        <div className="max-w-[1040px]">
          <p className="eyebrow mb-5 text-accent">{def.label} · captured daily from the App Store and Google Play</p>
          <h1 className="text-[clamp(40px,5.6vw,84px)] font-semibold leading-[0.95] tracking-[-0.045em]">
            {lead} <span className="text-[#6e6e6a]">{tail}</span>
          </h1>
        </div>
        <dl className="grid grid-cols-3 gap-x-10 gap-y-2">
          <dt className="eyebrow text-muted">Apps</dt>
          <dt className="eyebrow text-muted">Creatives</dt>
          <dt className="eyebrow text-muted">Changes</dt>
          <dd className="text-[32px] font-semibold tracking-[-0.03em]">{stats.apps.toLocaleString("en-US")}</dd>
          <dd className="text-[32px] font-semibold tracking-[-0.03em]">{stats.creatives.toLocaleString("en-US")}</dd>
          <dd className="text-[32px] font-semibold tracking-[-0.03em] text-accent">{stats.changes.toLocaleString("en-US")}</dd>
        </dl>
      </section>

      <div className="z-10 md:sticky md:top-16 -mx-2 px-2 pb-2 pt-1">
        <Filters action={`/${slug}`} f={f} genres={genres} />
      </div>
      <p className="mt-4 font-mono text-xs text-muted">{total.toLocaleString("en-US")} results</p>

      <section aria-label={def.label} className="pt-6">
        {def.kind === "paywall" ? (
          <Empty>Nothing here yet. Paywalls are the next collection we&apos;re building.</Empty>
        ) : total === 0 ? (
          <Empty>No matches. Try loosening a filter.</Empty>
        ) : (
          <ul className={`grid ${GRID[def.kind]}`}>
            {shown.map((e) => {
              const ago = changedAgo(e);
              return (
                <li key={e.id}>
                  <Link href={`/app/${e.app.id}${e.versionCount > 1 ? `?${e.kind}=${e.version}` : ""}`} className="group block">
                    <div className={`relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_60px_-30px_rgba(0,0,0,0.9)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_0_1px_#c6f432,0_40px_70px_-30px_rgba(0,0,0,0.9)] ${e.kind === "screenshot" ? "rounded-2xl" : "rounded-[20px]"}`}>
                      <Art asset={e} app={e.app} />
                      {ago && <span className="eyebrow absolute bottom-2.5 left-2.5 rounded-full bg-accent px-2 py-1 text-[10px] text-ink">New · {ago}</span>}
                    </div>
                    <div className="mt-3.5 flex items-center gap-2.5">
                      <AppIcon app={e.app} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold tracking-[-0.01em] group-hover:text-accent">{e.app.name}</span>
                        <span className="block truncate text-xs text-muted">{e.app.genre} · {e.app.store === "app_store" ? "iOS" : "Play"} · {e.storefront.toUpperCase()}</span>
                      </span>
                      <span className="rounded-md border border-edge px-1.5 py-0.5 font-mono text-[11px] text-soft" title={`${e.versionCount} version${e.versionCount === 1 ? "" : "s"}`}>v{e.versionCount}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {pageCount > 1 && (
          <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-6 font-mono text-xs text-soft">
            {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-full border border-edge px-4 py-2 hover:text-fg">← Prev</Link> : <span className="px-4 py-2 opacity-40">← Prev</span>}
            <span>Page {page} of {pageCount.toLocaleString("en-US")}</span>
            {page < pageCount ? <Link href={pageHref(page + 1)} className="rounded-full border border-edge px-4 py-2 hover:text-fg">Next →</Link> : <span className="px-4 py-2 opacity-40">Next →</span>}
          </nav>
        )}
      </section>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl border border-dashed border-edge p-16 text-center text-soft">{children}</p>;
}
