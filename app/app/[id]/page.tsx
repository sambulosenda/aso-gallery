import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon, Art } from "@/components/Art";
import { getApp, relatedApps } from "@/lib/data";
import { KINDS } from "@/lib/types";

export default async function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getApp(id);
  if (!found) notFound();
  const { app, assets } = found;
  const header = assets.find((a) => a.kind === "product_header");
  const related = relatedApps(app);

  return (
    <article className="space-y-10">
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

      {header && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-xl ring-1 ring-line"><Art asset={header} app={app} /></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:grid-cols-1">
            {Object.entries({
              Style: header.tags.style, Layout: header.tags.layout, "Text on art": header.tags.textOnArt,
              Type: header.tags.typeStyle, Character: header.tags.character ? "Yes" : "No", Goal: header.tags.goal,
              "Source size": `${header.width} × ${header.height}`, Captured: header.capturedAt,
            }).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-line py-1"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>
            ))}
            <div className="col-span-2 flex h-6 overflow-hidden rounded lg:col-span-1">
              {header.colors.map((c) => <span key={c.hex} title={`${c.hex} ${c.pct}%`} style={{ background: c.hex, width: `${c.pct}%` }} />)}
            </div>
          </dl>
        </div>
      )}

      {KINDS.filter((k) => k.kind !== "product_header").map((k) => {
        const list = assets.filter((a) => a.kind === k.kind);
        if (!list.length) return null;
        return (
          <section key={k.slug}>
            <h2 className="mb-3 text-lg font-semibold">{k.label}</h2>
            <div className={`grid gap-4 ${k.kind === "screenshot" ? "grid-cols-3 sm:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
              {list.map((a) => <div key={a.id} className="overflow-hidden rounded-xl ring-1 ring-line"><Art asset={a} app={app} /></div>)}
            </div>
          </section>
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
