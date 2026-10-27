"use client";

import { useState } from "react";

// Before/after wipe: drag the handle to reveal the newer version over the older one.
export function Compare({ before, after, beforeLabel, afterLabel }: {
  before: React.ReactNode;
  after: React.ReactNode;
  beforeLabel: string;
  afterLabel: string;
}) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative select-none overflow-hidden rounded-[20px] ring-1 ring-line">
      <div>{before}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>{after}</div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent" style={{ left: `${pos}%` }} />
      <div className="pointer-events-none absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-ink shadow-xl" style={{ left: `${pos}%` }}>
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 6-6 6 6 6" /><path d="m15 6 6 6-6 6" /></svg>
      </div>
      <span className="eyebrow absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-fg backdrop-blur">{beforeLabel}</span>
      <span className="eyebrow absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-accent backdrop-blur">{afterLabel}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
