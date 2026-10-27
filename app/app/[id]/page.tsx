import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon, Art } from "@/components/Art";
import { History, versionRange } from "@/components/History";
import { getApp, relatedApps } from "@/lib/data";
import { KINDS, type AssetKind } from "@/lib/types";

const ORDER: AssetKind[] = ["product_header", "screenshot", "search_banner"];

export default async function AppPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const found = getApp(id);
  if (!found) notFound();
  const { app, assets, history } = found;
  const header = assets.find((a) => a.kind === "product_header");
  const headerVersion = history.product_header?.at(-1);
  const related = relatedApps(app);

  // Selected version per kind lives in the URL (?product_header=2) so a comparison can be linked.
  const hrefFor = (kind: AssetKind) => (v: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1]));
    next.set(kind, String(v));
    return `/app/${app.id}?${next}`;
  };

  return (
    <article className="space-y-12">
      <div className="flex flex-wrap items-center gap-4">
        <AppIcon app={app} size={64} />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{app.name}</h1>
          <p className="text-muted">{app.developer} · {app.genre}</p>
        </div>
        <a href={app.storeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink">
          View on {app.store === "app_store" ? "App Store" : "Google Play"}
        </a>
      </div>

      {header && headerVersion && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-xl ring-1 ring-line"><Art asset={header} app={app} /></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:grid-cols-1">
            {Object.entries({
              Style: header.tags.style, Layout: header.tags.layout, "Text on art": header.tags.textOnArt,
              Type: header.tags.typeStyle, Character: header.tags.character ? "Yes" : "No", Goal: header.tags.goal,
              "Source size": `${header.width} × ${header.height}`, Live: versionRange(headerVersion),
            }).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-line py-1"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>
            ))}
            <div className="col-span-2 flex h-6 overflow-hidden rounded lg:col-span-1">
              {header.colors.map((c) => <span key={c.hex} title={`${c.hex} ${c.pct}%`} style={{ background: c.hex, width: `${c.pct}%` }} />)}
            </div>
          </dl>
        </div>
      )}

      {ORDER.map((kind) => {
        const versions = history[kind];
        if (!versions?.length) return null;
        return (
          <History
            key={kind}
            app={app}
            versions={versions}
            title={KINDS.find((k) => k.kind === kind)!.label}
            selected={Number(sp[kind]) || versions.length}
            hrefFor={hrefFor(kind)}
          />
        );
      })}

      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">More in {app.genre}</h2>
          <div className="flex flex-wrap gap-4">
            {related.map((r) => (
              <Link key={r.id} href={`/app/${r.id}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 hover:border-accent">
                <AppIcon app={r} size={28} /><span className="text-sm">{r.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
