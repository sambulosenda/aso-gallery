import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon, Art } from "@/components/Art";
import { History, versionRange } from "@/components/History";
import { getApp, relatedApps } from "@/lib/data";
import { KINDS, type AssetKind } from "@/lib/types";

const ORDER: AssetKind[] = ["product_header", "screenshot", "search_banner"];
const NOUN: Partial<Record<AssetKind, string>> = { product_header: "header", screenshot: "screenshot set", search_banner: "search banner" };

// Light swatches need dark hex labels.
function labelColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? "#111" : "#fff";
}

export default async function AppPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const found = await getApp(id);
  if (!found) notFound();
  const { app, assets, history } = found;
  const header = assets.find((a) => a.kind === "product_header");
  const headerVersion = history.product_header?.at(-1);
  // The spec strip describes the header when there is one, else the first live screenshot.
  const lead = header ?? assets.find((a) => a.kind === "screenshot");
  const related = await relatedApps(app, 8);
  const storeName = app.store === "app_store" ? "App Store" : "Google Play";

  // Selected version per kind lives in the URL (?product_header=2) so a comparison can be linked.
  const hrefFor = (kind: AssetKind) => (v: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1]));
    next.set(kind, String(v));
    return `/app/${app.id}?${next}#${kind}-v${v}`;
  };

  const specs = {
    ...(lead?.tags && {
      Style: lead.tags.style, Layout: lead.tags.layout, "Text on art": lead.tags.textOnArt,
      Type: lead.tags.typeStyle, Character: lead.tags.character ? "Yes" : "No", Goal: lead.tags.goal,
    }),
    Storefront: (lead?.storefront ?? "us").toUpperCase(),
    ...(header && { "Header size": `${header.width} × ${header.height}` }),
    ...(headerVersion && { "Header live": versionRange(headerVersion) }),
  };

  return (
    <article>
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 pt-8 text-sm text-muted">
        <Link href="/screenshots" className="text-soft hover:text-fg">Gallery</Link><span aria-hidden>/</span>
        <Link href={`/screenshots?genre=${encodeURIComponent(app.genre)}`} className="text-soft hover:text-fg">{app.genre}</Link><span aria-hidden>/</span>
        <span className="text-fg">{app.name}</span>
      </nav>

      {header && (
        <div className="relative mt-6 overflow-hidden rounded-[28px] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_40px_80px_-40px_rgba(0,0,0,0.9)]">
          <Art asset={header} app={app} />
          {headerVersion && (
            <span className="eyebrow absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-fg backdrop-blur">
              {header.width} × {header.height} · Live since {versionRange(headerVersion).split(" – ")[0]}
            </span>
          )}
        </div>
      )}

      <section className="flex flex-wrap items-center justify-between gap-8 pt-10">
        <div className="flex min-w-0 items-center gap-6">
          <AppIcon app={app} size={96} />
          <div className="min-w-0">
            <h1 className="text-[clamp(44px,7vw,96px)] font-semibold leading-[0.9] tracking-[-0.05em]">{app.name}</h1>
            <p className="mt-2.5 text-[17px] text-soft">{app.developer} · {app.genre} · {app.store === "app_store" ? "iOS" : "Android"}</p>
          </div>
        </div>
        <a href={app.storeUrl} target="_blank" rel="noreferrer" className="flex h-12 items-center rounded-full bg-fg px-6 text-[15px] font-semibold text-ink hover:bg-accent">
          View on {storeName}
        </a>
      </section>

      <section aria-label="Details" className="pt-10">
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] border-y border-line">
          {Object.entries(specs).map(([k, v]) => (
            <div key={k} className="py-5 pr-5">
              <dt className="eyebrow text-muted">{k}</dt>
              <dd className="mt-2 text-[17px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {lead && lead.colors.length > 0 && (
          <div className="mt-5 flex h-10 overflow-hidden rounded-[10px]" aria-label="Palette">
            {lead.colors.map((c) => (
              <span key={c.hex} title={`${c.hex} ${c.pct}%`} className="flex min-w-0 items-end overflow-hidden px-2 pb-1.5 font-mono text-[10px]" style={{ background: c.hex, flexGrow: c.pct, color: labelColor(c.hex) }}>
                {c.pct >= 8 && c.hex.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </section>

      {ORDER.map((kind) => {
        const versions = history[kind];
        if (!versions?.length) return null;
        return (
          <History
            key={kind}
            app={app}
            versions={versions}
            title={KINDS.find((k) => k.kind === kind)!.label}
            noun={NOUN[kind]!}
            selected={Number(sp[kind]) || versions.length}
            hrefFor={hrefFor(kind)}
          />
        );
      })}

      {related.length > 0 && (
        <section className="pt-28">
          <h2 className="mb-7 text-[32px] font-semibold tracking-[-0.035em]">More in {app.genre}</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/app/${r.id}`} className="flex items-center gap-3.5 rounded-[18px] border border-line bg-panel p-3.5 transition hover:border-accent">
                  <AppIcon app={r} size={48} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="block truncate text-[13px] text-muted">{r.developer}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
