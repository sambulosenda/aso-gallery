import Link from "next/link";
import { AppIcon, Art } from "@/components/Art";
import { fmt } from "@/components/History";
import { listChanges, type Version } from "@/lib/data";
import { KINDS, type App, type AssetKind } from "@/lib/types";

const TABS: { kind?: AssetKind; label: string }[] = [
  { label: "All" },
  { kind: "product_header", label: "Product headers" },
  { kind: "screenshot", label: "Screenshots" },
  { kind: "search_banner", label: "Search banners" },
];

export default async function Changes({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const active = TABS.find((t) => t.kind === kind) ?? TABS[0];
  const changes = await listChanges(active.kind);

  return (
    <div>
      <section className="flex flex-wrap items-end justify-between gap-8 pb-12 pt-16 md:pt-24">
        <div className="max-w-[860px]">
          <p className="eyebrow mb-5 text-accent">Recently changed</p>
          <h1 className="text-[clamp(40px,6.4vw,92px)] font-semibold leading-[0.95] tracking-[-0.045em]">
            What changed on the stores. <span className="text-[#6e6e6a]">Side by side.</span>
          </h1>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-soft">Every time an app swaps its header, screenshots or search banner, it shows up here.</p>
      </section>

      <nav aria-label="Filter by creative" className="flex flex-wrap gap-1 text-sm">
        {TABS.map((t) => (
          <Link key={t.label} href={t.kind ? `/changes?kind=${t.kind}` : "/changes"}
            className={`rounded-full px-4 py-2.5 ${t === active ? "bg-fg font-semibold text-ink" : "border border-edge text-soft hover:text-fg"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {changes.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-edge p-16 text-center text-soft">No changes captured yet. They appear after the second daily capture that sees new artwork.</p>
      ) : (
        <ul className="mt-8 space-y-5">
          {changes.map((c) => (
            <li key={`${c.app.id}-${c.kind}-${c.after.version}`} className="rounded-3xl border border-line bg-panel p-5 md:p-8">
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <AppIcon app={c.app} size={44} />
                <div className="min-w-0">
                  <Link href={`/app/${c.app.id}?${c.kind}=${c.after.version}`} className="text-xl font-semibold tracking-[-0.02em] hover:text-accent">{c.app.name}</Link>
                  <p className="text-sm text-muted">
                    Changed its {KINDS.find((k) => k.kind === c.kind)!.label.toLowerCase().replace(/s$/, "")}{c.kind === "screenshot" && "s"} on {fmt(c.after.firstSeenAt)}
                  </p>
                </div>
                <ul className="ml-auto flex flex-wrap gap-1.5">
                  {c.diff.map((d) => <li key={d} className="rounded-full bg-raised px-2.5 py-1 text-xs">{d}</li>)}
                </ul>
              </div>
              <div className={`grid items-center gap-4 ${c.kind === "product_header" ? "md:grid-cols-[1fr_auto_1fr]" : "grid-cols-[1fr_auto_1fr] lg:w-3/4"}`}>
                <Side v={c.before} app={c.app} label={`v${c.before.version}`} />
                <span aria-hidden className="grid h-9 w-9 place-items-center justify-self-center rounded-full bg-accent text-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
                </span>
                <Side v={c.after} app={c.app} label={`v${c.after.version}${c.after.lastSeenAt === null ? " · live" : ""}`} accent />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Side({ v, app, label, accent }: { v: Version; app: App; label: string; accent?: boolean }) {
  return (
    <div>
      <p className={`eyebrow mb-2 ${accent ? "text-accent" : "text-muted"}`}>{label}</p>
      <div className={`grid gap-1.5 ${v.assets.length > 1 ? "grid-cols-3" : ""}`}>
        {v.assets.map((a) => <div key={a.id} className="overflow-hidden rounded-xl ring-1 ring-line"><Art asset={a} app={app} /></div>)}
      </div>
    </div>
  );
}
