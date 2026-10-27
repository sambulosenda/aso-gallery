import Link from "next/link";
import { Art } from "@/components/Art";
import { Compare } from "@/components/Compare";
import { describeDiff, type Version } from "@/lib/data";
import type { App } from "@/lib/types";

export const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function versionRange(v: Version) {
  return `${fmt(v.firstSeenAt)} – ${v.lastSeenAt ? fmt(v.lastSeenAt) : "now"}`;
}

// Timeline for one kind of creative. `selected` is the version shown on the
// right of the compare; the one before it is shown on the left.
export function History({ app, versions, title, selected, hrefFor }: {
  app: App;
  versions: Version[];
  title: string;
  selected: number;
  hrefFor: (version: number) => string;
}) {
  const after = versions.find((v) => v.version === selected) ?? versions[versions.length - 1];
  const before = versions.find((v) => v.version === after.version - 1);
  const isHeader = after.kind === "product_header";
  // Header art is wide; a search card or a screenshot set reads best at phone-ish widths.
  const setGrid = (n: number) => (n > 3 ? "grid-cols-5" : n > 1 ? "grid-cols-3" : "max-w-sm");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title} history</h2>
        <p className="text-sm text-muted">{versions.length} version{versions.length === 1 ? "" : "s"} since {fmt(versions[0].firstSeenAt)}</p>
      </div>

      <ol className="flex gap-2 overflow-x-auto pb-1">
        {versions.map((v) => (
          <li key={v.version}>
            <Link
              href={hrefFor(v.version)}
              scroll={false}
              className={`block whitespace-nowrap rounded-full border px-3 py-1 text-xs ${v.version === after.version ? "border-accent text-white" : "border-line text-muted hover:text-white"}`}
            >
              v{v.version} · {fmt(v.firstSeenAt)}{v.lastSeenAt === null && " · live"}
            </Link>
          </li>
        ))}
      </ol>

      {before ? (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-muted">What changed in v{after.version}:</span>
            {describeDiff(before, after).map((d) => (
              <span key={d} className="rounded bg-panel px-2 py-0.5">{d}</span>
            ))}
          </div>
          {isHeader ? (
            <Compare
              before={<Art asset={before.assets[0]} app={app} />}
              after={<Art asset={after.assets[0]} app={app} />}
              beforeLabel={`v${before.version} · ${versionRange(before)}`}
              afterLabel={`v${after.version} · ${versionRange(after)}`}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {[before, after].map((v) => (
                <div key={v.version}>
                  <p className="mb-2 text-xs text-muted">v{v.version} · {versionRange(v)}</p>
                  <div className={`grid gap-2 ${setGrid(v.assets.length)}`}>
                    {v.assets.map((a) => <div key={a.id} className="overflow-hidden rounded-lg ring-1 ring-line"><Art asset={a} app={app} /></div>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="mb-2 text-xs text-muted">v{after.version} · {versionRange(after)} · first version we captured</p>
          <div className={`grid gap-2 ${setGrid(after.assets.length)} ${after.assets.length > 1 && after.assets.length <= 3 ? "md:w-1/2" : ""}`}>
            {after.assets.map((a) => <div key={a.id} className="overflow-hidden rounded-lg ring-1 ring-line"><Art asset={a} app={app} /></div>)}
          </div>
        </div>
      )}
    </section>
  );
}
