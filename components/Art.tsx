// Placeholder artwork rendered from an asset's palette and headline.
// When real images are ingested, render <Image src={asset.imageUrl}> instead.
import type { App, Asset } from "@/lib/types";

function readable(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#111" : "#fff";
}

function Phone({ screen, accent, className = "" }: { screen: string; accent: string; className?: string }) {
  return (
    <div className={`rounded-[18%/8%] border-[3px] border-black/70 p-[4%] shadow-xl ${className}`} style={{ background: screen }}>
      <div className="mb-[8%] h-[3%] w-1/3 mx-auto rounded-full bg-black/40" />
      <div className="space-y-[6%]">
        <div className="h-3 w-3/4 rounded" style={{ background: accent }} />
        <div className="h-2 w-1/2 rounded bg-black/20" />
        <div className="aspect-square w-full rounded-lg" style={{ background: accent, opacity: 0.35 }} />
        <div className="h-2 w-2/3 rounded bg-black/20" />
        <div className="h-2 w-1/3 rounded bg-black/20" />
      </div>
    </div>
  );
}

export function Screenshot({ asset }: { asset: Asset }) {
  const [bg, ink, screen] = asset.colors.map((c) => c.hex);
  return (
    <div className="relative aspect-[1290/2796] w-full overflow-hidden" style={{ background: bg }}>
      <p className="px-[10%] pt-[12%] text-center text-[clamp(11px,1.4vw,18px)] font-bold leading-tight" style={{ color: readable(bg) }}>
        {asset.headline}
      </p>
      <Phone screen={screen} accent={ink} className="absolute left-[14%] top-[30%] w-[72%] aspect-[9/19]" />
    </div>
  );
}

export function ProductHeader({ asset, app }: { asset: Asset; app: App }) {
  const [bg, ink, screen] = asset.colors.map((c) => c.hex);
  return (
    <div className="relative aspect-[3840/1646] w-full overflow-hidden" style={{ background: `linear-gradient(120deg, ${bg}, ${ink})` }}>
      <div className="absolute left-[7%] top-1/2 -translate-y-1/2 w-[48%]">
        <p className="text-[clamp(9px,1vw,13px)] uppercase tracking-widest opacity-70" style={{ color: readable(bg) }}>{app.name}</p>
        <p className="mt-1 text-[clamp(14px,2.2vw,30px)] font-extrabold leading-[1.05]" style={{ color: readable(bg) }}>{asset.headline}</p>
      </div>
      <Phone screen={screen} accent={bg} className="absolute right-[12%] top-[14%] w-[16%] aspect-[9/19] rotate-6" />
      <Phone screen={screen} accent={ink} className="absolute right-[26%] top-[24%] w-[14%] aspect-[9/19] -rotate-6 opacity-90" />
    </div>
  );
}

export function SearchBanner({ asset, app }: { asset: Asset; app: App }) {
  return (
    <div className="bg-white p-3 text-black">
      <div className="flex items-center gap-3">
        <AppIcon app={app} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{app.name}</p>
          <p className="truncate text-xs text-neutral-500">{app.genre}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-4 py-1 text-xs font-bold text-blue-600">Get</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-md">
            <Screenshot asset={{ ...asset, headline: i === 0 ? asset.headline : "", colors: rotate(asset.colors, i) }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function rotate<T>(xs: T[], n: number) {
  return [...xs.slice(n % xs.length), ...xs.slice(0, n % xs.length)];
}

export function AppIcon({ app, size = 40 }: { app: App; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[22%] font-bold"
      style={{ width: size, height: size, background: app.iconColor, color: readable(app.iconColor), fontSize: size * 0.45 }}
    >
      {app.name[0]}
    </div>
  );
}

export function Art({ asset, app }: { asset: Asset; app: App }) {
  if (asset.kind === "product_header") return <ProductHeader asset={asset} app={app} />;
  if (asset.kind === "search_banner") return <SearchBanner asset={asset} app={app} />;
  return <Screenshot asset={asset} />;
}
