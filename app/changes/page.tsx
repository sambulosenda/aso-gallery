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
  const changes = listChanges(active.kind);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recently changed</h1>
        <p className="text-muted">Every time an app swaps its header, screenshots or search banner, it shows up here.</p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        {TABS.map((t) => (
          <Link key={t.label} href={t.kind ? `/changes?kind=${t.kind}` : "/changes"}
            className={`rounded-full border px-3 py-1 ${t === active ? "border-accent" : "border-line text-muted hover:text-white"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <ul className="space-y-6">
        {changes.map((c) => (
          <li key={`${c.app.id}-${c.kind}-${c.after.version}`} className="rounded-xl border border-line p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <AppIcon app={c.app} size={32} />
              <Link href={`/app/${c.app.id}?${c.kind}=${c.after.version}`} className="font-semibold hover:text-accent">{c.app.name}</Link>
              <span className="text-sm text-muted">changed its {KINDS.find((k) => k.kind === c.kind)!.label.toLowerCase().replace(/s$/, "")}{c.kind === "screenshot" && "s"} on {fmt(c.after.firstSeenAt)}</span>
              <div className="ml-auto flex flex-wrap gap-1.5 text-xs">
                {c.diff.map((d) => <span key={d} className="rounded bg-panel px-2 py-0.5">{d}</span>)}
              </div>
            </div>
            <div className={`grid items-center gap-3 ${c.kind === "product_header" ? "md:grid-cols-[1fr_auto_1fr]" : "grid-cols-[1fr_auto_1fr] md:w-2/3"}`}>
              <Side v={c.before} app={c.app} />
              <span className="text-center text-muted">→</span>
              <Side v={c.after} app={c.app} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Side({ v, app }: { v: Version; app: App }) {
  return (
    <div className={`grid gap-1.5 ${v.assets.length > 1 ? "grid-cols-3" : ""}`}>
      {v.assets.map((a) => <div key={a.id} className="overflow-hidden rounded-lg ring-1 ring-line"><Art asset={a} app={app} /></div>)}
    </div>
  );
}
