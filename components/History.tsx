import Link from "next/link";
import { Art } from "@/components/Art";
import { Compare } from "@/components/Compare";
import { describeDiff, type Version } from "@/lib/data";
import type { App } from "@/lib/types";

export const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function versionRange(v: Version) {
  return `${fmt(v.firstSeenAt)} – ${v.lastSeenAt ? fmt(v.lastSeenAt) : "now"}`;
}

function daysLive(v: Version) {
  const end = v.lastSeenAt ? Date.parse(v.lastSeenAt + "T00:00:00Z") : Date.now();
  const days = Math.max(1, Math.round((end - Date.parse(v.firstSeenAt + "T00:00:00Z")) / 86_400_000));
  return `${v.lastSeenAt ? "" : "Live · "}${days} day${days === 1 ? "" : "s"}`;
}

// Changelog for one kind of creative, newest version first. Product headers
// also get a before/after wipe of `selected` against the version before it.
export function History({ app, versions, title, noun, selected, hrefFor }: {
  app: App;
  versions: Version[];
  title: string;
  noun: string; // what one version is called, e.g. "screenshot set"
  selected: number;
  hrefFor: (version: number) => string;
}) {
  const after = versions.find((v) => v.version === selected) ?? versions[versions.length - 1];
  const before = versions.find((v) => v.version === after.version - 1);
  const isHeader = after.kind === "product_header";
  // Header art is wide; a search card or a screenshot set reads best at phone-ish widths.
  const setGrid = (n: number) => (n > 1 || after.kind === "screenshot" ? "grid-cols-3 sm:grid-cols-5" : "max-w-xl");
  const count = versions.length;

  return (
    <section className="pt-28">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-edge pb-6">
        <div>
          <p className="eyebrow mb-3 text-accent">{title} history</p>
          <h2 className="text-[clamp(32px,4.4vw,60px)] font-semibold leading-[0.95] tracking-[-0.045em]">
            {count === 1 ? `1 ${noun} so far.` : `${count} ${noun}s since ${new Date(versions[0].firstSeenAt).getUTCFullYear()}.`}
          </h2>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-soft">
          Every capture that changes the {noun} becomes a new version.{isHeader && before ? " Drag the divider to compare." : ""}
        </p>
      </div>

      {isHeader && before && (
        <div className="mt-8">
          <Compare
            before={<Art asset={before.assets[0]} app={app} />}
            after={<Art asset={after.assets[0]} app={app} />}
            beforeLabel={`v${before.version} · ${versionRange(before)}`}
            afterLabel={`v${after.version} · ${versionRange(after)}`}
          />
        </div>
      )}

      <ol>
        {[...versions].reverse().map((v) => {
          const prev = versions.find((p) => p.version === v.version - 1);
          const live = v.lastSeenAt === null;
          const picked = v.version === after.version;
          return (
            <li key={v.version} id={`${v.kind}-v${v.version}`} className={`grid gap-6 border-b border-line py-8 md:grid-cols-[minmax(160px,1fr)_minmax(0,4fr)]`}>
              <div>
                <Link href={hrefFor(v.version)} scroll={false} className={`text-[28px] font-semibold tracking-[-0.04em] hover:text-accent ${live ? "text-accent" : picked ? "text-fg" : "text-soft"}`}>
                  v{v.version}
                </Link>
                <p className="mt-1 font-mono text-xs text-soft">{versionRange(v)}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">{daysLive(v)}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {prev
                    ? describeDiff(prev, v).map((d) => <li key={d} className="rounded-full bg-raised px-2.5 py-1 text-xs text-fg/90">{d}</li>)
                    : <li className="rounded-full bg-raised px-2.5 py-1 text-xs text-muted">First capture</li>}
                </ul>
              </div>
              <div className={`grid gap-2.5 ${setGrid(v.assets.length)} ${live ? "" : "opacity-80 transition hover:opacity-100"}`}>
                {v.assets.map((a) => (
                  <div key={a.id} className={`overflow-hidden ring-1 ring-line ${isHeader ? "rounded-2xl" : "rounded-xl"}`}><Art asset={a} app={app} /></div>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
