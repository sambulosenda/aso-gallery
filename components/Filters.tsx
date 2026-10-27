import type { Filters as F } from "@/lib/data";

const COLORS = ["ff3b30", "ff9500", "ffcc00", "34c759", "00c7be", "007aff", "5856d6", "af52de", "ff2d55", "a2845e", "8e8e93", "111111"];
const STYLES = ["Product UI", "Illustration", "Photo", "3D", "Typography"];
const GOALS = ["Product", "Feature", "Social proof", "Offer", "Event"];

// Plain GET form so filters live in the URL and are shareable without client JS.
export function Filters({ action, f, genres }: { action: string; f: F; genres: [string, number][] }) {
  return (
    <form action={action} className="space-y-6 text-sm">
      <input
        name="q"
        defaultValue={f.q}
        placeholder="Search apps, developers, genres"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 outline-none focus:border-accent"
      />

      <Group title="Store">
        <Radio name="store" value="" label="Both" current={f.store} />
        <Radio name="store" value="app_store" label="App Store" current={f.store} />
        <Radio name="store" value="google_play" label="Google Play" current={f.store} />
      </Group>

      <Group title="Type">
        <Radio name="type" value="" label="Apps and games" current={f.type} />
        <Radio name="type" value="apps" label="Apps" current={f.type} />
        <Radio name="type" value="games" label="Games" current={f.type} />
      </Group>

      <Group title="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={f.color === c} className="peer sr-only" />
              <span className="block h-6 w-6 rounded-full ring-offset-2 ring-offset-ink peer-checked:ring-2 peer-checked:ring-accent" style={{ background: `#${c}` }} />
            </label>
          ))}
        </div>
      </Group>

      <Group title="Visual style">
        <Select name="style" options={STYLES} current={f.style} />
      </Group>

      <Group title="Goal">
        <Select name="goal" options={GOALS} current={f.goal} />
      </Group>

      <Group title="Genre">
        <div className="max-h-56 space-y-1 overflow-auto pr-1">
          <Radio name="genre" value="" label="All genres" current={f.genre} />
          {genres.map(([g, n]) => (
            <Radio key={g} name="genre" value={g} label={g} count={n} current={f.genre} />
          ))}
        </div>
      </Group>

      <Group title="Sort">
        <Radio name="sort" value="" label="Newest" current={f.sort} />
        <Radio name="sort" value="name" label="App name" current={f.sort} />
      </Group>

      <div className="flex gap-2">
        <button className="flex-1 rounded-lg bg-accent px-3 py-2 font-semibold text-ink">Apply</button>
        <a href={action} className="rounded-lg border border-line px-3 py-2 text-muted hover:text-white">Reset</a>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

function Radio({ name, value, label, current, count }: { name: string; value: string; label: string; current?: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="radio" name={name} value={value} defaultChecked={(current ?? "") === value} className="accent-[#c6f432]" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-muted">{count}</span>}
    </label>
  );
}

function Select({ name, options, current }: { name: string; options: string[]; current?: string }) {
  return (
    <select name={name} defaultValue={current ?? ""} className="w-full rounded-lg border border-line bg-panel px-2 py-2">
      <option value="">Any</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
