"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KINDS } from "@/lib/types";

// Pill navigation; the current collection gets the raised pill.
export function Nav() {
  const path = usePathname();
  const pill = (href: string) =>
    `rounded-full px-3.5 py-2 transition-colors ${path === href || path.startsWith(`${href}/`) ? "bg-raised text-fg" : "text-soft hover:text-fg"}`;
  return (
    <nav aria-label="Collections" className="flex shrink-0 gap-1 text-sm">
      {KINDS.map((k) => <Link key={k.slug} href={`/${k.slug}`} className={pill(`/${k.slug}`)}>{k.label}</Link>)}
      <Link href="/changes" className={`${pill("/changes")} flex items-center gap-1.5 !text-accent`}>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />Recently changed
      </Link>
    </nav>
  );
}
