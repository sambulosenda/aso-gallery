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
    <div className="relative select-none overflow-hidden rounded-xl ring-1 ring-line">
      <div>{before}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>{after}</div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
      <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{beforeLabel}</span>
      <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{afterLabel}</span>
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
