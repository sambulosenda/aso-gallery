import type { Metadata } from "next";
import Link from "next/link";
import { KINDS } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASO Gallery",
  description: "Inspiration for App Store screenshots, product page headers and search banners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3">
            <Link href="/" className="shrink-0 font-black tracking-tight">ASO<span className="text-accent">gallery</span></Link>
            <nav className="flex shrink-0 gap-4 text-sm text-muted">
              {KINDS.map((k) => <Link key={k.slug} href={`/${k.slug}`} className="hover:text-white">{k.label}</Link>)}
              <Link href="/changes" className="text-accent hover:text-white">Recently changed</Link>
            </nav>
            <Link href="/submit" className="ml-auto shrink-0 rounded-full border border-line px-3 py-1 text-sm hover:border-accent">+ Add app</Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl border-t border-line px-4 py-8 text-sm text-muted">
          <form className="flex max-w-md gap-2">
            <input type="email" placeholder="Weekly digest: one email, unsubscribe in one click" className="flex-1 rounded-lg border border-line bg-panel px-3 py-2" />
            <button type="button" className="rounded-lg bg-accent px-3 py-2 font-semibold text-ink">Subscribe</button>
          </form>
        </footer>
      </body>
    </html>
  );
}
