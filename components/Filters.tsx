"use client";

import type { Filters as F } from "@/lib/data";
import { COLORS } from "@/lib/palette";

const STYLES = ["Product UI", "Illustration", "Photo", "3D", "Typography"];
const GOALS = ["Product", "Feature", "Social proof", "Offer", "Event"];
const SORTS: [string, string][] = [["", "Newest"], ["changes", "Most changed"], ["name", "App name"]];

// Plain GET form so filters live in the URL and are shareable. Picking any
// option submits right away; typing in search waits for Enter.
export function Filters({ action, f, genres }: { action: string; f: F; genres: [string, number][] }) {
  const submitOnPick = (e: React.FormEvent<HTMLFormElement>) => {
    const t = e.target as HTMLInputElement;
    if (t.type !== "search") e.currentTarget.requestSubmit();
  };
  return (
    <form action={action} onChange={submitOnPick} className="flex flex-wrap items-center gap-2.5 rounded-[20px] border border-line bg-panel p-3 text-sm">
      <label className="flex h-11 min-w-0 flex-1 basis-56 items-center gap-2 rounded-full border border-edge bg-ink px-4 text-soft focus-within:border-accent">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="sr-only">Search</span>
        <input type="search" name="q" defaultValue={f.q} placeholder="Search apps, developers, genres" className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-muted" />
      </label>

      <fieldset className="flex gap-0.5 rounded-full bg-ink p-1">
        <legend className="sr-only">Store</legend>
        <Segment name="store" value="" label="All stores" current={f.store} />
        <Segment name="store" value="app_store" label="App Store" current={f.store} />
        <Segment name="store" value="google_play" label="Google Play" current={f.store} />
      </fieldset>

      <fieldset className="flex flex-wrap items-center gap-1.5 px-1.5">
        <legend className="sr-only">Color</legend>
        {COLORS.map(([hex, name]) => (
          <label key={hex} className="cursor-pointer" title={name}>
            <input type="radio" name="color" value={hex} defaultChecked={f.color === hex} className="peer sr-only" />
            <span className="sr-only">{name}</span>
            <span aria-hidden className="block h-[22px] w-[22px] rounded-full border-2 border-ink shadow-[0_0_0_1px_#2e2e33] transition peer-checked:shadow-[0_0_0_2px_#c6f432] peer-focus-visible:shadow-[0_0_0_2px_#c6f432]" style={{ background: `#${hex}` }} />
          </label>
        ))}
      </fieldset>

      <Menu label="Style" value={f.style}>
        <Option name="style" value="" label="Any style" current={f.style} />
        {STYLES.map((s) => <Option key={s} name="style" value={s} label={s} current={f.style} />)}
      </Menu>
      <Menu label="Goal" value={f.goal}>
        <Option name="goal" value="" label="Any goal" current={f.goal} />
        {GOALS.map((g) => <Option key={g} name="goal" value={g} label={g} current={f.goal} />)}
      </Menu>
      <Menu label="Genre" value={f.genre}>
        <div className="max-h-72 overflow-auto">
          <Option name="genre" value="" label="All genres" current={f.genre} />
          {genres.map(([g, n]) => <Option key={g} name="genre" value={g} label={g} count={n} current={f.genre} />)}
        </div>
      </Menu>
      <Menu label="Type" value={f.type === "apps" ? "Apps" : f.type === "games" ? "Games" : undefined}>
        <Option name="type" value="" label="Apps and games" current={f.type} />
        <Option name="type" value="apps" label="Apps" current={f.type} />
        <Option name="type" value="games" label="Games" current={f.type} />
      </Menu>

      <label className={`flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 ${f.changed === "1" ? "border-accent text-accent" : "border-edge text-soft hover:text-fg"}`}>
        <input type="checkbox" name="changed" value="1" defaultChecked={f.changed === "1"} className="accent-[#c6f432]" />
        Changed only
      </label>

      <div className="ml-auto flex items-center gap-2">
        <Menu label="Sort" value={SORTS.find(([v]) => v === (f.sort ?? ""))?.[1]} align="right">
          {SORTS.map(([v, l]) => <Option key={v} name="sort" value={v} label={l} current={f.sort} />)}
        </Menu>
        <a href={action} className="flex h-11 items-center rounded-full px-3 text-soft hover:text-fg">Reset</a>
      </div>
    </form>
  );
}

function Segment({ name, value, label, current }: { name: string; value: string; label: string; current?: string }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={(current ?? "") === value} className="peer sr-only" />
      <span className="block rounded-full px-3.5 py-2 text-[13px] font-medium text-soft transition peer-checked:bg-fg peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">{label}</span>
    </label>
  );
}

function Menu({ label, value, align = "left", children }: { label: string; value?: string; align?: "left" | "right"; children: React.ReactNode }) {
  return (
    <details className="group relative">
      <summary className={`flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[13px] font-medium ${value ? "border-accent text-fg" : "border-edge text-fg/90 hover:border-soft"}`}>
        {label} <span className="text-muted">{value ?? "Any"}</span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className={`absolute top-12 z-10 w-60 rounded-2xl border border-edge bg-raised p-1.5 shadow-2xl shadow-black/60 ${align === "right" ? "right-0" : "left-0"}`}>
        {children}
      </div>
    </details>
  );
}

function Option({ name, value, label, current, count }: { name: string; value: string; label: string; current?: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/5 has-[:checked]:text-accent">
      <input type="radio" name={name} value={value} defaultChecked={(current ?? "") === value} className="sr-only" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="font-mono text-xs text-muted">{count}</span>}
    </label>
  );
}
